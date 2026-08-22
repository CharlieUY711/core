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

create function public.crear_publicacion(
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
  values (v_variant, null, p_currency::char, p_price, 0);

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
