-- ============================================================================
-- F2 — RPC de alta de publicación multicanal
-- ============================================================================
-- Crear un producto en el modelo multicanal toca cinco tablas: catalog_items,
-- catalog_variants, catalog_prices, catalog_inventory y catalog_listings. Si
-- la UI hiciera cinco inserts sueltos, un fallo a mitad de camino dejaría
-- ítems sin precio o variantes sin listing.
--
-- Esta función lo hace en una transacción y devuelve el variant_id, que es la
-- clave con la que la pantalla identifica una publicación.
--
-- Es el equivalente de alta a `crear_orden_segura` en el flujo de compra.
--
-- SEGURIDAD: security invoker. El tenant NO se recibe por parámetro — se toma
-- del claim store_id. Así un cliente no puede crear productos en la tienda de
-- otro aunque manipule el payload, y RLS sigue siendo la única autoridad.
-- ============================================================================

begin;

create or replace function public.crear_publicacion(
  p_title       text,
  p_price       numeric,
  p_currency    text    default 'UYU',
  p_sku         text    default null,
  p_description text    default null,
  p_stock       integer default 0,
  p_channels    text[]  default array['market'],
  p_status      text    default 'draft',
  p_attributes  jsonb   default '{}'::jsonb
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

  -- Ítem --------------------------------------------------------------------
  insert into catalog_items (tenant_id, title, description, status)
  values (v_store, btrim(p_title), p_description, p_status::catalog_item_status)
  returning id into v_item;

  -- Variante ----------------------------------------------------------------
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

  -- Precio maestro: channel IS NULL aplica a todos los canales ---------------
  insert into catalog_prices (variant_id, channel, currency, amount, priority)
  values (v_variant, null, p_currency::char, p_price, 0);

  -- Stock -------------------------------------------------------------------
  -- `available` es columna generada: no se escribe.
  if p_stock > 0 then
    select id into v_location
      from catalog_locations
     where tenant_id = v_store and is_active
     order by created_at
     limit 1;

    -- Sin depósito no hay dónde poner stock: se crea uno por defecto en vez
    -- de fallar, porque la tienda recién creada no tiene ninguno.
    if v_location is null then
      insert into catalog_locations (tenant_id, name, type, is_active)
      values (v_store, 'Depósito principal', 'warehouse', true)
      returning id into v_location;
    end if;

    insert into catalog_inventory (variant_id, location_id, quantity, reserved)
    values (v_variant, v_location, p_stock, 0);
  end if;

  -- Canales -----------------------------------------------------------------
  -- 'market' arranca activo porque se publica en el acto; el resto queda
  -- 'pending' hasta que su motor de sincronización los empuje.
  foreach v_channel in array coalesce(p_channels, array[]::text[])
  loop
    insert into catalog_listings (variant_id, channel, status, channel_attrs)
    values (
      v_variant,
      v_channel,
      case when v_channel = 'market' then 'active' else 'pending' end::catalog_listing_status,
      '{}'::jsonb
    )
    on conflict (variant_id, channel) do nothing;
  end loop;

  return v_variant;
end;
$$;

comment on function public.crear_publicacion is
  'Alta atómica de una publicación multicanal. El tenant sale del claim '
  'store_id, nunca de un parámetro: el cliente no puede elegir tienda.';

grant execute on function public.crear_publicacion(
  text, numeric, text, text, text, integer, text[], text, jsonb
) to authenticated;

commit;
