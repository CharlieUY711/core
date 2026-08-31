-- ===========================================================================
-- Las fotos y la marca vuelven al formulario
-- ===========================================================================
--
-- La migracion anterior arreglo la ESCRITURA. Esta arregla la LECTURA, que era
-- la otra mitad y la que hacia ver el sintoma.
--
-- LO QUE PASABA CON LAS FOTOS
-- Se guardaban bien: `catalog_producto_base.fotos_base` tenia las ocho fotos
-- del articulo. Pero `catalog_publicaciones` no las devolvia, asi que al volver
-- a abrir el articulo el formulario las mostraba vacias. Parecia que no se
-- habian guardado, y lo que no se habia guardado era nada: no se leian.
--
-- Es el peor de los dos casos posibles. Un dato que no se guarda se nota al
-- toque; un dato que se guarda y no se lee invita a volver a cargarlo encima.
--
-- LO QUE PASABA CON LA MARCA
-- Las dos cosas a la vez: no se guardaba -eso lo arregla la migracion
-- anterior- y tampoco se devolvia.
--
-- Las tres columnas van al final del RETURNS TABLE, asi que ninguna lectura por
-- nombre cambia.
-- ===========================================================================

begin;

drop function if exists public.catalog_publicaciones(text);

create function public.catalog_publicaciones(p_currency text default 'UYU')
returns table (
  variant_id uuid, item_id uuid, sku text, title text, description text,
  tipo text, item_status text, variant_status text, tags text[],
  total_available bigint, master_price numeric, master_currency text,
  channels jsonb, ficha jsonb, ficha_fuente text, ficha_at timestamptz,
  garantia text, tipo_envio text, peso text, dimensiones text, material text,
  origen text, created_at timestamptz, updated_at timestamptz,
  ficha_id uuid,
  marca text, fotos_base text[], video text[]
)
language sql
stable
set search_path = public
as $FN$
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
    b.ficha_id                            as ficha_id,
    b.marca                               as marca,
    coalesce(b.fotos_base, '{}'::text[])  as fotos_base,
    coalesce(b.video, '{}'::text[])       as video
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
$FN$;

grant execute on function public.catalog_publicaciones(text)
  to authenticated, anon, service_role;

commit;
