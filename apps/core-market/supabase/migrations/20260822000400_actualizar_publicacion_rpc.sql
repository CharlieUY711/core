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
