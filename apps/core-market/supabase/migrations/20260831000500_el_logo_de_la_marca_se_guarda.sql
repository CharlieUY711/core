-- ===========================================================================
-- El logo de la marca se guarda
-- ===========================================================================
--
-- LO QUE PASABA
-- El formulario busca el logo de la marca, deja elegirlo entre varios y hasta
-- subir uno propio — y despues no lo mandaba a ningun lado. `logoUrl`,
-- `logoPersonalizado` y `marcaDominio` vivian solo en el estado del componente:
-- al guardar se perdian, y al reabrir el articulo el logo no estaba.
--
-- Verificado sobre el bundle compilado: cero apariciones de esos nombres en lo
-- que se envia. No es que se guardara mal, es que no se enviaba.
--
-- DONDE VA, Y POR QUE NO EN UNA TABLA DE MARCAS
-- El logo es de la MARCA, no de cada articulo, asi que lo correcto seria una
-- entidad marca. Existe una tabla `brands` — vacia, sin ningun lector, y de otro
-- modelo (`entity_id`, `deleted_at`): usarla seria adoptar un diseño que nadie
-- eligio para esto.
--
-- Va al lado de `marca`, que ya es texto repetido en cada articulo. Se asume la
-- duplicacion A PROPOSITO: es la que ya hay, y el dia que exista la entidad
-- marca estas dos columnas salen juntas con ella. La alternativa era inventar
-- ahora un subsistema de marcas en el medio de otro cambio de arquitectura, y
-- dos cambios grandes cruzados no se revisan bien.
--
-- EL DOMINIO TAMBIEN
-- Porque de ahi sale el logo cuando no hay uno guardado, y porque identifica a
-- la marca mejor que su nombre: hay tres "Santa Laura" y un solo
-- santalaura.com.uy.
-- ===========================================================================

begin;

alter table public.catalog_producto_base
  add column if not exists marca_logo    text,
  add column if not exists marca_dominio text;

comment on column public.catalog_producto_base.marca_logo is
  'El logo de la marca: el encontrado o el subido a mano. Duplicado por artículo a propósito, igual que `marca`, hasta que exista la entidad marca.';
comment on column public.catalog_producto_base.marca_dominio is
  'El sitio de la marca. De ahí sale el logo cuando no hay uno guardado, e identifica la marca mejor que el nombre.';

-- ---------------------------------------------------------------------------
-- Se guardan al crear y al actualizar
-- ---------------------------------------------------------------------------
drop function if exists public.crear_publicacion(text, numeric, text, text, text, text, integer, text[], text, jsonb, text[], text[], text);

create function public.crear_publicacion(
  p_title text, p_price numeric, p_tipo text default 'market',
  p_currency text default 'UYU', p_sku text default null,
  p_description text default null, p_stock integer default 0,
  p_channels text[] default array[]::text[], p_status text default 'draft',
  p_attributes jsonb default '{}'::jsonb, p_images text[] default null,
  p_videos text[] default null, p_marca text default null,
  p_marca_logo text default null, p_marca_dominio text default null
) returns uuid
language plpgsql
set search_path = public
as $FN$
declare
  v_store    uuid;
  v_base     uuid;
  v_variant  uuid;
  v_channel  text;
