-- ===========================================================================
-- Limpieza de datos de prueba
-- ===========================================================================
--
-- Deja la base vacia de productos, publicaciones, pedidos y errores de sync,
-- lista para cargar un producto real.
--
-- SE CONSERVA a proposito:
--   * auth.users, profiles, user_*     -> el login
--   * stores, store_members            -> la tienda y su dueño
--   * api_vault, ml_credentials,
--     mp_credentials                   -> la conexion con Mercado Libre.
--                                         Borrarlas obliga a reconectar OAuth.
--   * countries, currencies, languages,
--     platforms, channels, categorias,
--     hs_codes, territories...         -> tablas maestras, no son datos de uso
--
-- El orden respeta las claves foraneas: primero lo que apunta, despues lo
-- apuntado. TRUNCATE ... CASCADE seria mas corto pero arrastraria tablas que
-- no queremos tocar sin decirlo.
--
-- Correr en el SQL Editor de Supabase.
-- ===========================================================================

begin;

-- --- Sincronizacion y webhooks de Mercado Libre ---------------------------
delete from catalog_sync_log;
delete from ml_sync_queue;
delete from ml_webhook_events;
delete from webhook_events;
delete from ml_listings;

-- --- Pedidos, pagos y checkout --------------------------------------------
delete from payment_allocations;
delete from payments;
delete from seller_payouts;
delete from seller_order_items;
delete from seller_orders;
delete from order_items;
delete from orders;
delete from ordenes;
delete from checkout_items;
delete from checkouts;
delete from market_checkouts;

-- --- Carrito y favoritos ---------------------------------------------------
delete from cart_items;
delete from carrito;
delete from favorites;
delete from reviews;

-- --- Inventario ------------------------------------------------------------
delete from inventory_movements;
delete from catalog_inventory;

-- --- Catalogo canonico (catalog_*) ----------------------------------------
delete from catalog_listings;
delete from catalog_prices;
delete from catalog_media;
delete from catalog_events;
delete from catalog_variants;
delete from catalog_items;

-- --- Catalogo legado -------------------------------------------------------
delete from product_prices;
delete from articulo_variantes;
delete from articulos;
delete from products;
delete from productos_market;
delete from productos_secondhand;
delete from media_library;

-- --- Tablas deprecadas (quedaron con restos) -------------------------------
delete from zz_deprecated_article_prices;
delete from zz_deprecated_inventory_items;
delete from zz_deprecated_product_images;
delete from zz_deprecated_product_media;
delete from zz_deprecated_secondhand_listings;
delete from zz_deprecated_store_products;

-- --- Actividad y auditoria -------------------------------------------------
delete from activities;
delete from notifications;
delete from audit_logs;
delete from events;
delete from catalog_events;

commit;

-- --- Verificacion ----------------------------------------------------------
-- Todo esto tiene que dar 0. Lo de abajo, no.
select 'catalog_items'    as tabla, count(*) from catalog_items
union all select 'catalog_variants',  count(*) from catalog_variants
union all select 'catalog_listings',  count(*) from catalog_listings
union all select 'catalog_prices',    count(*) from catalog_prices
union all select 'catalog_inventory', count(*) from catalog_inventory
union all select 'catalog_sync_log',  count(*) from catalog_sync_log
union all select 'ml_sync_queue',     count(*) from ml_sync_queue
union all select 'articulos',         count(*) from articulos
union all select 'carrito',           count(*) from carrito
union all select 'orders',            count(*) from orders
union all select '--- se conserva ---', null
union all select 'stores',            count(*) from stores
union all select 'store_members',     count(*) from store_members
union all select 'profiles',          count(*) from profiles
union all select 'api_vault',         count(*) from api_vault;
