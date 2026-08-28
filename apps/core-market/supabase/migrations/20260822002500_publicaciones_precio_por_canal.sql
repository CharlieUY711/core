-- ===========================================================================
-- catalog_publicaciones expone el precio que rige en cada canal
-- ===========================================================================
--
-- El bloque de canales traia 'price' en null con la nota "sin override por
-- canal todavia". Ahora existe: catalog_canal_listing.precio.
--
-- Se devuelve ya resuelto -el del canal si lo tiene, el de la variante si no-
-- junto con `price_origin`, que dice cual de los dos es. Sin ese dato la
-- pantalla no puede distinguir "vale 38.795 porque lo decidi para este canal"
-- de "vale 38.795 porque es el precio general", y son cosas distintas a la
-- hora de tocarlo.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.catalog_publicaciones(p_currency text DEFAULT 'UYU'::text)
 RETURNS TABLE(variant_id uuid, item_id uuid, sku text, title text, description text, tipo text, item_status text, variant_status text, tags text[], total_available bigint, master_price numeric, master_currency text, channels jsonb, ficha jsonb, ficha_fuente text, ficha_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
    b.created_at                          as created_at,
    greatest(b.updated_at, v.updated_at)  as updated_at
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
$function$

