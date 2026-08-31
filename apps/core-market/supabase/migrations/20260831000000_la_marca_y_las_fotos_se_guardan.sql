-- ===========================================================================
-- La marca y las fotos se guardan; editar deja de perderlas
-- ===========================================================================
--
-- LO QUE PASABA
-- Se cargaba un articulo con marca y fotos, se guardaba, y ni la marca ni las
-- fotos quedaban. Sin error: se guardaba todo lo demas y esos dos campos se
-- caian en silencio, que es la peor forma de perder algo.
--
-- ERAN DOS AGUJEROS DISTINTOS
--
--   1. `crear_publicacion` recibia `p_images` y las guardaba en `fotos_base`,
--      pero NO recibia la marca: `catalog_producto_base.marca` -que existe-
--      quedaba en null siempre. La marca sobrevivia solo en la ficha de la
--      Biblioteca, por `guardar_ficha_biblioteca`.
--
--   2. `actualizar_publicacion` no recibia ninguno de los dos. Editar un
--      articulo ya creado no podia cambiar la marca ni tocar las fotos, ni
--      siquiera agregar una. Y como tampoco tocaba la ficha, editar no
--      actualizaba la Biblioteca -que desde `biblioteca_es_la_fuente` es la
--      fuente-.
--
-- LA CORRECCION
-- Los dos parametros en las dos funciones. En la de actualizar, null significa
-- "no lo mandes" y NO "vaciarlo": es la misma convencion que ya usa para el
-- titulo y el precio, y sin eso cualquier caller viejo borraria las fotos por
-- omision. Para vaciar de verdad se manda un arreglo vacio.
--
-- Se dropean y se recrean porque cambia la firma; `create or replace` no
-- alcanza, y agregar parametros crearia una sobrecarga que PostgREST -que
-- resuelve por nombre- no podria desambiguar.
-- ===========================================================================

begin;

drop function if exists public.crear_publicacion(text, numeric, text, text, text, text, integer, text[], text, jsonb, text[], text[]);

create function public.crear_publicacion(
  p_title text, p_price numeric, p_tipo text default 'market',
  p_currency text default 'UYU', p_sku text default null,
  p_description text default null, p_stock integer default 0,
  p_channels text[] default array[]::text[], p_status text default 'draft',
  p_attributes jsonb default '{}'::jsonb, p_images text[] default null,
  p_videos text[] default null, p_marca text default null
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
    raise exception 'Sin tienda activa. El claim store_id no esta en el JWT: revisar que el hook de access token este habilitado.'
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

  -- Producto base ------------------------------------------------------------
  insert into catalog_producto_base (
    tenant_id, tipo, titulo, descripcion, status, fotos_base, video, marca
  )
  values (
    v_store, p_tipo, btrim(p_title), p_description, p_status::catalog_item_status,
    coalesce(p_images, '{}'::text[]), coalesce(p_videos, '{}'::text[]),
    nullif(btrim(coalesce(p_marca, '')), '')
  )
  returning id into v_base;

  -- Variante -----------------------------------------------------------------
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

  -- Canales (reales -- 'market'/'secondhand' NO son canales, son p_tipo) ------
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

drop function if exists public.actualizar_publicacion(uuid, text, text, text, numeric, text, text, integer, text);

create function public.actualizar_publicacion(
  p_variant_id uuid, p_title text default null, p_description text default null,
  p_status text default null, p_price numeric default null,
  p_currency text default 'UYU', p_sku text default null,
  p_stock integer default null, p_tipo text default null,
  p_marca text default null, p_images text[] default null,
  p_videos text[] default null
) returns void
language plpgsql
set search_path = public
as $FN$
declare
  v_base uuid;
begin
  -- El select ya pasa por RLS: si la variante es de otra tienda, no aparece.
  select v.producto_base_id into v_base
    from catalog_variante v
   where v.id = p_variant_id;

  if v_base is null then
    raise exception 'La publicacion no existe o no pertenece a esta tienda.'
      using errcode = '42501';
  end if;

  -- La foto se toma ANTES de tocar nada: despues ya no existe el estado que
  -- habria que guardar. Solo cuando hay algo que cambiar, para que abrir y
  -- cerrar sin editar no consuma el respaldo que quiza hacia falta.
  if p_title is not null or p_description is not null or p_status is not null
     or p_tipo is not null or p_price is not null or p_sku is not null
     or p_stock is not null or p_marca is not null or p_images is not null
     or p_videos is not null then
    update catalog_producto_base
       set version_anterior    = snapshot_articulo(v_base),
           version_anterior_at = now()
     where id = v_base;
  end if;

  if p_tipo is not null and p_tipo not in ('market','secondhand') then
    raise exception 'tipo debe ser market o secondhand.' using errcode = '22023';
  end if;

  if p_title is not null or p_description is not null or p_status is not null
     or p_tipo is not null or p_marca is not null or p_images is not null
     or p_videos is not null then
    update catalog_producto_base
       set titulo      = coalesce(nullif(btrim(p_title), ''), titulo),
           descripcion = coalesce(p_description, descripcion),
           status      = coalesce(p_status::catalog_item_status, status),
           tipo        = coalesce(p_tipo, tipo),
           -- La marca vacia SI borra: se escribe "" a proposito para sacarla.
           marca       = case when p_marca is null then marca
                              else nullif(btrim(p_marca), '') end,
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

grant execute on function public.crear_publicacion(text, numeric, text, text, text, text, integer, text[], text, jsonb, text[], text[], text) to authenticated, service_role;
grant execute on function public.actualizar_publicacion(uuid, text, text, text, numeric, text, text, integer, text, text, text[], text[]) to authenticated, service_role;

commit;
