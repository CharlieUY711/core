-- ===========================================================================
-- catalog_publicaciones devuelve la ficha ampliada
-- ===========================================================================
--
-- La ficha se guarda en el item, pero la pantalla lee por este RPC. Sin
-- exponerla aca haria falta una consulta aparte por cada articulo, o volver a
-- pedirsela al canal cada vez que se abre uno.
--
-- Las columnas nuevas van al final del SELECT y del RETURNS TABLE: en un
-- returns table el orden es parte del contrato, y meterlas en el medio romperia
-- a quien lea por posicion.
--
-- Hay que borrar la funcion antes: cambiar el RETURNS TABLE no se puede con
-- CREATE OR REPLACE.
-- ===========================================================================

drop function if exists public.catalog_publicaciones(text);

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
  ficha            jsonb,
  ficha_fuente     text,
  ficha_at         timestamptz,
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
    i.ficha,
    i.ficha_fuente,
    i.ficha_at,
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
        select * from resolve_price(v.id, p_currency, l.channel)
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
