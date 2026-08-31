-- ===========================================================================
-- La publicación dice de qué ficha sale
-- ===========================================================================
--
-- LO QUE YA ESTABA DECIDIDO
-- `20260829000000_biblioteca_es_la_fuente` estableció que Biblioteca es lo que
-- la tienda SABE y Publicaciones lo que OFRECE: una publicación es una ficha a
-- la que se le puso precio y canal. El vínculo `catalog_producto_base.ficha_id`
-- existe desde entonces y lo llena un trigger.
--
-- LO QUE FALTABA
-- Ninguna consulta lo devolvía. Con el vínculo invisible desde el navegador, la
-- Biblioteca puede listar una ficha pero no puede abrir su artículo: tiene el id
-- de la ficha y necesita el de la publicación. Por eso el alta y la edición
-- terminaron viviendo en Publicaciones, que es al revés de lo acordado.
--
-- No se agrega ninguna regla: se expone una que ya rige. La columna se agrega al
-- final del RETURNS TABLE, así que ninguna lectura por nombre cambia.
-- ===========================================================================

begin;

-- Cambia el tipo de retorno, y eso no admite `create or replace`.
drop function if exists public.catalog_publicaciones(text);

create function public.catalog_publicaciones(p_currency text default 'UYU')
returns table (
  variant_id uuid, item_id uuid, sku text, title text, description text,
  tipo text, item_status text, variant_status text, tags text[],
  total_available bigint, master_price numeric, master_currency text,
  channels jsonb, ficha jsonb, ficha_fuente text, ficha_at timestamptz,
  garantia text, tipo_envio text, peso text, dimensiones text, material text,
  origen text, created_at timestamptz, updated_at timestamptz,
  ficha_id uuid
)
language sql
stable
set search_path = public
as $$
  select
    v.id                                  as variant_id,
    b.id                                  as item_id,
    v.sku_variante                        as sku,
    b.titulo                              as title,
    b.descripcion                         as description,
    b.tipo                                as tipo,
    b.status::text                        as item_status,
    v.status::text                        as variant_status,
    '{}'::text[]                          as tags,   -- sin columna todavia
    v.stock::bigint                       as total_available,
    v.precio                              as master_price,
    coalesce(nullif(v.moneda,''), p_currency) as master_currency,
    coalesce(ch.channels, '[]'::jsonb)    as channels,
    null::jsonb                           as ficha,          -- pendiente, ver nota arriba
    null::text                            as ficha_fuente,    -- idem
    null::timestamptz                     as ficha_at,        -- idem
    b.garantia                            as garantia,
    b.tipo_envio                          as tipo_envio,
    b.peso                                as peso,
    b.dimensiones                         as dimensiones,
    b.material                            as material,
    b.origen                              as origen,
    b.created_at                          as created_at,
    greatest(b.updated_at, v.updated_at)  as updated_at,
    b.ficha_id                            as ficha_id
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
               -- El precio que rige en ESE canal, no el general: es lo que se
               -- muestra en la fila y lo que se compara contra el mercado.
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
$$;

grant execute on function public.catalog_publicaciones(text)
  to authenticated, anon, service_role;

commit;
