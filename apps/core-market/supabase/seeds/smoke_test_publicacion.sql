-- ============================================================================
-- Smoke test — un producto completo en el modelo multicanal
-- ============================================================================
-- NO es una migración: vive en supabase/seeds/ a propósito, porque es dato de
-- prueba, no esquema. Correr a mano desde el SQL editor.
--
-- Crea la rebanada vertical mínima que ejercita todo el modelo:
--
--   catalog_locations   (depósito — la tabla está vacía y el stock lo exige)
--        ↓
--   catalog_items       (la publicación maestra)
--        ↓
--   catalog_variants    (el SKU)
--        ↓
--   catalog_prices      (precio maestro: channel IS NULL)
--   catalog_inventory   (stock en el depósito)
--   catalog_listings    (canal 'market')
--
-- Importante: desde el SQL editor `auth.jwt()` está vacío, así que el
-- tenant_id se resuelve por el código de la tienda, no por el claim. Eso
-- también significa que este script NO prueba RLS — la prueba real es que la
-- app, ya logueada, vea este producto.
--
-- Idempotente: se puede correr varias veces.
-- Para borrarlo: delete from catalog_items where sku_prefix = 'SMOKE';
-- ============================================================================

begin;

do $$
declare
  v_store    uuid;
  v_location uuid;
  v_item     uuid;
  v_variant  uuid;
begin
  select id into v_store from public.stores where codigo = 'charlie-market';
  if v_store is null then
    raise exception 'No existe la tienda charlie-market. Correr antes el seed 20260822000100.';
  end if;

  -- Depósito ----------------------------------------------------------------
  select id into v_location
    from public.catalog_locations
   where tenant_id = v_store and name = 'Depósito principal';

  if v_location is null then
    insert into public.catalog_locations (tenant_id, name, type, is_active)
    values (v_store, 'Depósito principal', 'warehouse', true)
    returning id into v_location;
  end if;

  -- Publicación maestra -----------------------------------------------------
  select id into v_item
    from public.catalog_items
   where tenant_id = v_store and sku_prefix = 'SMOKE';

  if v_item is null then
    insert into public.catalog_items (tenant_id, sku_prefix, title, description, status, tags)
    values (
      v_store,
      'SMOKE',
      'Producto de prueba multicanal',
      'Creado por supabase/seeds/smoke_test_publicacion.sql para verificar '
      || 'la cadena completa: RLS, claim store_id y el RPC catalog_publicaciones.',
      'active',
      array['smoke-test']
    )
    returning id into v_item;
  end if;

  -- Variante ----------------------------------------------------------------
  select id into v_variant
    from public.catalog_variants
   where item_id = v_item and sku = 'SMOKE-001';

  if v_variant is null then
    insert into public.catalog_variants (item_id, sku, status, is_default, price, attributes)
    values (v_item, 'SMOKE-001', 'active', true, 3990, '{"color":"negro"}'::jsonb)
    returning id into v_variant;
  end if;

  -- Precio maestro: channel IS NULL aplica a todos los canales ---------------
  if not exists (
    select 1 from public.catalog_prices
     where variant_id = v_variant and channel is null and currency = 'UYU'
  ) then
    insert into public.catalog_prices (variant_id, channel, currency, amount, priority)
    values (v_variant, null, 'UYU', 3990, 0);
  end if;

  -- Override de Mercado Libre, para ver el price_origin distinguir MASTER de
  -- OVERRIDE en la UI. Prioridad mayor que el maestro.
  if not exists (
    select 1 from public.catalog_prices
     where variant_id = v_variant and channel = 'mercadolibre' and currency = 'UYU'
  ) then
    insert into public.catalog_prices (variant_id, channel, currency, amount, priority, note)
    values (v_variant, 'mercadolibre', 'UYU', 4290, 10, 'Override de prueba: maestro + comisión');
  end if;

  -- Stock -------------------------------------------------------------------
  -- `available` es una columna GENERADA (se deriva de quantity/reserved), así
  -- que no se escribe: Postgres rechaza cualquier valor que no sea DEFAULT.
  insert into public.catalog_inventory (variant_id, location_id, quantity, reserved)
  values (v_variant, v_location, 5, 0)
  on conflict (variant_id, location_id)
  do update set quantity = 5, reserved = 0, updated_at = now();

  -- Canales -----------------------------------------------------------------
  -- 'market' activo; 'mercadolibre' pendiente, que es el estado real: existe
  -- el override de precio pero nunca se publicó.
  insert into public.catalog_listings (variant_id, channel, status, channel_attrs)
  values (v_variant, 'market', 'active', '{}'::jsonb)
  on conflict (variant_id, channel) do nothing;

  insert into public.catalog_listings (variant_id, channel, status, channel_attrs)
  values (v_variant, 'mercadolibre', 'pending', '{}'::jsonb)
  on conflict (variant_id, channel) do nothing;

  raise notice 'Producto de prueba listo. item=% variant=% store=%', v_item, v_variant, v_store;
end $$;

commit;

-- ── Verificación ────────────────────────────────────────────────────────────
-- Desde el SQL editor el RPC devuelve 0 filas (RLS sin claim). Este select
-- salta RLS por ser superusuario y confirma que los datos quedaron bien.
select i.title,
       v.sku,
       v.price                                        as precio_variante,
       (select amount from catalog_prices
         where variant_id = v.id and channel is null) as precio_maestro,
       (select amount from catalog_prices
         where variant_id = v.id and channel = 'mercadolibre') as precio_ml,
       (select sum(available) from catalog_inventory
         where variant_id = v.id)                     as stock,
       (select string_agg(channel || ':' || status, ', ' order by channel)
          from catalog_listings where variant_id = v.id) as canales
  from catalog_items i
  join catalog_variants v on v.item_id = i.id
 where i.sku_prefix = 'SMOKE';
