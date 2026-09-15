-- ===========================================================================
-- La vidriera no depende de un listing que ya no se crea
-- ===========================================================================
--
-- EL BUG (encontrado en auditoría 2026-09, no estaba en ningún DEC anterior)
--
-- `crear_publicacion` (20260831000500_el_logo_de_la_marca_se_guarda.sql)
-- saltea a propósito la creación de una fila en `catalog_canal_listing`
-- cuando el canal es 'market' o 'secondhand':
--
--   if v_channel in ('market','secondhand') then
--     continue; -- por si algún caller viejo todavía los manda en p_channels
--   end if;
--
-- Es la dirección correcta de DEC-012: `tipo` en `catalog_producto_base` ya
-- identifica si un artículo es market o secondhand, así que no hace falta
-- una fila de canal para eso. El problema es que `catalog_vidriera`
-- (20260822002600_vidriera_y_checkout_cobran_precio_de_canal.sql) nunca se
-- actualizó para dejar de exigirla:
--
--   from catalog_canal_listing l
--   join catalog_variante      v on v.id = l.variante_id
--   ...
--   where l.channel in ('market', 'secondhand')
--     and l.status   = 'active'
--
-- Es un INNER JOIN. Sin la fila que `crear_publicacion` ya no crea, ningún
-- producto nuevo entra en el resultado — sin importar que `producto_base` y
-- `variante` estén `active`. Todo lo publicado desde que existe la versión
-- actual de `crear_publicacion` es invisible en la home.
--
-- LA REGLA QUE QUEDA (y que las dos funciones ahora comparten)
--
--   Visible en la vidriera (market/secondhand) ⇔
--     producto_base.status = 'active' AND variante.status = 'active'.
--
--   `catalog_canal_listing` queda para lo que sí necesita sincronización con
--   un tercero: canales externos reales (Mercado Libre, etc. — estado,
--   external_id, last_error, precio propio). Nunca más para market/secondhand.
--
-- Si en el futuro un canal 'market'/'secondhand' necesitara un precio propio
-- distinto al de la variante, se resuelve con un LEFT JOIN (no bloquea nada
-- si no existe) — ver `precio_de_canal`, que ya usa ese patrón.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. catalog_vidriera: LEFT JOIN, no INNER JOIN, y el tipo sale de
--    producto_base, no del canal.
-- ---------------------------------------------------------------------------
drop function if exists public.catalog_vidriera(text, integer, uuid[]);

