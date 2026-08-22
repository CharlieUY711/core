-- ============================================================================
-- Revertir 4 renombres que rompieron funciones de la base
-- ============================================================================
-- CONTEXTO
-- En la limpieza previa se renombraron 13 tablas a zz_deprecated_* tras
-- verificar que ningun archivo del repositorio las referenciara. Esa
-- verificacion fue incompleta: se busco en src/ y supabase/functions/, pero
-- NO dentro de los cuerpos de las funciones PL/pgSQL almacenadas en la base.
--
-- El dump del esquema real, obtenido despues, dejo a la vista que cuatro de
-- esas tablas si estaban en uso desde la propia base:
--
--   product_prices       -> crear_orden, crear_orden_segura, validate_ml_sync
--   products             -> 1 funcion
--   ml_category_mapping  -> 1 funcion (resolucion de categoria ML)
--   ml_listings          -> 1 referencia
--
-- La mas grave es crear_orden_segura: es el RPC que ejecuta el checkout. Con
-- la tabla renombrada, falla en tiempo de ejecucion con
-- "relation product_prices does not exist".
--
-- Esta migracion deshace exactamente esos cuatro renombres y deja el estado
-- como estaba antes. No toca las otras nueve, que siguen sin referencias.
--
-- Leccion registrada: en una base con 69 funciones PL/pgSQL, grep sobre el
-- repositorio no alcanza para declarar que una tabla no se usa.
-- ============================================================================

begin;

alter table if exists public.zz_deprecated_product_prices      rename to product_prices;
alter table if exists public.zz_deprecated_products            rename to products;
alter table if exists public.zz_deprecated_ml_category_mapping rename to ml_category_mapping;
alter table if exists public.zz_deprecated_ml_listings         rename to ml_listings;

commit;

-- ── Verificacion ────────────────────────────────────────────────────────────
-- Las cuatro deben aparecer con su nombre original y sin prefijo.
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('product_prices', 'products', 'ml_category_mapping', 'ml_listings')
 order by table_name;
