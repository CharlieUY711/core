-- ===========================================================================
-- catalog_publicaciones devuelve los detalles del producto
-- ===========================================================================
--
-- El formulario ahora edita garantia, tipo de envio, peso, dimensiones,
-- material y origen — columnas que ya existian en `catalog_producto_base` y que
-- ninguna RPC leia ni escribia.
--
-- Escribirlas ya se resolvio con `guardar_detalles_articulo`. Falta el otro
-- lado: sin esto, abrir un articulo para editarlo mostraria los seis campos
-- vacios aunque la base tenga datos, y guardar los dejaria igual — parecen
-- opcionales sin completar cuando en realidad estan completos y no se ven.
-- ===========================================================================

-- Se suelta y se vuelve a crear porque Postgres no deja cambiar el tipo de
-- retorno con CREATE OR REPLACE: agregar columnas cambia el row type. Todo va
-- en la misma transaccion, asi que no hay un instante con la funcion ausente.
DROP FUNCTION IF EXISTS public.catalog_publicaciones(text);

CREATE OR REPLACE FUNCTION public.catalog_publicaciones(p_currency text DEFAULT 'UYU'::text)
 RETURNS TABLE(variant_id uuid, item_id uuid, sku text, title text, description text, tipo text, item_status text, variant_status text, tags text[], total_available bigint, master_price numeric, master_currency text, channels jsonb, ficha jsonb, ficha_fuente text, ficha_at timestamp with time zone, garantia text, tipo_envio text, peso text, dimensiones text, material text, origen text, created_at timestamp with time zone, updated_at timestamp with time zone)
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
    b.garantia                            as garantia,
    b.tipo_envio                          as tipo_envio,
    b.peso                                as peso,
    b.dimensiones                         as dimensiones,
    b.material                            as material,
    b.origen                              as origen,
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
$function$;

GRANT EXECUTE ON FUNCTION public.catalog_publicaciones(text) TO authenticated;
