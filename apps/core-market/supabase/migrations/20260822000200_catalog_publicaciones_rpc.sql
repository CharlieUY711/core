-- ============================================================================
-- F2 — RPC de publicaciones: una fila por producto, canales agregados
-- ============================================================================
-- POR QUÉ NO ALCANZA `v_catalog_listings_priced`
--
--   1. No tiene precio, pese al nombre. Junta listings + variantes + ítems +
--      inventario, pero no toca catalog_prices ni resolve_price. El único
--      precio que expone es `cost_price` (costo, no venta).
--   2. Usa JOIN (inner) contra catalog_listings, así que un producto sin
--      publicar en ningún canal no aparece — justo los borradores que la
--      pantalla tiene que mostrar.
--   3. Devuelve una fila por (variante, canal). La tabla de publicaciones
--      muestra una fila por producto con los canales como chips, así que la
--      UI tendría que reagrupar en el cliente.
--
-- Esta función devuelve una fila por variante con los canales agregados en
-- jsonb, resolviendo el precio de cada canal en la misma consulta vía LATERAL.
-- Una sola ida a la base: sin N+1 (§27).
--
-- El `price_origin` de cada canal sale de la propia semántica de
-- catalog_prices: una fila con channel IS NULL es el precio maestro y aplica a
-- todos los canales; una con channel = 'x' es el override de ese canal. Eso
-- es exactamente lo que el §18 pide mostrar.
-- ============================================================================

begin;

create or replace function public.catalog_publicaciones(
  p_currency text default 'UYU'
)
returns table (
  variant_id       uuid,
  item_id          uuid,
  sku              text,
  title            text,
  description      text,
  item_status      text,
  variant_status   text,
  tags             text[],
  total_available  bigint,
  master_price     numeric,
  master_currency  text,
  channels         jsonb,
  created_at       timestamptz,
  updated_at       timestamptz
)
language sql
stable
security invoker          -- RLS del llamador: el aislamiento por tienda manda
set search_path = public
as $$
  select
    v.id                                        as variant_id,
    i.id                                        as item_id,
    v.sku,
    i.title,
    i.description,
    i.status::text                              as item_status,
    v.status::text                              as variant_status,
    i.tags,
    coalesce(inv.total_available, 0)            as total_available,
    mp.amount                                   as master_price,
    p_currency                                  as master_currency,
    coalesce(ch.channels, '[]'::jsonb)          as channels,
    i.created_at,
    i.updated_at
  from catalog_variants v
  join catalog_items    i on i.id = v.item_id

  -- Stock agregado sobre todas las ubicaciones
  left join lateral (
    select sum(ci.available)::bigint as total_available
      from catalog_inventory ci
     where ci.variant_id = v.id
  ) inv on true

  -- Precio maestro: la fila sin canal (channel IS NULL)
  left join lateral (
    select cp.amount
      from catalog_prices cp
     where cp.variant_id = v.id
       and cp.currency   = p_currency
       and cp.channel    is null
       and (cp.valid_from  is null or cp.valid_from  <= now())
       and (cp.valid_until is null or cp.valid_until >  now())
     order by cp.priority desc
     limit 1
  ) mp on true

  -- Canales: un objeto por listing, con su precio resuelto y su origen
  left join lateral (
    select jsonb_agg(
             jsonb_build_object(
               'channel',        l.channel,
               'status',         l.status,
               'external_id',    l.external_id,
               'last_error',     l.last_error,
               'synced_at',      l.synced_at,
               'channel_attrs',  l.channel_attrs,
               'price',          rp.amount,
               'price_origin',   case
                                   when rp.amount  is null then 'NONE'
                                   when rp.channel is null then 'MASTER'
                                   else 'OVERRIDE'
                                 end
             )
             order by l.channel
           ) as channels
      from catalog_listings l
      left join lateral (
        select * from resolve_price(v.id, p_currency::char, l.channel)
      ) rp on true
     where l.variant_id = v.id
  ) ch on true

  order by i.updated_at desc;
$$;

comment on function public.catalog_publicaciones(text) is
  'Una fila por variante con canales agregados en jsonb y precio resuelto por '
  'canal. security invoker a propósito: el aislamiento por tienda lo hace RLS '
  'vía el claim store_id, no esta función.';

grant execute on function public.catalog_publicaciones(text) to authenticated;

commit;

-- ── Verificación ────────────────────────────────────────────────────────────
-- Devuelve 0 filas hasta que existan productos; lo que importa es que no falle.
-- Ojo: desde el SQL editor `auth.jwt()` está vacío, así que RLS filtra todo.
-- La prueba real es desde la app con sesión iniciada.
select * from public.catalog_publicaciones('UYU');