begin
  v_store := (auth.jwt() ->> 'store_id')::uuid;

  if v_store is null then
    raise exception 'Sin vendedor activo. El claim store_id no esta en el JWT: revisar que el hook de access token este habilitado.'
      using errcode = '42501';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'El titulo es obligatorio.' using errcode = '22023';
  end if;

  if p_price is null or p_price < 0 then
    raise exception 'El precio debe ser mayor o igual a cero.' using errcode = '22023';
  end if;

  if p_tipo not in ('market','secondhand') then
    raise exception 'tipo debe ser market o secondhand.' using errcode = '22023';
  end if;

  insert into catalog_producto_base (
    tenant_id, tipo, titulo, descripcion, status, fotos_base, video,
    marca, marca_logo, marca_dominio
  )
  values (
    v_store, p_tipo, btrim(p_title), p_description, p_status::catalog_item_status,
    coalesce(p_images, '{}'::text[]), coalesce(p_videos, '{}'::text[]),
    nullif(btrim(coalesce(p_marca, '')), ''),
    nullif(btrim(coalesce(p_marca_logo, '')), ''),
    nullif(btrim(coalesce(p_marca_dominio, '')), '')
  )
  returning id into v_base;

  insert into catalog_variante (
    producto_base_id, sku_variante, precio, moneda, stock, status,
    color, talla, capacidad
  )
  values (
    v_base,
    coalesce(nullif(btrim(p_sku), ''), 'SKU-' || left(replace(v_base::text, '-', ''), 8)),
    p_price,
    p_currency,
    greatest(coalesce(p_stock, 0), 0),
    'active',
    p_attributes ->> 'color',
    p_attributes ->> 'talla',
    p_attributes ->> 'capacidad'
  )
  returning id into v_variant;

  foreach v_channel in array coalesce(p_channels, array[]::text[])
  loop
    if v_channel in ('market','secondhand') then
      continue; -- por si algun caller viejo todavia los manda en p_channels
    end if;
    insert into catalog_canal_listing (variante_id, channel, status, channel_attrs)
    values (v_variant, v_channel, 'pending', '{}'::jsonb)
    on conflict (variante_id, channel) do nothing;
  end loop;

  return v_variant;
end;
$FN$;

-- ---------------------------------------------------------------------------

drop function if exists public.actualizar_publicacion(uuid, text, text, text, numeric, text, text, integer, text, text, text[], text[]);

create function public.actualizar_publicacion(
  p_variant_id uuid, p_title text default null, p_description text default null,
  p_status text default null, p_price numeric default null,
  p_currency text default 'UYU', p_sku text default null,
  p_stock integer default null, p_tipo text default null,
  p_marca text default null, p_images text[] default null,
  p_videos text[] default null,
  p_marca_logo text default null, p_marca_dominio text default null
) returns void
language plpgsql
set search_path = public
as $FN$
declare
  v_base uuid;
  v_algo boolean;
begin
  -- El select ya pasa por RLS: si la variante es de otro vendedor, no aparece.
  select v.producto_base_id into v_base
    from catalog_variante v
   where v.id = p_variant_id;

  if v_base is null then
    raise exception 'La publicacion no existe o no pertenece a este vendedor.'
      using errcode = '42501';
  end if;

  if p_tipo is not null and p_tipo not in ('market','secondhand') then
    raise exception 'tipo debe ser market o secondhand.' using errcode = '22023';
  end if;

  -- Una sola condicion, calculada una vez. Antes estaba escrita dos veces con
  -- listas distintas de campos, asi que agregar uno obligaba a acordarse de las
  -- dos —y la que se olvidaba era la del respaldo, que es la que importa—.
  v_algo := p_title is not null or p_description is not null
         or p_status is not null or p_tipo is not null
         or p_marca is not null or p_images is not null or p_videos is not null
         or p_marca_logo is not null or p_marca_dominio is not null;

  -- La foto se toma ANTES de tocar nada: despues ya no existe el estado que
  -- habria que guardar. Solo cuando hay algo que cambiar, para que abrir y
  -- cerrar sin editar no consuma el respaldo que quiza hacia falta.
  if v_algo or p_price is not null or p_sku is not null or p_stock is not null then
    update catalog_producto_base
       set version_anterior    = snapshot_articulo(v_base),
           version_anterior_at = now()
     where id = v_base;
  end if;

  if v_algo then
    update catalog_producto_base
       set titulo      = coalesce(nullif(btrim(p_title), ''), titulo),
           descripcion = coalesce(p_description, descripcion),
           status      = coalesce(p_status::catalog_item_status, status),
           tipo        = coalesce(p_tipo, tipo),
           -- El vacio SI borra: se escribe "" a proposito para sacarlo.
           marca       = case when p_marca is null then marca
                              else nullif(btrim(p_marca), '') end,
           marca_logo  = case when p_marca_logo is null then marca_logo
                              else nullif(btrim(p_marca_logo), '') end,
           marca_dominio = case when p_marca_dominio is null then marca_dominio
                                else nullif(btrim(p_marca_dominio), '') end,
           -- null = no lo mandes. Un arreglo vacio SI vacia, a proposito.
           fotos_base  = coalesce(p_images, fotos_base),
           video       = coalesce(p_videos, video),
           updated_at  = now()
     where id = v_base;
  end if;

  if p_price is not null or p_sku is not null or p_stock is not null then
    update catalog_variante
       set precio     = coalesce(p_price, precio),
           sku_variante = coalesce(nullif(btrim(p_sku), ''), sku_variante),
           stock      = coalesce(p_stock, stock),
           moneda     = coalesce(nullif(p_currency,''), moneda),
           updated_at = now()
     where id = p_variant_id;
  end if;
