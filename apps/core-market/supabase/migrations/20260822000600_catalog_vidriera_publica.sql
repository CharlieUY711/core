-- ============================================================================
-- F2 — Vidriera pública sobre catalog_*
-- ============================================================================
-- PROBLEMA
-- El storefront lo mira gente sin sesión. Las políticas RLS de catalog_* son
-- todas `tenant_isolation` sobre `auth.jwt() ->> 'store_id'`, que un visitante
-- anónimo no tiene: para el público, el catálogo entero es invisible.
--
-- POR QUÉ UNA FUNCIÓN Y NO POLÍTICAS DE LECTURA PÚBLICA
-- Abrir SELECT público en catalog_items, variants, prices, media, inventory y
-- listings son seis superficies donde un error deja ver borradores, costos o
-- datos de otras tiendas. Una sola función SECURITY DEFINER es una sola puerta
-- auditable: RLS queda cerrado y acá se elige exactamente qué sale.
--
-- QUÉ SE PUBLICA
-- Solo lo que está realmente a la venta: ítem activo, variante activa y un
-- listing 'active' en un canal público. Nada de borradores ni archivados.
--
-- NO filtra por tienda a propósito: un marketplace muestra los productos de
-- todas las tiendas. El aislamiento por tienda es del panel, no de la vidriera.
--
-- Nunca expone cost_price.
-- ============================================================================

begin;

create or replace function public.catalog_vidriera(
  p_currency text default 'UYU',
  p_limit    integer default 100
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
    i.title                                   as nombre,
    i.description                             as descripcion,
    l.channel                                 as tipo,
    coalesce(rp.amount, v.price)              as precio,
    nullif((v.attributes ->> 'precio_original')::numeric, 0) as precio_original,
    p_currency                                as moneda,
    img.principal                             as imagen_principal,
    coalesce(img.todas,  '[]'::jsonb)         as imagenes,
    coalesce(vid.todos,  '[]'::jsonb)         as videos,
    v.attributes -> 'departamento' ->> 'nombre' as departamento_nombre,
    v.attributes ->> 'condicion'              as condicion,
    coalesce(inv.disponible, 0)               as stock,
    l.updated_at                              as published_at
  from catalog_listings l
  join catalog_variants v on v.id = l.variant_id
  join catalog_items    i on i.id = v.item_id

  -- Solo lo que esta realmente publicado y a la venta.
  left join lateral (
    select * from resolve_price(v.id, p_currency::char, l.channel)
  ) rp on true

  left join lateral (
    select
      (array_agg(m.url order by m.sort_order))[1] as principal,
      jsonb_agg(jsonb_build_object('url', m.url, 'orden', m.sort_order)
                order by m.sort_order)            as todas
    from catalog_media m
    where m.item_id = i.id and m.type = 'image'
  ) img on true

  left join lateral (
    select jsonb_agg(jsonb_build_object('url', m.url, 'orden', m.sort_order)
                     order by m.sort_order) as todos
    from catalog_media m
    where m.item_id = i.id and m.type = 'video'
  ) vid on true

  left join lateral (
    select sum(ci.available)::bigint as disponible
    from catalog_inventory ci
    where ci.variant_id = v.id
  ) inv on true

  where l.channel   in ('market', 'secondhand')
    and l.status     = 'active'
    and i.status     = 'active'
    and v.status     = 'active'
  order by l.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

comment on function public.catalog_vidriera(text, integer) is
  'Vidriera publica. SECURITY DEFINER a proposito: RLS de catalog_* exige el '
  'claim store_id que un anonimo no tiene, y esta es la unica puerta abierta. '
  'Devuelve solo listings active en canales publicos; nunca expone cost_price.';

-- La vidriera es publica: anon y usuarios logueados leen lo mismo.
grant execute on function public.catalog_vidriera(text, integer) to anon, authenticated;

commit;
