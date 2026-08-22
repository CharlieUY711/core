-- ===========================================================================
-- Reaplicar las funciones sin el cast a char(1)
-- ===========================================================================
--
-- La correccion de la moneda (20260822001500) agrega resolve_price(text), pero
-- eso solo no alcanza: las funciones que la llaman le pasaban
-- `p_currency::char`, que trunca ANTES de la llamada, y las que escriben
-- guardaban la moneda ya truncada.
--
-- Esas definiciones viven en migraciones anteriores que ya estan aplicadas.
-- Editarlas no cambia nada en la base -`db push` solo corre las nuevas-, asi
-- que se vuelven a declarar aca, corregidas.
--
-- Es el mismo contenido de esos archivos con `::char` quitado. Todas son
-- CREATE OR REPLACE: reaplicarlas es seguro y ninguna toca tablas.
--
-- Recien al final se borra la firma vieja de resolve_price: catalog_publicaciones
-- y catalog_vidriera son `language sql`, Postgres registra la dependencia, y
-- borrarla antes de rehacerlas habria fallado.
-- ===========================================================================



-- ***** catalog_publicaciones (desde 20260822000200_catalog_publicaciones_rpc.sql) *****

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

commit;

-- ── Verificación ────────────────────────────────────────────────────────────
-- Devuelve 0 filas hasta que existan productos; lo que importa es que no falle.
-- Ojo: desde el SQL editor `auth.jwt()` está vacío, así que RLS filtra todo.
-- La prueba real es desde la app con sesión iniciada.
select * from public.catalog_publicaciones('UYU');


-- ***** actualizar_publicacion / toggle_canal_publicacion (desde 20260822000400_actualizar_publicacion_rpc.sql) *****

-- ============================================================================
-- F2 — RPC de edición de publicación
-- ============================================================================
-- Contraparte de crear_publicacion. Editar una publicación toca hasta cuatro
-- tablas (item, variante, precio maestro, stock), así que también va atómico.
--
-- Todos los parámetros excepto p_variant_id son opcionales: NULL significa
-- "no tocar este campo". Eso permite que la UI mande sólo lo que cambió sin
-- pisar el resto.
--
-- El aislamiento por tienda lo hace RLS: si la variante no pertenece a la
-- tienda del claim, los UPDATE no encuentran fila y la función avisa.
-- ============================================================================

begin;

