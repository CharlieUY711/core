-- ============================================================================
-- catalog_vidriera acepta filtro por ids
-- ============================================================================
-- PROBLEMA
-- El carrito guarda `producto_id` (hoy un variant_id) y deriva nombre e imagen
-- consultando `articulos`, que quedo vacia al migrar el catalogo. Resultado:
-- se puede agregar al carrito pero no se ve que se agrego.
--
-- Resolver desde catalog_* requiere una puerta publica: las politicas RLS
-- exigen el claim store_id y un comprador anonimo no lo tiene.
--
-- POR QUE EXTENDER Y NO CREAR OTRA FUNCION
-- catalog_vidriera ya es esa puerta, con sus reglas de exposicion decididas y
-- auditadas: solo listings 'active' en canales publicos, nunca borradores,
-- nunca cost_price. Una segunda funcion seria una segunda superficie donde esas
-- reglas pueden divergir. Un filtro opcional mantiene una sola puerta.
--
-- p_ids NULL preserva exactamente el comportamiento actual, asi que la vidriera
-- del storefront no cambia.
--
-- DROP + CREATE porque cambia la firma: agregar un parametro creaeria una
-- sobrecarga ambigua.
-- ============================================================================

begin;

drop function if exists public.catalog_vidriera(text, integer);

create or replace function public.catalog_vidriera(
  p_currency text default 'UYU',
  p_limit    integer default 100,
  p_ids      uuid[] default null
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
    i.title                                     as nombre,
    i.description                               as descripcion,
    l.channel                                   as tipo,
    coalesce(rp.amount, v.price)                as precio,
    nullif((v.attributes ->> 'precio_original')::numeric, 0) as precio_original,
    p_currency                                  as moneda,
    img.principal                               as imagen_principal,
    coalesce(img.todas, '[]'::jsonb)            as imagenes,
    coalesce(vid.todos, '[]'::jsonb)            as videos,
    v.attributes -> 'departamento' ->> 'nombre' as departamento_nombre,
    v.attributes ->> 'condicion'                as condicion,
    coalesce(inv.disponible, 0)                 as stock,
    l.updated_at                                as published_at
  from catalog_listings l
  join catalog_variants v on v.id = l.variant_id
  join catalog_items    i on i.id = v.item_id

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

  where l.channel in ('market', 'secondhand')
    and l.status   = 'active'
    and i.status   = 'active'
    and v.status   = 'active'
    -- Filtro opcional: NULL deja la vidriera completa, igual que antes.
    and (p_ids is null or v.id = any(p_ids))
  order by l.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

comment on function public.catalog_vidriera(text, integer, uuid[]) is
  'Vidriera publica. SECURITY DEFINER: RLS de catalog_* exige el claim store_id '
  'que un anonimo no tiene, y esta es la unica puerta abierta. p_ids permite '
  'resolver productos puntuales (carrito) sin abrir una segunda superficie.';

grant execute on function public.catalog_vidriera(text, integer, uuid[]) to anon, authenticated;

commit;
