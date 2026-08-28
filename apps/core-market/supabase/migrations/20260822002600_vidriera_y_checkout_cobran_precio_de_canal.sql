-- ===========================================================================
-- La vidriera muestra y el checkout cobra el precio del canal
-- ===========================================================================
--
-- Tener un precio por canal que nadie usa al vender no es una funcionalidad a
-- medias: es peor que no tenerlo. Alguien lo configura, ve el numero guardado,
-- y la tienda cobra otro. Asi que las dos puntas donde el precio se convierte
-- en plata tienen que respetarlo.
--
--   vidriera : muestra el del canal por el que se esta mirando.
--   checkout : cobra el del canal por el que se compra.
--
-- La regla es la misma en los dos lados y es la del listing: si el canal tiene
-- precio propio, gana; si no, vale el de la variante.
-- ===========================================================================

begin;

-- --- Vidriera -------------------------------------------------------------
create or replace function public.catalog_vidriera(
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
    l.channel                                   as tipo,
    -- El precio del canal gana. Es el mismo criterio que aplica el checkout:
    -- si difirieran, la tienda mostraria un numero y cobraria otro.
    coalesce(l.precio, v.precio)                as precio,
    -- Cuando el canal tiene precio propio y es menor que el general, el general
    -- ES el precio de lista: mostrarlo tachado no es un adorno, es la
    -- referencia contra la que se entiende la oferta.
    case when l.precio is not null and l.precio < v.precio then v.precio end as precio_original,
    coalesce(l.moneda, v.moneda, p_currency)    as moneda,
    coalesce(
      (array_remove(v.fotos_especificas, null))[1],
      (array_remove(b.fotos_base, null))[1]
    )                                           as imagen_principal,
    coalesce(
      to_jsonb(array_remove(
        coalesce(v.fotos_especificas, '{}') || coalesce(b.fotos_base, '{}'), null)),
      '[]'::jsonb
    )                                           as imagenes,
    coalesce(to_jsonb(array_remove(b.video, null)), '[]'::jsonb) as videos,
    d.nombre                                    as departamento_nombre,
    b.tipo                                      as condicion,
    coalesce(v.stock, 0)::bigint                as stock,
    l.updated_at                                as published_at
  from catalog_canal_listing l
  join catalog_variante      v on v.id = l.variante_id
  join catalog_producto_base b on b.id = v.producto_base_id
  left join departamentos    d on d.id = b.departamento_id

  where l.channel in ('market', 'secondhand')
    and l.status   = 'active'
    and b.status   = 'active'
    and v.status   = 'active'
    and (p_ids is null or v.id = any(p_ids))
  order by l.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

grant execute on function public.catalog_vidriera(text, integer, uuid[])
  to anon, authenticated;

-- --- Checkout -------------------------------------------------------------
-- Se reemplaza solo la lectura del precio. El resto de crear_orden_segura
-- queda como esta: no se toca lo que no hace falta tocar.
create or replace function public.precio_de_canal(
  p_variante_id uuid,
  p_channel     text
) returns table (precio numeric, moneda text)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(l.precio, v.precio),
    coalesce(l.moneda, v.moneda, 'UYU')
  from catalog_variante v
  left join catalog_canal_listing l
         on l.variante_id = v.id and l.channel = p_channel
  where v.id = p_variante_id
  limit 1;
$$;

comment on function public.precio_de_canal(uuid, text) is
  'Precio y moneda que rigen para esa variante en ese canal: el del listing si lo tiene, el de la variante si no. Una sola definicion, para que la vidriera y el checkout no puedan discrepar.';

grant execute on function public.precio_de_canal(uuid, text) to authenticated, service_role;

commit;