create or replace function public.actualizar_publicacion(
  p_variant_id  uuid,
  p_title       text    default null,
  p_description text    default null,
  p_status      text    default null,
  p_price       numeric default null,
  p_currency    text    default 'UYU',
  p_sku         text    default null,
  p_stock       integer default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item     uuid;
  v_location uuid;
  v_store    uuid;
begin
  v_store := (auth.jwt() ->> 'store_id')::uuid;

  -- El select ya pasa por RLS: si la variante es de otra tienda, no aparece.
  select v.item_id into v_item
    from catalog_variants v
    join catalog_items i on i.id = v.item_id
   where v.id = p_variant_id;

  if v_item is null then
    raise exception 'La publicación no existe o no pertenece a esta tienda.'
      using errcode = '42501';
  end if;

  -- Ítem --------------------------------------------------------------------
  if p_title is not null or p_description is not null or p_status is not null then
    update catalog_items
       set title       = coalesce(nullif(btrim(p_title), ''), title),
           description = coalesce(p_description, description),
           status      = coalesce(p_status::catalog_item_status, status),
           updated_at  = now()
     where id = v_item;
  end if;

  -- Variante ----------------------------------------------------------------
  if p_price is not null or p_sku is not null then
    update catalog_variants
       set price = coalesce(p_price, price),
           sku   = coalesce(nullif(btrim(p_sku), ''), sku)
     where id = p_variant_id;
  end if;

  -- Precio maestro: la fila con channel IS NULL. Los overrides por canal no
  -- se tocan — cambiar el maestro no debe pisar el precio de Mercado Libre.
  if p_price is not null then
    update catalog_prices
       set amount = p_price, updated_at = now()
     where variant_id = p_variant_id
       and channel is null
       and currency = p_currency;

    if not found then
      insert into catalog_prices (variant_id, channel, currency, amount, priority)
      values (p_variant_id, null, p_currency, p_price, 0);
    end if;
  end if;

  -- Stock -------------------------------------------------------------------
  if p_stock is not null then
    select id into v_location
      from catalog_locations
     where tenant_id = v_store and is_active
     order by created_at
     limit 1;

    if v_location is null then
      insert into catalog_locations (tenant_id, name, type, is_active)
      values (v_store, 'Depósito principal', 'warehouse', true)
      returning id into v_location;
    end if;

    insert into catalog_inventory (variant_id, location_id, quantity, reserved)
    values (p_variant_id, v_location, p_stock, 0)
    on conflict (variant_id, location_id)
    do update set quantity = p_stock, updated_at = now();
  end if;
end;
$$;

comment on function public.actualizar_publicacion is
  'Edición atómica de una publicación. Cambiar el precio maestro NO pisa los '
  'overrides por canal: esa es la regla del sistema de overrides.';

grant execute on function public.actualizar_publicacion(
  uuid, text, text, text, numeric, text, text, integer
) to authenticated;

-- ── Alta/baja de un canal ───────────────────────────────────────────────────
-- Dar de baja NO borra el listing: lo pasa a 'delisted' para conservar el
-- external_id y el historial de sincronización. Volver a publicarlo lo
-- reactiva en 'pending'.
create or replace function public.toggle_canal_publicacion(
  p_variant_id uuid,
  p_channel    text,
  p_activo     boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_activo then
    insert into catalog_listings (variant_id, channel, status, channel_attrs)
    values (
      p_variant_id,
      p_channel,
      case when p_channel = 'market' then 'active' else 'pending' end::catalog_listing_status,
      '{}'::jsonb
    )
    on conflict (variant_id, channel)
    do update set status = case
                             when catalog_listings.external_id is not null then 'pending'
                             when excluded.channel = 'market'              then 'active'
                             else 'pending'
                           end::catalog_listing_status,
                  updated_at = now();
  else
    update catalog_listings
       set status = 'delisted', updated_at = now()
     where variant_id = p_variant_id and channel = p_channel;
  end if;
end;
$$;

comment on function public.toggle_canal_publicacion is
  'Alta/baja de un canal. La baja conserva la fila (delisted) para no perder '
  'external_id ni el historial de catalog_sync_log.';

grant execute on function public.toggle_canal_publicacion(uuid, text, boolean) to authenticated;

commit;


-- ***** crear_publicacion (con media) (desde 20260822000500_crear_publicacion_con_media.sql) *****

-- ============================================================================
-- F2 — crear_publicacion acepta imágenes y videos
-- ============================================================================
-- El wizard de alta (Catálogo > Artículos) maneja imágenes, videos y condición,
-- y hasta ahora insertaba directo en `articulos`. Migrarlo a catalog_* exige
-- que el RPC sepa guardar media, si no el alta perdería las fotos.
--
-- No se inventa estructura: catalog_media ya existe con (item_id, variant_id,
-- url, type, alt_text, sort_order) y un enum catalog_media_type que incluye
-- 'image' y 'video'. Esto sólo lo usa.
--
-- Se hace DROP + CREATE en vez de CREATE OR REPLACE porque cambia la firma:
-- agregar parámetros crearía una sobrecarga y las llamadas quedarían
-- ambiguas ("function is not unique").
-- ============================================================================

begin;

drop function if exists public.crear_publicacion(
  text, numeric, text, text, text, integer, text[], text, jsonb
);

create or replace function public.crear_publicacion(
  p_title       text,
  p_price       numeric,
  p_currency    text    default 'UYU',
  p_sku         text    default null,
  p_description text    default null,
  p_stock       integer default 0,
  p_channels    text[]  default array['market'],
  p_status      text    default 'draft',
  p_attributes  jsonb   default '{}'::jsonb,
  p_images      text[]  default null,
  p_videos      text[]  default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_store    uuid;
  v_item     uuid;
  v_variant  uuid;
  v_location uuid;
  v_channel  text;
  v_url      text;
  v_orden    smallint := 0;
begin
  v_store := (auth.jwt() ->> 'store_id')::uuid;

  if v_store is null then
    raise exception 'Sin tienda activa. El claim store_id no está en el JWT: '
                    'revisar que el hook de access token esté habilitado.'
      using errcode = '42501';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'El título es obligatorio.' using errcode = '22023';
  end if;

  if p_price is null or p_price < 0 then
    raise exception 'El precio debe ser mayor o igual a cero.' using errcode = '22023';
  end if;

  insert into catalog_items (tenant_id, title, description, status)
  values (v_store, btrim(p_title), p_description, p_status::catalog_item_status)
  returning id into v_item;

  insert into catalog_variants (item_id, sku, status, is_default, price, attributes)
  values (
    v_item,
    coalesce(nullif(btrim(p_sku), ''), 'SKU-' || left(replace(v_item::text, '-', ''), 8)),
    'active',
    true,
    p_price,
    coalesce(p_attributes, '{}'::jsonb)
  )
  returning id into v_variant;

  insert into catalog_prices (variant_id, channel, currency, amount, priority)
  values (v_variant, null, p_currency, p_price, 0);

  -- Media --------------------------------------------------------------------
  -- El orden importa: la primera imagen es la principal en la vidriera.
  foreach v_url in array coalesce(p_images, array[]::text[])
  loop
    if nullif(btrim(v_url), '') is not null then
      insert into catalog_media (item_id, variant_id, url, type, sort_order)
      values (v_item, v_variant, btrim(v_url), 'image', v_orden);
      v_orden := v_orden + 1;
    end if;
  end loop;

  v_orden := 0;
  foreach v_url in array coalesce(p_videos, array[]::text[])
  loop
    if nullif(btrim(v_url), '') is not null then
      insert into catalog_media (item_id, variant_id, url, type, sort_order)
      values (v_item, v_variant, btrim(v_url), 'video', v_orden);
      v_orden := v_orden + 1;
    end if;
  end loop;

  -- Stock --------------------------------------------------------------------
  if p_stock > 0 then
    select id into v_location
      from catalog_locations
     where tenant_id = v_store and is_active
     order by created_at
     limit 1;

    if v_location is null then
      insert into catalog_locations (tenant_id, name, type, is_active)
      values (v_store, 'Depósito principal', 'warehouse', true)
      returning id into v_location;
    end if;

    insert into catalog_inventory (variant_id, location_id, quantity, reserved)
    values (v_variant, v_location, p_stock, 0);
  end if;

  -- Canales ------------------------------------------------------------------
  foreach v_channel in array coalesce(p_channels, array[]::text[])
  loop
    insert into catalog_listings (variant_id, channel, status, channel_attrs)
    values (
      v_variant,
      v_channel,
      case when v_channel in ('market','secondhand') then 'active' else 'pending' end::catalog_listing_status,
      '{}'::jsonb
    )
    on conflict (variant_id, channel) do nothing;
  end loop;

  return v_variant;
end;
$$;

comment on function public.crear_publicacion is
  'Alta atómica de una publicación multicanal, con media. El tenant sale del '
  'claim store_id, nunca de un parámetro.';

grant execute on function public.crear_publicacion(
  text, numeric, text, text, text, integer, text[], text, jsonb, text[], text[]
) to authenticated;

commit;


-- ***** catalog_vidriera (desde 20260822000600_catalog_vidriera_publica.sql) *****

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
    select * from resolve_price(v.id, p_currency, l.channel)
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


-- ***** catalog_vidriera por ids (desde 20260822000700_vidriera_por_ids.sql) *****

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
    select * from resolve_price(v.id, p_currency, l.channel)
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


-- ***** crear_orden_segura (desde 20260822000900_crear_orden_segura_catalog.sql) *****

-- ============================================================================
-- crear_orden_segura: validar contra catalog_* y dejar de romper el checkout
-- ============================================================================
-- La version anterior no podia completar una orden. Tenia tres fallas
-- independientes, todas confirmadas contra el esquema real:
--
-- 1. INSERT en order_items con columnas que no existen (`price`) y omitiendo
--    `name`, que es NOT NULL. Peor: order_items pertenece al OTRO modelo de
--    orden (`orders`, con buyer_id/seller_id) y tiene dos CHECK que este
--    insert viola siempre:
--        CHECK (product_id IS NULL)
--        CHECK (store_product_id IS NOT NULL)
--    `ordenes` guarda sus items inline en la columna `items` jsonb, asi que
--    ese INSERT nunca debio existir. Se elimina.
--
-- 2. Lectura de precio y stock desde productos_market / productos_secondhand,
--    vacias desde la migracion del catalogo. El carrito hoy guarda variant_id.
--
-- 3. Rama de carrito mixto contra `tasas_cambio_oficial`, tabla inexistente.
--    Se usa `exchange_rates`, que si existe.
--
-- Todo lo demas se conserva textual: validaciones de comprador, formato de
-- retorno, acumulacion por moneda y manejo de errores.
--
-- DIFERENCIA DELIBERADA respecto del modelo viejo: al llegar el stock a cero
-- NO se cambia el estado del item. El modelo anterior marcaba status='sold'
-- porque no tenia tabla de inventario; catalog_* si la tiene, y hacer que el
-- estado codifique el stock es justamente lo que ese modelo vino a separar.
-- Sin stock, la vidriera ya reporta 0.
-- ============================================================================

begin;

create or replace function public.crear_orden_segura(
  p_user_id        uuid,
  p_items          jsonb,
  p_nombre         text,
  p_email          text,
  p_telefono       text default null,
  p_direccion      text default null,
  p_ciudad         text default null,
  p_codigo_postal  text default null,
  p_tipo_comprador text default 'persona',
  p_documento      text default null,
  p_razon_social   text default null,
  p_source         text default 'web'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $_$
DECLARE
  v_order_id       UUID;
  v_total_uyu      NUMERIC := 0;
  v_total_usd      NUMERIC := 0;
  v_item           JSONB;
  v_product_id     UUID;
  v_quantity       INT;
  v_tipo           TEXT;
  v_price          NUMERIC;
  v_currency       TEXT;
  v_stock          INT;
  v_status         TEXT;
  v_items_out      JSONB := '[]'::JSONB;
  v_nombre_prod    TEXT;
  v_currency_final TEXT;
  v_tasa           NUMERIC;
  v_total_uyu_fact NUMERIC;
  v_restante       INT;
  v_loc            RECORD;
  v_precio_row     catalog_prices;
BEGIN
  IF p_tipo_comprador NOT IN ('persona', 'empresa') THEN
    RAISE EXCEPTION 'tipo_comprador invalido';
  END IF;

  IF p_tipo_comprador = 'empresa' THEN
    IF p_razon_social IS NULL OR btrim(p_razon_social) = '' THEN
      RAISE EXCEPTION 'razon_social requerida para empresa';
    END IF;
    IF p_documento IS NULL OR p_documento !~ '^[0-9]{12}$' THEN
      RAISE EXCEPTION 'RUT invalido';
    END IF;
  END IF;

  IF p_nombre IS NULL OR btrim(p_nombre) = '' THEN
    RAISE EXCEPTION 'nombre requerido';
  END IF;
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email invalido';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items requeridos';
  END IF;

  INSERT INTO ordenes (
    user_id, source, estado, payment_status, total_uyu, total_usd, created_at,
    nombre_cliente, email_cliente, telefono_cliente, direccion_entrega,
    ciudad_entrega, codigo_postal,
    tipo_comprador, documento, razon_social
  ) VALUES (
    p_user_id, p_source, 'pendiente', 'pending_payment', 0, 0, now(),
    p_nombre, p_email, p_telefono, p_direccion,
    p_ciudad, p_codigo_postal,
    p_tipo_comprador, p_documento, p_razon_social
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity   := (v_item->>'quantity')::INT;
    v_tipo       := COALESCE(v_item->>'tipo', 'market');

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Cantidad invalida para producto %', v_product_id;
    END IF;

    IF v_tipo NOT IN ('market', 'secondhand') THEN
      RAISE EXCEPTION 'Tipo invalido: %', v_tipo;
    END IF;

    -- ── Variante e item, con lock sobre la variante ──
    SELECT i.title, i.status::text
      INTO v_nombre_prod, v_status
      FROM catalog_variants v
      JOIN catalog_items i ON i.id = v.item_id
     WHERE v.id = v_product_id
       FOR UPDATE OF v;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no encontrado', v_product_id;
    END IF;

    IF v_status <> 'active' THEN
      RAISE EXCEPTION 'Producto % no esta disponible (estado %)', v_product_id, v_status;
    END IF;

    -- Debe estar publicado en el canal por el que se compra.
    IF NOT EXISTS (
      SELECT 1 FROM catalog_listings l
       WHERE l.variant_id = v_product_id
         AND l.channel    = v_tipo
         AND l.status     = 'active'
    ) THEN
      RAISE EXCEPTION 'Producto % no esta publicado en %', v_product_id, v_tipo;
    END IF;

    -- ── Precio: se prueba UYU y luego USD, igual que soportaba el modelo viejo ──
    v_precio_row := NULL;
    SELECT * INTO v_precio_row FROM resolve_price(v_product_id, 'UYU'::text, v_tipo);
    IF v_precio_row.amount IS NOT NULL THEN
      v_price := v_precio_row.amount; v_currency := 'UYU';
    ELSE
      SELECT * INTO v_precio_row FROM resolve_price(v_product_id, 'USD'::text, v_tipo);
      IF v_precio_row.amount IS NOT NULL THEN
        v_price := v_precio_row.amount; v_currency := 'USD';
      ELSE
        -- Ultimo recurso: el precio de la variante.
        SELECT v.price INTO v_price FROM catalog_variants v WHERE v.id = v_product_id;
        v_currency := 'UYU';
      END IF;
    END IF;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'Producto % no tiene precio configurado', v_product_id;
    END IF;

    -- ── Stock disponible sumando ubicaciones ──
    SELECT COALESCE(SUM(available), 0) INTO v_stock
      FROM catalog_inventory WHERE variant_id = v_product_id;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %. Disponible: %', v_product_id, v_stock;
    END IF;

    -- ── Descontar recorriendo ubicaciones hasta cubrir la cantidad ──
    v_restante := v_quantity;
    FOR v_loc IN
      SELECT id, available FROM catalog_inventory
       WHERE variant_id = v_product_id AND available > 0
       ORDER BY available DESC
       FOR UPDATE
    LOOP
      EXIT WHEN v_restante <= 0;
      UPDATE catalog_inventory
         SET quantity   = quantity - LEAST(v_restante, v_loc.available),
             updated_at = now()
       WHERE id = v_loc.id;
      v_restante := v_restante - LEAST(v_restante, v_loc.available);
    END LOOP;

    IF v_currency NOT IN ('UYU', 'USD') THEN
      RAISE EXCEPTION 'Moneda no soportada "%" para producto %', v_currency, v_product_id;
    END IF;

    -- Los items de `ordenes` viven en su columna `items` jsonb. NO se inserta
    -- en order_items: esa tabla es del modelo `orders` y sus CHECK exigen
    -- store_product_id y prohiben product_id.
    v_items_out := v_items_out || jsonb_build_object(
      'producto_id',     v_product_id,
      'producto_tipo',   v_tipo,
      'nombre',          v_nombre_prod,
      'cantidad',        v_quantity,
      'precio_unitario', v_price,
      'moneda',          v_currency
    );

    IF v_currency = 'USD' THEN
      v_total_usd := v_total_usd + (v_price * v_quantity);
    ELSE
      v_total_uyu := v_total_uyu + (v_price * v_quantity);
    END IF;

  END LOOP;

  -- ── Moneda de facturacion final ──
  IF v_total_usd > 0 AND v_total_uyu > 0 THEN
    SELECT rate INTO v_tasa
      FROM exchange_rates
     WHERE from_currency = 'USD' AND to_currency = 'UYU'
     ORDER BY valid_at DESC
     LIMIT 1;

    IF v_tasa IS NULL THEN
      RAISE EXCEPTION 'No hay tipo de cambio USD->UYU en exchange_rates. No se puede facturar un carrito mixto sin el.';
    END IF;

    v_total_uyu_fact := v_total_uyu + (v_total_usd * v_tasa);
    v_currency_final := 'UYU';

    UPDATE ordenes
       SET total_uyu   = v_total_uyu_fact,
           total_usd   = v_total_usd,
           currency    = v_currency_final,
           moneda      = v_currency_final,
           tipo_cambio = v_tasa,
           items       = v_items_out
     WHERE id = v_order_id;

    RETURN jsonb_build_object(
      'order_id', v_order_id, 'total_uyu', v_total_uyu_fact,
      'total_usd', v_total_usd, 'currency', v_currency_final, 'tipo_cambio', v_tasa
    );
  ELSE
    v_currency_final := CASE WHEN v_total_usd > 0 THEN 'USD' ELSE 'UYU' END;

    UPDATE ordenes
       SET total_uyu = v_total_uyu,
           total_usd = v_total_usd,
           currency  = v_currency_final,
           moneda    = v_currency_final,
           items     = v_items_out
     WHERE id = v_order_id;

    RETURN jsonb_build_object(
      'order_id', v_order_id, 'total_uyu', v_total_uyu,
      'total_usd', v_total_usd, 'currency', v_currency_final, 'tipo_cambio', NULL
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$_$;

commit;


-- ***** Ultimo paso: sacar la firma vieja *****
--
-- Ya nadie la referencia. Mientras siga existiendo, una llamada con un literal
-- sin tipo -resolve_price(id, 'UYU', canal)- queda ambigua entre las dos
-- sobrecargas y falla en tiempo de ejecucion.
drop function if exists public.resolve_price(uuid, character, text, text, character, text, timestamptz);

grant execute on function public.resolve_price(uuid, text, text, text, text, text, timestamptz)
  to authenticated, service_role;