end;
$FN$;

grant execute on function public.crear_publicacion(text, numeric, text, text, text, text, integer, text[], text, jsonb, text[], text[], text, text, text) to authenticated, service_role;
grant execute on function public.actualizar_publicacion(uuid, text, text, text, numeric, text, text, integer, text, text, text[], text[], text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Y vuelven al formulario
-- ---------------------------------------------------------------------------
-- Guardar sin leer se ve exactamente igual que no guardar. Ya paso con las
-- fotos: estaban en la base y el formulario las mostraba vacias.
drop function if exists public.catalog_publicaciones(text);

create function public.catalog_publicaciones(p_currency text default 'UYU')
returns table (
  variant_id uuid, item_id uuid, sku text, title text, description text,
  tipo text, item_status text, variant_status text, tags text[],
  total_available bigint, master_price numeric, master_currency text,
  channels jsonb, ficha jsonb, ficha_fuente text, ficha_at timestamptz,
  garantia text, tipo_envio text, peso text, dimensiones text, material text,
  origen text, created_at timestamptz, updated_at timestamptz,
  ficha_id uuid, marca text, fotos_base text[], video text[],
  marca_logo text, marca_dominio text
)
language sql
stable
set search_path = public
as $FN$
  select
    v.id, b.id, v.sku_variante, b.titulo, b.descripcion, b.tipo,
    b.status::text, v.status::text,
    '{}'::text[],                                   -- tags: sin columna todavia
    v.stock::bigint, v.precio,
    coalesce(nullif(v.moneda,''), p_currency),
    coalesce(ch.channels, '[]'::jsonb),
    null::jsonb, null::text, null::timestamptz,     -- ficha ampliada: pendiente
    b.garantia, b.tipo_envio, b.peso, b.dimensiones, b.material, b.origen,
    b.created_at, greatest(b.updated_at, v.updated_at),
    b.ficha_id, b.marca,
    coalesce(b.fotos_base, '{}'::text[]),
    coalesce(b.video, '{}'::text[]),
    b.marca_logo, b.marca_dominio
  from catalog_variante v
  join catalog_producto_base b on b.id = v.producto_base_id
  left join lateral (
    select jsonb_agg(
             jsonb_build_object(
               'channel',        l.channel,
               'status',         l.status,
               'external_id',    l.external_id,
               'last_error',     l.last_error,
               'synced_at',      l.synced_at,
               'channel_attrs',  l.channel_attrs,
               -- El precio que rige en ESE canal, no el general.
               'price',          coalesce(l.precio, v.precio),
               'currency',       coalesce(l.moneda, v.moneda, 'UYU'),
               'price_origin',   case when l.precio is not null
                                      then 'CANAL' else 'VARIANTE' end
             )
             order by l.channel
           ) as channels
      from catalog_canal_listing l
     where l.variante_id = v.id
  ) ch on true
  order by greatest(b.updated_at, v.updated_at) desc;
$FN$;

grant execute on function public.catalog_publicaciones(text)
  to authenticated, anon, service_role;

commit;