create function public.catalog_vidriera(
  p_currency text    default 'UYU',
  p_limit    integer default 100,
  p_ids      uuid[]  default null
)
returns table (
  id                  uuid,
  nombre              text,
  descripcion         text,
  tipo                text,
  precio              numeric,
  precio_original     numeric,
  moneda              text,
  imagen_principal    text,
  imagenes            jsonb,
  videos              jsonb,
  departamento_nombre text,
  condicion           text,
  stock               bigint,
  published_at        timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id,
    coalesce(nullif(btrim(v.nombre_variante), ''), b.titulo) as nombre,
    b.descripcion,
    b.tipo                                       as tipo,
    -- El precio de la variante manda. Si existiera un override para el canal
    -- 'market'/'secondhand' (mismo patrón que un canal externo), se respeta,
    -- pero su AUSENCIA ya no oculta el producto: por eso es left join.
    coalesce(lo.precio, v.precio)                as precio,
    case when lo.precio is not null and lo.precio < v.precio then v.precio end as precio_original,
    coalesce(lo.moneda, v.moneda, p_currency)    as moneda,
    coalesce(
      (array_remove(v.fotos_especificas, null))[1],
      (array_remove(b.fotos_base, null))[1]
    )                                             as imagen_principal,
    coalesce(
      to_jsonb(array_remove(
        coalesce(v.fotos_especificas, '{}') || coalesce(b.fotos_base, '{}'), null)),
      '[]'::jsonb
    )                                             as imagenes,
    coalesce(to_jsonb(array_remove(b.video, null)), '[]'::jsonb) as videos,
    d.nombre                                     as departamento_nombre,
    b.tipo                                       as condicion,
    coalesce(v.stock, 0)::bigint                 as stock,
    greatest(b.updated_at, v.updated_at)         as published_at
  from catalog_variante      v
  join catalog_producto_base b  on b.id = v.producto_base_id
  left join departamentos    d  on d.id = b.departamento_id
  left join catalog_canal_listing lo
         on lo.variante_id = v.id
        and lo.channel     = b.tipo
  where b.status = 'active'
    and v.status = 'active'
    and (p_ids is null or v.id = any(p_ids))
  order by greatest(b.updated_at, v.updated_at) desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

comment on function public.catalog_vidriera(text, integer, uuid[]) is
  'Vidriera pública (anon). Visibilidad = producto_base.status = ''active'' AND variante.status = ''active''. NO exige fila en catalog_canal_listing: esa tabla es sólo para canales externos reales (ML, etc.), no para market/secondhand desde DEC-012/DEC-013.';

grant execute on function public.catalog_vidriera(text, integer, uuid[])
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. crear_publicacion: mismo comportamiento, comentario que ya no deja
--    lugar a que un agente futuro "complete" el insert que falta.
--
-- Se recrea idéntica a 20260831000500 — ni un solo cambio de lógica — sólo
-- se reemplaza el comentario ambiguo por la regla explícita.
-- ---------------------------------------------------------------------------
drop function if exists public.crear_publicacion(
  text, numeric, text, text, text, text, integer, text[], text, jsonb, text[], text[], text, text, text
);

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
    -- market/secondhand NUNCA tienen fila acá. No es compatibilidad con un
    -- caller viejo: es la regla (DEC-012 + DEC-013). Su visibilidad y su
    -- estado salen de producto_base.status / variante.status, que
    -- catalog_vidriera ya lee directo. Si algún día hiciera falta un precio
    -- de canal propio para market/secondhand, se agrega la fila con su
    -- status ahí resuelto — no acá, y no como default 'pending' silencioso.
    if v_channel in ('market','secondhand') then
      continue;
    end if;
    insert into catalog_canal_listing (variante_id, channel, status, channel_attrs)
    values (v_variant, v_channel, 'pending', '{}'::jsonb)
    on conflict (variante_id, channel) do nothing;
  end loop;

  return v_variant;
end;
$FN$;

comment on function public.crear_publicacion(
  text, numeric, text, text, text, text, integer, text[], text, jsonb, text[], text[], text, text, text
) is
  'Crea producto_base + variante. market/secondhand no generan fila en catalog_canal_listing a propósito (ver DEC-013): su visibilidad la resuelve catalog_vidriera directo contra producto_base.status/variante.status.';

grant execute on function public.crear_publicacion(
  text, numeric, text, text, text, text, integer, text[], text, jsonb, text[], text[], text, text, text
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Limpieza defensiva: si quedó alguna fila huérfana de antes de DEC-012
--    (canal 'market'/'secondhand' en catalog_canal_listing), no aporta nada
--    bajo la regla nueva y sólo puede confundir a una lectura futura.
-- ---------------------------------------------------------------------------
do $$
declare
  v_borradas integer;
begin
  delete from catalog_canal_listing
   where channel in ('market', 'secondhand');
  get diagnostics v_borradas = row_count;
  if v_borradas > 0 then
    raise notice 'catalog_canal_listing: % fila(s) market/secondhand huérfanas eliminadas (dead weight bajo la regla nueva)', v_borradas;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Guardrail: que esto no se pueda reintroducir por accidente.
--
-- OJO — el DDL de catalog_canal_listing no está versionado en este repo (el
-- historial de migraciones tiene huecos conocidos, ver .agent/CURRENT.md);
-- se asume `channel` como columna `text` porque así se la trata en todas las
-- funciones que la tocan (crear_publicacion, catalog_vidriera, precio_de_canal
-- — ninguna castea `v_channel`/`p_channel` a un enum). Si en la base real
-- `channel` fuera un enum sin 'market'/'secondhand' como labels, este bloque
-- es un no-op inofensivo (el valor ya sería irrepresentable) y conviene
-- borrarlo; si tiene esos labels y es texto libre, este CHECK es el que
-- corresponde.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.catalog_canal_listing'::regclass
       and conname  = 'chk_canal_listing_no_market_secondhand'
  ) then
    alter table public.catalog_canal_listing
      add constraint chk_canal_listing_no_market_secondhand
      check (channel not in ('market', 'secondhand'));
  end if;
exception
  when undefined_column then
    raise notice 'catalog_canal_listing.channel no es comparable a texto tal como se asumió acá — CHECK no aplicado, requiere revisión manual contra el schema real.';
  when others then
    raise notice 'No se pudo agregar chk_canal_listing_no_market_secondhand (%): revisar a mano.', sqlerrm;
end $$;

comment on constraint chk_canal_listing_no_market_secondhand on public.catalog_canal_listing is
  'DEC-013: market/secondhand no son canales externos, son catalog_producto_base.tipo. Una fila acá para esos dos valores es exactamente el bug que hizo desaparecer los productos de la vidriera — no se puede volver a crear.';

commit;
