-- ============================================================================
-- ESQUEMA REAL DE PRODUCCION — snapshot verbatim
-- ============================================================================
-- Actualizado: 2026-08-22 (post F-1) · Postgres 17.6.1.104
-- Metodo:   supabase db dump --dry-run  ->  pg_dump 17.11
--
-- NO es una migracion. Vive fuera de supabase/migrations/ para que
-- 'supabase db push' no intente aplicarlo. Es la representacion autoritativa
-- del estado existente, sin una sola linea reconstruida a mano.
-- ============================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'buyer',
    'seller',
    'admin',
    'superadmin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."catalog_item_status" AS ENUM (
    'draft',
    'active',
    'archived',
    'discontinued'
);


ALTER TYPE "public"."catalog_item_status" OWNER TO "postgres";


CREATE TYPE "public"."catalog_listing_status" AS ENUM (
    'pending',
    'syncing',
    'active',
    'paused',
    'error',
    'delisted'
);


ALTER TYPE "public"."catalog_listing_status" OWNER TO "postgres";


CREATE TYPE "public"."catalog_media_type" AS ENUM (
    'image',
    'video',
    'model_3d',
    'document'
);


ALTER TYPE "public"."catalog_media_type" OWNER TO "postgres";


CREATE TYPE "public"."catalog_sync_action" AS ENUM (
    'create',
    'update',
    'pause',
    'delete',
    'refresh_price',
    'refresh_stock'
);


ALTER TYPE "public"."catalog_sync_action" OWNER TO "postgres";


CREATE TYPE "public"."catalog_sync_result" AS ENUM (
    'success',
    'error',
    'skipped'
);


ALTER TYPE "public"."catalog_sync_result" OWNER TO "postgres";


CREATE TYPE "public"."catalog_variant_status" AS ENUM (
    'active',
    'inactive',
    'discontinued'
);


ALTER TYPE "public"."catalog_variant_status" OWNER TO "postgres";


CREATE TYPE "public"."item_condition" AS ENUM (
    'new',
    'like_new',
    'good',
    'fair',
    'poor'
);


ALTER TYPE "public"."item_condition" OWNER TO "postgres";


CREATE TYPE "public"."listing_status" AS ENUM (
    'active',
    'paused',
    'sold',
    'deleted'
);


ALTER TYPE "public"."listing_status" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_provider" AS ENUM (
    'mercadopago',
    'paypal',
    'cash'
);


ALTER TYPE "public"."payment_provider" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."actualizar_publicacion"("p_variant_id" "uuid", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_price" numeric DEFAULT NULL::numeric, "p_currency" "text" DEFAULT 'UYU'::"text", "p_sku" "text" DEFAULT NULL::"text", "p_stock" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
       and currency = p_currency::char;

    if not found then
      insert into catalog_prices (variant_id, channel, currency, amount, priority)
      values (p_variant_id, null, p_currency::char, p_price, 0);
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


ALTER FUNCTION "public"."actualizar_publicacion"("p_variant_id" "uuid", "p_title" "text", "p_description" "text", "p_status" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_stock" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."actualizar_publicacion"("p_variant_id" "uuid", "p_title" "text", "p_description" "text", "p_status" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_stock" integer) IS 'Edición atómica de una publicación. Cambiar el precio maestro NO pisa los overrides por canal: esa es la regla del sistema de overrides.';



CREATE OR REPLACE FUNCTION "public"."admin_create_category"("p_department_id" "uuid", "p_name" "text", "p_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if exists(select 1 from categories where slug=p_slug) then raise exception 'Slug ya existe'; end if;
  insert into categories(department_id,name,slug) values(p_department_id,p_name,p_slug) returning id into v_id;
  perform log_event('admin_category_created','category',v_id,jsonb_build_object('name',p_name));
  return jsonb_build_object('ok',true,'id',v_id);
end;$$;


ALTER FUNCTION "public"."admin_create_category"("p_department_id" "uuid", "p_name" "text", "p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_department"("p_name" "text", "p_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if exists(select 1 from departments where slug=p_slug or name=p_name) then
    raise exception 'Departamento con ese nombre o slug ya existe';
  end if;
  insert into departments(name,slug) values(p_name,p_slug) returning id into v_id;
  perform log_event('admin_department_created','department',v_id,jsonb_build_object('name',p_name));
  return jsonb_build_object('ok',true,'id',v_id);
end;$$;


ALTER FUNCTION "public"."admin_create_department"("p_name" "text", "p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_subcategory"("p_category_id" "uuid", "p_name" "text", "p_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if exists(select 1 from subcategories where slug=p_slug) then raise exception 'Slug ya existe'; end if;
  insert into subcategories(category_id,name,slug) values(p_category_id,p_name,p_slug) returning id into v_id;
  perform log_event('admin_subcategory_created','subcategory',v_id,jsonb_build_object('name',p_name));
  return jsonb_build_object('ok',true,'id',v_id);
end;$$;


ALTER FUNCTION "public"."admin_create_subcategory"("p_category_id" "uuid", "p_name" "text", "p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_category"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if exists(select 1 from subcategories where category_id=p_id and is_active=true) then
    raise exception 'No se puede eliminar: tiene subcategorías activas';
  end if;
  update categories set is_active=false where id=p_id;
  perform log_event('admin_category_deleted','category',p_id,'{}');
  return jsonb_build_object('ok',true);
end;$$;


ALTER FUNCTION "public"."admin_delete_category"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_department"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if exists(select 1 from categories where department_id=p_id and is_active=true) then
    raise exception 'No se puede eliminar: tiene categorías activas';
  end if;
  update departments set is_active=false where id=p_id;
  perform log_event('admin_department_deleted','department',p_id,'{}');
  return jsonb_build_object('ok',true);
end;$$;


ALTER FUNCTION "public"."admin_delete_department"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_subcategory"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  update subcategories set is_active=false where id=p_id;
  perform log_event('admin_subcategory_deleted','subcategory',p_id,'{}');
  return jsonb_build_object('ok',true);
end;$$;


ALTER FUNCTION "public"."admin_delete_subcategory"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_enqueue_ml_sync"("p_product_id" "uuid", "p_action" "text" DEFAULT 'sync_item'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.ml_sync_queue (product_id, action, status, retries)
  VALUES (p_product_id, p_action, 'pending', 0)
  ON CONFLICT DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."admin_enqueue_ml_sync"("p_product_id" "uuid", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_fix_stock"("p_product_id" "uuid", "p_new_stock" integer, "p_reason" "text" DEFAULT 'admin_manual_fix'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_old_stock int;
begin
  if not is_admin() then
    raise exception 'Acceso denegado: se requiere rol admin';
  end if;

  if p_new_stock < 0 then
    raise exception 'Stock no puede ser negativo';
  end if;

  select stock into v_old_stock
  from productos_market where id = p_product_id;

  if not found then
    raise exception 'Producto % no encontrado', p_product_id;
  end if;

  update productos_market set
    stock  = p_new_stock,
    status = case
      when p_new_stock = 0 then 'sold'
      when status = 'sold' and p_new_stock > 0 then 'active'
      else status
    end
  where id = p_product_id;

  perform log_event('admin_stock_fixed', 'product', p_product_id,
    jsonb_build_object('old_stock', v_old_stock, 'new_stock', p_new_stock, 'reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'product_id', p_product_id, 'old_stock', v_old_stock, 'new_stock', p_new_stock);
end;
$$;


ALTER FUNCTION "public"."admin_fix_stock"("p_product_id" "uuid", "p_new_stock" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_pause_product"("p_product_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not is_admin() then
    raise exception 'Acceso denegado: se requiere rol admin';
  end if;

  update productos_market set status = 'paused' where id = p_product_id;

  if not found then
    raise exception 'Producto % no encontrado', p_product_id;
  end if;

  perform log_event('admin_product_paused', 'product', p_product_id, '{}'::jsonb);

  return jsonb_build_object('ok', true, 'product_id', p_product_id, 'status', 'paused');
end;
$$;


ALTER FUNCTION "public"."admin_pause_product"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_publish_ml"("p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.admin_enqueue_ml_sync(p_product_id, 'sync_item');
END;
$$;


ALTER FUNCTION "public"."admin_publish_ml"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_category"("p_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_department_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  update categories set name=coalesce(p_name,name), slug=coalesce(p_slug,slug), is_active=coalesce(p_is_active,is_active), department_id=coalesce(p_department_id,department_id) where id=p_id;
  perform log_event('admin_category_updated','category',p_id,'{}');
  return jsonb_build_object('ok',true);
end;$$;


ALTER FUNCTION "public"."admin_update_category"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_department_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_department"("p_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  update departments set name=coalesce(p_name,name), slug=coalesce(p_slug,slug), is_active=coalesce(p_is_active,is_active) where id=p_id;
  perform log_event('admin_department_updated','department',p_id,'{}');
  return jsonb_build_object('ok',true);
end;$$;


ALTER FUNCTION "public"."admin_update_department"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_nombre" "text" DEFAULT NULL::"text", "p_precio" numeric DEFAULT NULL::numeric, "p_stock" integer DEFAULT NULL::integer, "p_status" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_old record;
begin
  if not is_admin() then
    raise exception 'Acceso denegado: se requiere rol admin';
  end if;

  select nombre, precio, stock, status into v_old
  from productos_market where id = p_product_id;

  if not found then
    raise exception 'Producto % no encontrado', p_product_id;
  end if;

  update productos_market set
    nombre = coalesce(p_nombre, nombre),
    precio = coalesce(p_precio, precio),
    stock  = coalesce(p_stock,  stock),
    status = coalesce(p_status, status)
  where id = p_product_id;

  perform log_event('admin_product_updated', 'product', p_product_id,
    jsonb_build_object(
      'before', jsonb_build_object('nombre', v_old.nombre, 'precio', v_old.precio, 'stock', v_old.stock, 'status', v_old.status),
      'after',  jsonb_build_object('nombre', p_nombre,     'precio', p_precio,     'stock', p_stock,     'status', p_status)
    )
  );

  return jsonb_build_object('ok', true, 'product_id', p_product_id);
end;
$$;


ALTER FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_nombre" "text", "p_precio" numeric, "p_stock" integer, "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_subcategory"("p_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_category_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  update subcategories set name=coalesce(p_name,name), slug=coalesce(p_slug,slug), is_active=coalesce(p_is_active,is_active), category_id=coalesce(p_category_id,category_id) where id=p_id;
  perform log_event('admin_subcategory_updated','subcategory',p_id,'{}');
  return jsonb_build_object('ok',true);
end;$$;


ALTER FUNCTION "public"."admin_update_subcategory"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_category_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."catalog_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "reserved" integer DEFAULT 0 NOT NULL,
    "available" integer GENERATED ALWAYS AS (("quantity" - "reserved")) STORED,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "catalog_inventory_quantity_check" CHECK (("quantity" >= 0)),
    CONSTRAINT "catalog_inventory_reserved_check" CHECK (("reserved" >= 0))
);


ALTER TABLE "public"."catalog_inventory" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."catalog_adjust_inventory"("p_variant_id" "uuid", "p_location_id" "uuid", "p_delta" integer, "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."catalog_inventory"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_row catalog_inventory;
BEGIN
  INSERT INTO catalog_inventory (variant_id, location_id, quantity)
  VALUES (p_variant_id, p_location_id, GREATEST(0, p_delta))
  ON CONFLICT (variant_id, location_id) DO UPDATE
    SET quantity   = catalog_inventory.quantity + p_delta,
        updated_at = NOW()
  WHERE catalog_inventory.quantity + p_delta >= 0
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_NEGATIVE: adjustment would result in negative stock'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_row;
END;
$$;


ALTER FUNCTION "public"."catalog_adjust_inventory"("p_variant_id" "uuid", "p_location_id" "uuid", "p_delta" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."catalog_publicaciones"("p_currency" "text" DEFAULT 'UYU'::"text") RETURNS TABLE("variant_id" "uuid", "item_id" "uuid", "sku" "text", "title" "text", "description" "text", "item_status" "text", "variant_status" "text", "tags" "text"[], "total_available" bigint, "master_price" numeric, "master_currency" "text", "channels" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
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
        select * from resolve_price(v.id, p_currency::char, l.channel)
      ) rp on true
     where l.variant_id = v.id
  ) ch on true

  order by i.updated_at desc;
$$;


ALTER FUNCTION "public"."catalog_publicaciones"("p_currency" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."catalog_publicaciones"("p_currency" "text") IS 'Una fila por variante con canales agregados en jsonb y precio resuelto por canal. security invoker a propósito: el aislamiento por tienda lo hace RLS vía el claim store_id, no esta función.';



CREATE TABLE IF NOT EXISTS "public"."catalog_taxonomy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "path" "public"."ltree" NOT NULL,
    "depth" smallint DEFAULT 0 NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalog_taxonomy" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."catalog_taxonomy_ancestors"("p_path" "public"."ltree", "p_tenant_id" "uuid") RETURNS SETOF "public"."catalog_taxonomy"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT *
  FROM   catalog_taxonomy
  WHERE  tenant_id = p_tenant_id
    AND  path @> p_path
  ORDER  BY depth ASC;
$$;


ALTER FUNCTION "public"."catalog_taxonomy_ancestors"("p_path" "public"."ltree", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."catalog_vidriera"("p_currency" "text" DEFAULT 'UYU'::"text", "p_limit" integer DEFAULT 100, "p_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS TABLE("id" "uuid", "nombre" "text", "descripcion" "text", "tipo" "text", "precio" numeric, "precio_original" numeric, "moneda" "text", "imagen_principal" "text", "imagenes" "jsonb", "videos" "jsonb", "departamento_nombre" "text", "condicion" "text", "stock" bigint, "published_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    select * from resolve_price(v.id, p_currency::char, l.channel)
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


ALTER FUNCTION "public"."catalog_vidriera"("p_currency" "text", "p_limit" integer, "p_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."catalog_vidriera"("p_currency" "text", "p_limit" integer, "p_ids" "uuid"[]) IS 'Vidriera publica. SECURITY DEFINER: RLS de catalog_* exige el claim store_id que un anonimo no tiene, y esta es la unica puerta abierta. p_ids permite resolver productos puntuales (carrito) sin abrir una segunda superficie.';



CREATE OR REPLACE FUNCTION "public"."check_system_integrity"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_paid_sin_items        jsonb;
  v_items_sin_producto    jsonb;
  v_stock_negativo        jsonb;
  v_sold_con_stock        jsonb;
  v_active_sin_stock      jsonb;
  v_total_issues          int := 0;
begin

  -- 1. Ordenes pagadas sin order_items
  select coalesce(jsonb_agg(jsonb_build_object(
    'order_id', o.id,
    'created_at', o.created_at,
    'total_uyu', o.total_uyu
  )), '[]')
  into v_paid_sin_items
  from ordenes o
  where o.estado = 'pagado'
    and not exists (
      select 1 from order_items oi where oi.order_id = o.id
    );

  -- 2. Order items sin producto válido
  select coalesce(jsonb_agg(jsonb_build_object(
    'order_id',   oi.order_id,
    'product_id', oi.product_id,
    'quantity',   oi.quantity
  )), '[]')
  into v_items_sin_producto
  from order_items oi
  where not exists (
    select 1 from productos_market pm where pm.id = oi.product_id
  )
  and not exists (
    select 1 from productos_secondhand ps where ps.id = oi.product_id
  );

  -- 3. Stock negativo
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', id,
    'nombre',     nombre,
    'stock',      stock
  )), '[]')
  into v_stock_negativo
  from productos_market
  where stock < 0;

  -- 4. Productos sold con stock > 0
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', id,
    'nombre',     nombre,
    'stock',      stock,
    'status',     status
  )), '[]')
  into v_sold_con_stock
  from productos_market
  where status = 'sold' and stock > 0;

  -- 5. Productos active con stock = 0
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', id,
    'nombre',     nombre,
    'stock',      stock,
    'status',     status
  )), '[]')
  into v_active_sin_stock
  from productos_market
  where status = 'active' and stock = 0;

  -- Contar issues totales
  v_total_issues :=
    jsonb_array_length(v_paid_sin_items)     +
    jsonb_array_length(v_items_sin_producto)  +
    jsonb_array_length(v_stock_negativo)      +
    jsonb_array_length(v_sold_con_stock)      +
    jsonb_array_length(v_active_sin_stock);

  -- Loggear resultado
  perform log_event(
    'system_integrity_check',
    'system',
    null,
    jsonb_build_object('total_issues', v_total_issues)
  );

  return jsonb_build_object(
    'ok',                    v_total_issues = 0,
    'total_issues',          v_total_issues,
    'paid_sin_items',        v_paid_sin_items,
    'items_sin_producto',    v_items_sin_producto,
    'stock_negativo',        v_stock_negativo,
    'sold_con_stock',        v_sold_con_stock,
    'active_sin_stock',      v_active_sin_stock
  );

end;
$$;


ALTER FUNCTION "public"."check_system_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_payment_net"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.net_amount := NEW.amount - COALESCE(NEW.commission_amount, 0);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."compute_payment_net"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirmar_pago"("p_order_id" "uuid", "p_payment_id" "text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_current_status text;
begin
  -- Verificar si payment_id ya fue procesado (idempotencia global)
  if exists (
    select 1 from ordenes
    where payment_id = p_payment_id
  ) then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'payment_id ya procesado');
  end if;

  -- Obtener estado actual con lock
  select payment_status into v_current_status
  from ordenes
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Orden % no encontrada', p_order_id;
  end if;

  -- Validar transición permitida
  if v_current_status = 'paid' then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'orden ya pagada');
  end if;

  if v_current_status = 'failed' then
    raise exception 'Transición inválida: failed -> paid no permitida';
  end if;

  -- Solo permitir pending_payment -> paid
  if v_current_status != 'pending_payment' then
    raise exception 'Transición inválida: % -> paid', v_current_status;
  end if;

  -- Actualizar orden
  update ordenes
  set
    payment_id     = p_payment_id,
    payment_status = 'paid',
    estado         = 'pagado',
    mp_payment_id  = p_payment_id
  where id = p_order_id;

  -- Registrar webhook procesado
  insert into webhook_events (payment_id, event_type, payload, processed)
  values (p_payment_id, 'payment_confirmed', p_payload, true);

  return jsonb_build_object('ok', true, 'skipped', false, 'order_id', p_order_id);

exception
  when others then raise;
end;
$$;


ALTER FUNCTION "public"."confirmar_pago"("p_order_id" "uuid", "p_payment_id" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."core_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_orden"("p_user_id" "uuid", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_order_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_price numeric;
  v_stock int;
  v_tipo text;
begin
  -- Crear orden inicial
  insert into ordenes (user_id, estado, total_uyu, created_at)
  values (p_user_id, 'pendiente', 0, now())
  returning id into v_order_id;

  -- Procesar cada item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity   := (v_item->>'quantity')::int;
    v_tipo       := v_item->>'tipo';

    if v_quantity <= 0 then
      raise exception 'Cantidad inválida para producto %', v_product_id;
    end if;

    if v_tipo = 'market' then
      -- Obtener precio y stock de market
      select pp.price_oddy, pm.stock
      into v_price, v_stock
      from productos_market pm
      left join product_prices pp on pp.product_id = pm.id
      where pm.id = v_product_id
      for update;

      if not found then
        raise exception 'Producto market % no encontrado', v_product_id;
      end if;

      if v_price is null then
        select precio into v_price from productos_market where id = v_product_id;
      end if;

      if v_stock < v_quantity then
        raise exception 'Stock insuficiente para producto %', v_product_id;
      end if;

      -- Descontar stock atomicamente
      update productos_market set stock = stock - v_quantity where id = v_product_id;

    elsif v_tipo = 'secondhand' then
      -- Verificar que esté activo
      select pp.price_oddy
      into v_price
      from productos_secondhand ps
      left join product_prices pp on pp.product_id = ps.id
      where ps.id = v_product_id and ps.status = 'active'
      for update;

      if not found then
        raise exception 'Producto secondhand % no disponible', v_product_id;
      end if;

      if v_price is null then
        select precio into v_price from productos_secondhand where id = v_product_id;
      end if;

      -- Marcar como vendido
      update productos_secondhand
      set status = 'inactive', estado = 'vendido'
      where id = v_product_id;

    else
      raise exception 'Tipo de producto inválido: %', v_tipo;
    end if;

    -- Insertar order item
    insert into order_items (order_id, product_id, quantity, price)
    values (v_order_id, v_product_id, v_quantity, v_price);

    v_total := v_total + (v_price * v_quantity);
  end loop;

  -- Actualizar total en la orden
  update ordenes set total_uyu = v_total where id = v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'total', v_total);

exception
  when others then
    raise;
end;
$$;


ALTER FUNCTION "public"."crear_orden"("p_user_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_orden_segura"("p_user_id" "uuid", "p_items" "jsonb", "p_nombre" "text", "p_email" "text", "p_telefono" "text" DEFAULT NULL::"text", "p_direccion" "text" DEFAULT NULL::"text", "p_ciudad" "text" DEFAULT NULL::"text", "p_codigo_postal" "text" DEFAULT NULL::"text", "p_tipo_comprador" "text" DEFAULT 'persona'::"text", "p_documento" "text" DEFAULT NULL::"text", "p_razon_social" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'web'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
    SELECT * INTO v_precio_row FROM resolve_price(v_product_id, 'UYU'::char, v_tipo);
    IF v_precio_row.amount IS NOT NULL THEN
      v_price := v_precio_row.amount; v_currency := 'UYU';
    ELSE
      SELECT * INTO v_precio_row FROM resolve_price(v_product_id, 'USD'::char, v_tipo);
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


ALTER FUNCTION "public"."crear_orden_segura"("p_user_id" "uuid", "p_items" "jsonb", "p_nombre" "text", "p_email" "text", "p_telefono" "text", "p_direccion" "text", "p_ciudad" "text", "p_codigo_postal" "text", "p_tipo_comprador" "text", "p_documento" "text", "p_razon_social" "text", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_publicacion"("p_title" "text", "p_price" numeric, "p_currency" "text" DEFAULT 'UYU'::"text", "p_sku" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_stock" integer DEFAULT 0, "p_channels" "text"[] DEFAULT ARRAY['market'::"text"], "p_status" "text" DEFAULT 'draft'::"text", "p_attributes" "jsonb" DEFAULT '{}'::"jsonb", "p_images" "text"[] DEFAULT NULL::"text"[], "p_videos" "text"[] DEFAULT NULL::"text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."crear_publicacion"("p_title" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_description" "text", "p_stock" integer, "p_channels" "text"[], "p_status" "text", "p_attributes" "jsonb", "p_images" "text"[], "p_videos" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."crear_publicacion"("p_title" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_description" "text", "p_stock" integer, "p_channels" "text"[], "p_status" "text", "p_attributes" "jsonb", "p_images" "text"[], "p_videos" "text"[]) IS 'Alta atómica de una publicación multicanal, con media. El tenant sale del claim store_id, nunca de un parámetro.';



CREATE OR REPLACE FUNCTION "public"."create_catalog_node"("p_parent_id" "uuid", "p_name" "text", "p_type" "text", "p_slug" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_id uuid; v_level int := 0; v_slug text;
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  v_slug := coalesce(p_slug, lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')));
  if p_parent_id is not null then
    select level + 1 into v_level from catalog_nodes where id = p_parent_id;
  end if;
  insert into catalog_nodes(name, slug, parent_id, level, type)
  values(p_name, v_slug, p_parent_id, v_level, p_type) returning id into v_id;
  perform log_event('catalog_node_created','catalog_node',v_id,jsonb_build_object('name',p_name,'type',p_type));
  return jsonb_build_object('ok',true,'id',v_id);
end;$$;


ALTER FUNCTION "public"."create_catalog_node"("p_parent_id" "uuid", "p_name" "text", "p_type" "text", "p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id  uuid;
  v_store_id uuid;
  v_claims   jsonb;
begin
  v_user_id := (event ->> 'user_id')::uuid;

  -- Preferimos la tienda marcada por defecto; si no hay, la más antigua.
  select sm.store_id
    into v_store_id
    from public.store_members sm
    join public.stores s on s.id = sm.store_id
   where sm.user_id = v_user_id
     and s.is_active
   order by sm.is_default desc, sm.created_at asc
   limit 1;

  v_claims := event -> 'claims';

  if v_store_id is not null then
    v_claims := jsonb_set(v_claims, '{store_id}', to_jsonb(v_store_id::text));
  else
    -- Sin tienda, se emite explícitamente null en lugar de omitir el claim:
    -- así el token es legible y el caso "usuario sin tienda" se distingue de
    -- "el hook no corrió".
    v_claims := jsonb_set(v_claims, '{store_id}', 'null'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'Custom access token hook: emite el claim store_id que consumen las políticas RLS de catalog_*. Requiere habilitarse en Auth > Hooks.';



CREATE OR REPLACE FUNCTION "public"."delete_catalog_node"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if exists(select 1 from catalog_nodes where parent_id = p_id and is_active = true) then
    raise exception 'No se puede eliminar: tiene hijos activos';
  end if;
  update catalog_nodes set is_active = false where id = p_id;
  perform log_event('catalog_node_deleted','catalog_node',p_id,'{}');
  return jsonb_build_object('ok',true);
end;$$;


ALTER FUNCTION "public"."delete_catalog_node"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."descontar_stock"("p_product_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_stock int;
begin
  -- Lock y verificar stock atomicamente
  select stock into v_stock
  from productos_market
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Producto % no encontrado', p_product_id;
  end if;

  if v_stock < p_quantity then
    raise exception 'Stock insuficiente. Disponible: %, solicitado: %', v_stock, p_quantity;
  end if;

  -- Descontar stock
  update productos_market
  set stock = stock - p_quantity,
      estado = case when stock - p_quantity = 0 then 'agotado' else estado end
  where id = p_product_id;

end;
$$;


ALTER FUNCTION "public"."descontar_stock"("p_product_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."descontar_stock_market"("p_id" "uuid", "cantidad" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update productos_market
  set stock = stock - cantidad
  where id = p_id and stock >= cantidad;
  if not found then
    raise exception 'Stock insuficiente para producto %', p_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."descontar_stock_market"("p_id" "uuid", "cantidad" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_single_default_address"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE addresses SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_single_default_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_ml_stock_update"("p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Solo encolar si el producto tiene ml_item_id
  if exists (
    select 1 from productos_market
    where id = p_product_id and ml_item_id is not null
  ) then
    -- Upsert para evitar duplicados pending
    insert into ml_sync_queue (product_id, action, status)
    values (p_product_id, 'update_stock', 'pending')
    on conflict do nothing;
  end if;
end;
$$;


ALTER FUNCTION "public"."enqueue_ml_stock_update"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_address"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.is_default = true then
    update public.user_addresses
    set is_default = false
    where user_id = new.user_id
      and id <> new.id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."ensure_single_default_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_catalog_tree"("p_parent_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  with recursive tree as (
    select id, name, slug, type, level, position, is_active, image_url, product_id, parent_id
    from catalog_nodes
    where (p_parent_id is null and parent_id is null)
       or parent_id = p_parent_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',         n.id,
      'name',       n.name,
      'slug',       n.slug,
      'type',       n.type,
      'level',      n.level,
      'position',   n.position,
      'is_active',  n.is_active,
      'image_url',  n.image_url,
      'product_id', n.product_id,
      'children',   get_catalog_tree(n.id)
    ) order by n.position, n.name
  ), '[]'::jsonb)
  from tree n
  where n.is_active = true;
$$;


ALTER FUNCTION "public"."get_catalog_tree"("p_parent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ml_category"("p_oddy_category" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_ml_category_id text;
begin
  select ml_category_id into v_ml_category_id
  from ml_category_mapping
  where oddy_category = p_oddy_category;

  if not found then
    raise exception 'Categoría ODDY "%" no tiene mapeo a Mercado Libre', p_oddy_category;
  end if;

  return v_ml_category_id;
end;
$$;


ALTER FUNCTION "public"."get_ml_category"("p_oddy_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ml_token"("p_site_id" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_token text;
BEGIN
  SELECT access_token
  INTO   v_token
  FROM   public.ml_credentials
  WHERE  site_id   = p_site_id
    AND  is_active = true
    AND  error_count < 10                          -- circuit breaker
    AND  expires_at > now() - interval '2 hours'  -- tolera hasta 2h de retraso
  LIMIT 1;

  RETURN v_token;  -- NULL si no hay nada válido
END;
$$;


ALTER FUNCTION "public"."get_ml_token"("p_site_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_mp_token"("p_site_id" "text" DEFAULT 'MLU'::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_token text;
BEGIN
  SELECT access_token
  INTO   v_token
  FROM   public.mp_credentials
  WHERE  site_id   = p_site_id
    AND  is_active = true
    AND  error_count < 10
    AND  expires_at > now() - interval '2 hours'
  LIMIT 1;

  RETURN v_token;
END;
$$;


ALTER FUNCTION "public"."get_mp_token"("p_site_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_order_status"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
declare
  v_order record;
begin
  select id, estado, payment_status, status, currency, source,
         total_uyu, total_usd, created_at, mp_payment_id, paypal_order_id
  into v_order
  from ordenes
  where id = p_order_id;

  if not found then
    raise exception 'Orden % no encontrada', p_order_id;
  end if;

  return jsonb_build_object(
    'order_id',       v_order.id,
    'estado',         v_order.estado,
    'payment_status', v_order.payment_status,
    'status',         v_order.status,
    'currency',       v_order.currency,
    'source',         v_order.source,
    'total_uyu',      v_order.total_uyu,
    'total_usd',      v_order.total_usd,
    'created_at',     v_order.created_at,
    'mp_payment_id',  v_order.mp_payment_id,
    'paypal_order_id', v_order.paypal_order_id
  );
end;
$$;


ALTER FUNCTION "public"."get_order_status"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_payment_status"("p_order_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
declare
  v_status text;
begin
  select payment_status into v_status
  from ordenes
  where id = p_order_id;

  if not found then
    raise exception 'Orden % no encontrada', p_order_id;
  end if;

  return v_status;
end;
$$;


ALTER FUNCTION "public"."get_payment_status"("p_order_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "price" numeric(12,2) NOT NULL,
    "compare_at_price" numeric(12,2),
    "sku" "text",
    "stock" integer DEFAULT 0 NOT NULL,
    "images" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "weight_kg" numeric(8,3),
    "views" integer DEFAULT 0 NOT NULL,
    "search_vector" "tsvector",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "latitude" numeric,
    "longitude" numeric,
    "ml_item_id" "text",
    "ml_status" "text",
    "ml_last_sync" timestamp without time zone,
    "sync_status" "text" DEFAULT 'pending'::"text",
    "type" "text",
    "owner_id" "uuid",
    "title" "text",
    "condition" "text",
    "status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "products_compare_at_price_check" CHECK (("compare_at_price" > (0)::numeric)),
    CONSTRAINT "products_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "products_stock_check" CHECK (("stock" >= 0))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_products_near"("lat" numeric, "lng" numeric, "radius_km" numeric) RETURNS SETOF "public"."products"
    LANGUAGE "sql"
    AS $$
  select *
  from products
  where
    latitude is not null
    and longitude is not null
    and (
      6371 * acos(
        cos(radians(lat)) *
        cos(radians(latitude)) *
        cos(radians(longitude) - radians(lng)) +
        sin(radians(lat)) *
        sin(radians(latitude))
      )
    ) <= radius_km
$$;


ALTER FUNCTION "public"."get_products_near"("lat" numeric, "lng" numeric, "radius_km" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN INSERT INTO public.profiles (id, email, role) VALUES (new.id, new.email, 'buyer') ON CONFLICT (id) DO NOTHING; RETURN new; END; $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid()
       and role in ('admin'::public.app_role, 'superadmin'::public.app_role)
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Autorizacion de admin desde profiles.role, columna server-side protegida por trg_profiles_protect_role. Antes leia raw_user_meta_data, que el propio usuario puede escribir.';



CREATE OR REPLACE FUNCTION "public"."listings_search_vector_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.title,       '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."listings_search_vector_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_event"("p_event_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into audit_logs (event_type, entity_type, entity_id, payload)
  values (p_event_type, p_entity_type, p_entity_id, p_payload);
end;
$$;


ALTER FUNCTION "public"."log_event"("p_event_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."market_checkout_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."market_checkout_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ml_credentials_mark_error"("p_site_id" "text", "p_error" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.ml_credentials
  SET    last_error  = p_error,
         error_count = error_count + 1
  WHERE  site_id     = p_site_id
    AND  is_active   = true;
END;
$$;


ALTER FUNCTION "public"."ml_credentials_mark_error"("p_site_id" "text", "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_catalog_node"("p_node_id" "uuid", "p_new_parent_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_new_level int := 0;
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if p_new_parent_id is not null then
    select level + 1 into v_new_level from catalog_nodes where id = p_new_parent_id;
  end if;
  update catalog_nodes set parent_id = p_new_parent_id, level = v_new_level where id = p_node_id;
  perform log_event('catalog_node_moved','catalog_node',p_node_id,jsonb_build_object('new_parent',p_new_parent_id));
  return jsonb_build_object('ok',true);
end;$$;


ALTER FUNCTION "public"."move_catalog_node"("p_node_id" "uuid", "p_new_parent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mp_credentials_mark_error"("p_site_id" "text", "p_error" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.mp_credentials
  SET    last_error  = p_error,
         error_count = error_count + 1
  WHERE  site_id     = p_site_id
    AND  is_active   = true;
END;
$$;


ALTER FUNCTION "public"."mp_credentials_mark_error"("p_site_id" "text", "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."products_search_vector_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.name,       '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.description,'')), 'B');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."products_search_vector_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profiles_protect_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is null then
      return new;
    end if;
    if exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role in ('admin','superadmin')
    ) then
      return new;
    end if;
    raise exception 'No se puede modificar el rol' using errcode = '42501';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."profiles_protect_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_stock"() RETURNS TABLE("listing_id" "uuid", "variant_id" "uuid", "external_id" "text", "local_stock" integer, "last_known" integer, "discrepancy" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT
    l.id                                                        AS listing_id,
    l.variant_id,
    l.external_id,
    COALESCE(SUM(i.available), 0)::INT                         AS local_stock,
    COALESCE((l.channel_attrs->>'last_known_stock')::INT, -1)  AS last_known,
    COALESCE(SUM(i.available), 0)::INT
      - COALESCE((l.channel_attrs->>'last_known_stock')::INT, 0) AS discrepancy
  FROM  catalog_listings l
  LEFT  JOIN catalog_inventory i ON i.variant_id = l.variant_id
  WHERE l.channel = 'mercadolibre'
    AND l.status  = 'active'
    AND l.external_id IS NOT NULL
  GROUP BY l.id, l.variant_id, l.external_id, l.channel_attrs
  HAVING
    COALESCE(SUM(i.available), 0)::INT
      <> COALESCE((l.channel_attrs->>'last_known_stock')::INT, -1)
  ORDER BY ABS(
    COALESCE(SUM(i.available), 0)::INT
    - COALESCE((l.channel_attrs->>'last_known_stock')::INT, 0)
  ) DESC;
$$;


ALTER FUNCTION "public"."reconcile_stock"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reconcile_stock"() IS 'Detecta discrepancias entre stock local (catalog_inventory) y el último
stock conocido en ML (catalog_listings.channel_attrs->last_known_stock).
Devuelve solo las filas con discrepancia. La reconciliación efectiva
(PUT a ML) es responsabilidad de ml-sync.';



CREATE TABLE IF NOT EXISTS "public"."catalog_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "variant_id" "uuid",
    "channel" "text",
    "price_list" "text",
    "country" "text",
    "currency" "text" NOT NULL,
    "campaign" "text",
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "amount" numeric(12,4) NOT NULL,
    "priority" smallint DEFAULT 0 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "catalog_prices_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "chk_price_period" CHECK ((("valid_from" IS NULL) OR ("valid_until" IS NULL) OR ("valid_from" < "valid_until"))),
    CONSTRAINT "chk_price_scope" CHECK (((("item_id" IS NOT NULL) AND ("variant_id" IS NULL)) OR (("item_id" IS NULL) AND ("variant_id" IS NOT NULL))))
);


ALTER TABLE "public"."catalog_prices" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_price"("p_variant_id" "uuid", "p_currency" character, "p_channel" "text" DEFAULT NULL::"text", "p_price_list" "text" DEFAULT NULL::"text", "p_country" character DEFAULT NULL::"bpchar", "p_campaign" "text" DEFAULT NULL::"text", "p_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "public"."catalog_prices"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_at      TIMESTAMPTZ := COALESCE(p_at, NOW());
  v_item_id UUID;
  v_result  catalog_prices;
BEGIN
  -- Nivel variante (mayor prioridad)
  SELECT cp.*
  INTO   v_result
  FROM   catalog_prices cp
  WHERE  cp.variant_id  = p_variant_id
    AND  cp.currency    = p_currency
    AND  (cp.channel    IS NULL OR cp.channel    = p_channel)
    AND  (cp.price_list IS NULL OR cp.price_list = p_price_list)
    AND  (cp.country    IS NULL OR cp.country    = p_country)
    AND  (cp.campaign   IS NULL OR cp.campaign   = p_campaign)
    AND  (cp.valid_from  IS NULL OR cp.valid_from  <= v_at)
    AND  (cp.valid_until IS NULL OR cp.valid_until >  v_at)
  ORDER BY cp.priority DESC
  LIMIT 1;

  IF FOUND THEN RETURN v_result; END IF;

  -- Fallback: nivel ítem padre
  SELECT item_id INTO v_item_id
  FROM   catalog_variants
  WHERE  id = p_variant_id;

  IF v_item_id IS NULL THEN RETURN NULL; END IF;

  SELECT cp.*
  INTO   v_result
  FROM   catalog_prices cp
  WHERE  cp.item_id     = v_item_id
    AND  cp.currency    = p_currency
    AND  (cp.channel    IS NULL OR cp.channel    = p_channel)
    AND  (cp.price_list IS NULL OR cp.price_list = p_price_list)
    AND  (cp.country    IS NULL OR cp.country    = p_country)
    AND  (cp.campaign   IS NULL OR cp.campaign   = p_campaign)
    AND  (cp.valid_from  IS NULL OR cp.valid_from  <= v_at)
    AND  (cp.valid_until IS NULL OR cp.valid_until >  v_at)
  ORDER BY cp.priority DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."resolve_price"("p_variant_id" "uuid", "p_currency" character, "p_channel" "text", "p_price_list" "text", "p_country" character, "p_campaign" "text", "p_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_price"("p_variant_id" "uuid", "p_currency" character, "p_channel" "text", "p_price_list" "text", "p_country" character, "p_campaign" "text", "p_at" timestamp with time zone) IS 'Resuelve el precio vigente para una variante dado un contexto (canal, lista,
país, moneda, campaña, timestamp). Herencia variant → item. Mayor priority gana.
NULL en dimensiones = wildcard. Devuelve NULL si no hay precio.';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_product_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Solo cambiar a sold cuando llega a 0, nunca revertir automaticamente
  if new.stock = 0 and old.stock > 0 then
    new.status := 'sold';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_product_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_canal_publicacion"("p_variant_id" "uuid", "p_channel" "text", "p_activo" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."toggle_canal_publicacion"("p_variant_id" "uuid", "p_channel" "text", "p_activo" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."toggle_canal_publicacion"("p_variant_id" "uuid", "p_channel" "text", "p_activo" boolean) IS 'Alta/baja de un canal. La baja conserva la fila (delisted) para no perder external_id ni el historial de catalog_sync_log.';



CREATE OR REPLACE FUNCTION "public"."track_event"("p_user_id" "uuid", "p_event_type" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into events (user_id, event_type, metadata)
  values (p_user_id, p_event_type, p_metadata);
end;
$$;


ALTER FUNCTION "public"."track_event"("p_user_id" "uuid", "p_event_type" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_enqueue_ml_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if old.stock is distinct from new.stock and new.ml_item_id is not null then
    perform enqueue_ml_stock_update(new.id);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_enqueue_ml_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_log_order_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  perform log_event(
    'order_created', 'order', new.id,
    jsonb_build_object('user_id', new.user_id, 'total_uyu', new.total_uyu, 'estado', new.estado)
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_log_order_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_log_payment_confirmed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if old.estado is distinct from new.estado and new.estado = 'pagado' then
    perform log_event(
      'payment_confirmed', 'order', new.id,
      jsonb_build_object('mp_payment_id', new.mp_payment_id, 'total_uyu', new.total_uyu)
    );
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_log_payment_confirmed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_log_status_changed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if old.status is distinct from new.status then
    perform log_event(
      'product_status_changed', 'product', new.id,
      jsonb_build_object('status_before', old.status, 'status_after', new.status)
    );
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_log_status_changed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_log_stock_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if old.stock is distinct from new.stock then
    perform log_event(
      'stock_updated', 'product', new.id,
      jsonb_build_object('stock_before', old.stock, 'stock_after', new.stock)
    );
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_log_stock_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_validate_ml_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Bloquear: marcar sold sin cerrar en ML
  if new.status = 'sold' and new.ml_item_id is not null
     and new.ml_status is distinct from 'closed' then
    -- Encolar actualización de status en ML en vez de bloquear
    perform enqueue_ml_stock_update(new.id);
    insert into ml_sync_queue (product_id, action, status)
    values (new.id, 'update_status', 'pending')
    on conflict do nothing;
  end if;

  -- Bloquear stock negativo
  if new.stock < 0 then
    raise exception 'Stock no puede ser negativo para producto %', new.id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_validate_ml_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_validate_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_allowed text[];
begin
  if old.payment_status is not distinct from new.payment_status then
    return new;
  end if;

  v_allowed := case old.payment_status
    when 'pending_payment' then array['paid', 'failed', 'cancelled']
    when 'paid'            then array['refunded']
    when 'failed'          then array['cancelled']
    when 'cancelled'       then array[]::text[]
    when 'refunded'        then array[]::text[]
    else array[]::text[]
  end;

  if not (new.payment_status = any(v_allowed)) then
    raise exception 'Transición de estado inválida: % -> %',
      old.payment_status, new.payment_status;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_validate_status_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_catalog_node"("p_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_image_url" "text" DEFAULT NULL::"text", "p_position" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  update catalog_nodes set
    name      = coalesce(p_name,      name),
    slug      = coalesce(p_slug,      slug),
    is_active = coalesce(p_is_active, is_active),
    image_url = coalesce(p_image_url, image_url),
    position  = coalesce(p_position,  position)
  where id = p_id;
  perform log_event('catalog_node_updated','catalog_node',p_id,'{}');
  return jsonb_build_object('ok',true);
end;$$;


ALTER FUNCTION "public"."update_catalog_node"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_image_url" "text", "p_position" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_current text;
  v_allowed text[];
begin
  -- Obtener estado actual con lock
  select payment_status into v_current
  from ordenes
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Orden % no encontrada', p_order_id;
  end if;

  -- Definir transiciones válidas
  v_allowed := case v_current
    when 'pending_payment' then array['paid', 'failed', 'cancelled']
    when 'paid'            then array['refunded']
    when 'failed'          then array['cancelled']
    when 'cancelled'       then array[]::text[]
    when 'refunded'        then array[]::text[]
    else array[]::text[]
  end;

  -- Validar transición
  if not (p_new_status = any(v_allowed)) then
    raise exception 'Transición inválida: % -> %. Permitidas: %',
      v_current, p_new_status, array_to_string(v_allowed, ', ');
  end if;

  -- Actualizar estado
  update ordenes
  set
    payment_status = p_new_status,
    estado = case p_new_status
      when 'paid'      then 'pagado'
      when 'failed'    then 'fallido'
      when 'cancelled' then 'cancelado'
      when 'refunded'  then 'reembolsado'
      else estado
    end
  where id = p_order_id;

  -- Loggear evento
  perform log_event(
    'order_status_changed',
    'order',
    p_order_id,
    jsonb_build_object(
      'status_before', v_current,
      'status_after',  p_new_status
    )
  );

  return jsonb_build_object(
    'ok',         true,
    'order_id',   p_order_id,
    'from_status', v_current,
    'to_status',   p_new_status
  );

exception
  when others then raise;
end;
$$;


ALTER FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_seller_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE profiles
  SET avg_rating = (SELECT AVG(rating) FROM reviews WHERE reviewed_id = NEW.reviewed_id)
  WHERE id = NEW.reviewed_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_seller_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validar_atributos_articulo"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  attr record;
begin
  for attr in
    select clave
    from categoria_atributos
    where categoria_id = new.categoria_id
    and obligatorio = true
  loop
    if not (new.atributos ? attr.clave) then
      raise exception 'Falta atributo obligatorio: %', attr.clave;
    end if;
  end loop;

  return new;
end;
$$;


ALTER FUNCTION "public"."validar_atributos_articulo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_ml_sync"("p_product_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_producto   record;
  v_prices     record;
  v_issues     jsonb := '[]'::jsonb;
  v_ok         boolean := true;
begin
  -- Obtener producto
  select id, ml_item_id, stock, status, ml_status
  into v_producto
  from productos_market
  where id = p_product_id;

  if not found then
    raise exception 'Producto % no encontrado', p_product_id;
  end if;

  -- Solo validar si tiene ml_item_id
  if v_producto.ml_item_id is null then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'sin ml_item_id');
  end if;

  -- 1. Verificar price_ml configurado
  select price_ml, price_oddy into v_prices
  from product_prices
  where product_id = p_product_id;

  if v_prices.price_ml is null then
    v_issues := v_issues || '"sin price_ml configurado"'::jsonb;
    v_ok := false;
  end if;

  -- 2. Stock nunca negativo
  if v_producto.stock < 0 then
    v_issues := v_issues || '"stock negativo"'::jsonb;
    v_ok := false;
  end if;

  -- 3. Status coherente: sold <-> closed
  if v_producto.status = 'sold' and v_producto.ml_status != 'closed' then
    v_issues := v_issues || '"producto sold pero ml_status no es closed"'::jsonb;
    v_ok := false;
  end if;

  if v_producto.ml_status = 'closed' and v_producto.status != 'sold' then
    v_issues := v_issues || '"ml_status closed pero producto no es sold"'::jsonb;
    v_ok := false;
  end if;

  -- 4. Stock = 0 pero ml_status activo
  if v_producto.stock = 0 and v_producto.ml_status = 'active' then
    v_issues := v_issues || '"stock 0 pero ml_status es active"'::jsonb;
    v_ok := false;
  end if;

  -- Loggear si hay issues
  if not v_ok then
    perform log_event(
      'ml_sync_validation_failed',
      'product',
      p_product_id,
      jsonb_build_object('issues', v_issues)
    );
  end if;

  return jsonb_build_object(
    'ok',         v_ok,
    'product_id', p_product_id,
    'ml_item_id', v_producto.ml_item_id,
    'issues',     v_issues
  );
end;
$$;


ALTER FUNCTION "public"."validate_ml_sync"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vender_secondhand"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update productos_secondhand
  set status = 'inactive', estado = 'vendido'
  where id = p_id and status = 'active';
  if not found then
    raise exception 'Producto % no disponible', p_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."vender_secondhand"("p_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid",
    "entity_id" "uuid",
    "activity_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "owner_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activities_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['call'::"text", 'email'::"text", 'meeting'::"text", 'visit'::"text", 'proposal'::"text", 'demo'::"text", 'follow_up'::"text", 'note'::"text"])))
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."activities" IS 'CORE Rep — actividades de desarrollo comercial';



CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text" DEFAULT 'Casa'::"text" NOT NULL,
    "street" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "postal_code" "text",
    "country" "text" DEFAULT 'UY'::"text" NOT NULL,
    "lat" numeric(9,6),
    "lng" numeric(9,6),
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ml_sync_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "action" "text" DEFAULT 'update_stock'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "retries" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "store_product_id" "uuid",
    CONSTRAINT "ml_sync_queue_action_check" CHECK (("action" = ANY (ARRAY['update_stock'::"text", 'update_price'::"text", 'update_status'::"text"]))),
    CONSTRAINT "ml_sync_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'done'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."ml_sync_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."productos_market" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "precio" numeric DEFAULT 0 NOT NULL,
    "precio_original" numeric,
    "departamento_id" "uuid",
    "departamento_nombre" "text",
    "imagen_principal" "text",
    "imagenes" "text"[],
    "videos" "text"[],
    "vendedor_id" "uuid",
    "rating" numeric DEFAULT 0,
    "rating_count" integer DEFAULT 0,
    "estado" "text" DEFAULT 'activo'::"text",
    "badge" "text",
    "badge_color" "text",
    "published_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "moneda" "text" DEFAULT 'UYU'::"text",
    "stock" integer DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "ml_item_id" "text",
    "ml_status" "text",
    "ml_last_sync" timestamp with time zone,
    "sync_status" "text" DEFAULT 'pending'::"text",
    "latitude" numeric,
    "longitude" numeric,
    "ml_listing_type" "text" DEFAULT 'gold_special'::"text",
    "imagenes_adicionales" "text"[] DEFAULT '{}'::"text"[],
    "ml_permalink" "text",
    "gourmet" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_stock_non_negative" CHECK (("stock" >= 0)),
    CONSTRAINT "productos_market_ml_status_check" CHECK (("ml_status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'closed'::"text"]))),
    CONSTRAINT "productos_market_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'sold'::"text"]))),
    CONSTRAINT "productos_market_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['pending'::"text", 'synced'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."productos_market" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_ml_errors" AS
 SELECT "pm"."id" AS "product_id",
    "pm"."nombre" AS "product_name",
    "pm"."ml_item_id",
    "pm"."sync_status",
    "sq"."action" AS "queue_action",
    "sq"."retries",
    "sq"."updated_at" AS "last_error_at"
   FROM ("public"."productos_market" "pm"
     LEFT JOIN ( SELECT DISTINCT ON ("ml_sync_queue"."product_id") "ml_sync_queue"."product_id",
            "ml_sync_queue"."action",
            "ml_sync_queue"."retries",
            "ml_sync_queue"."updated_at"
           FROM "public"."ml_sync_queue"
          WHERE ("ml_sync_queue"."status" = 'error'::"text")
          ORDER BY "ml_sync_queue"."product_id", "ml_sync_queue"."updated_at" DESC) "sq" ON (("sq"."product_id" = "pm"."id")))
  WHERE (("pm"."sync_status" = 'error'::"text") OR ("sq"."product_id" IS NOT NULL));


ALTER VIEW "public"."admin_ml_errors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "price_oddy" numeric NOT NULL,
    "price_ml" numeric,
    "currency" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "store_product_id" "uuid"
);


ALTER TABLE "public"."product_prices" OWNER TO "postgres";


COMMENT ON COLUMN "public"."product_prices"."product_id" IS 'LEGACY - DO NOT USE IN CHECKOUT';



CREATE OR REPLACE VIEW "public"."admin_products" AS
 SELECT "pm"."id",
    "pm"."nombre" AS "name",
    "pm"."stock",
    "pm"."status",
    "pm"."ml_item_id",
    "pm"."ml_status",
    "pm"."sync_status",
    "pm"."ml_last_sync",
    "pp"."price_oddy",
    "pp"."price_ml",
    "pm"."created_at"
   FROM ("public"."productos_market" "pm"
     LEFT JOIN "public"."product_prices" "pp" ON (("pp"."product_id" = "pm"."id")));


ALTER VIEW "public"."admin_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ordenes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre_cliente" "text",
    "email_cliente" "text",
    "telefono_cliente" "text",
    "direccion_entrega" "text",
    "moneda" "text" DEFAULT 'UYU'::"text",
    "tipo_cambio" numeric,
    "total_uyu" numeric,
    "total_usd" numeric,
    "estado" "text" DEFAULT 'pendiente'::"text",
    "items" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "mp_preference_id" "text",
    "mp_payment_id" "text",
    "payment_id" "text",
    "payment_status" "text" DEFAULT 'pending_payment'::"text",
    "paypal_order_id" "text",
    "status" "text" DEFAULT 'active'::"text",
    "currency" "text" DEFAULT 'UYU'::"text",
    "source" "text" DEFAULT 'oddy'::"text",
    "tipo_comprador" "text" DEFAULT 'persona'::"text" NOT NULL,
    "documento" "text",
    "razon_social" "text",
    "ciudad_entrega" "text",
    "codigo_postal" "text",
    CONSTRAINT "ordenes_currency_check" CHECK (("currency" = ANY (ARRAY['UYU'::"text", 'USD'::"text", 'USDT'::"text"]))),
    CONSTRAINT "ordenes_empresa_requiere_datos" CHECK ((("tipo_comprador" = 'persona'::"text") OR (("razon_social" IS NOT NULL) AND ("documento" ~ '^[0-9]{12}$'::"text")))),
    CONSTRAINT "ordenes_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending_payment'::"text", 'paid'::"text", 'failed'::"text"]))),
    CONSTRAINT "ordenes_source_check" CHECK (("source" = ANY (ARRAY['oddy'::"text", 'mercadopago'::"text", 'paypal'::"text", 'mercadolibre'::"text", 'web'::"text"]))),
    CONSTRAINT "ordenes_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'refunded'::"text"]))),
    CONSTRAINT "ordenes_tipo_comprador_check" CHECK (("tipo_comprador" = ANY (ARRAY['persona'::"text", 'empresa'::"text"])))
);


ALTER TABLE "public"."ordenes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ordenes"."tipo_comprador" IS 'persona | empresa — define si se factura con CI o RUT';



COMMENT ON COLUMN "public"."ordenes"."documento" IS 'CI (persona) o RUT (empresa) del comprador, sin puntos ni guiones';



COMMENT ON COLUMN "public"."ordenes"."razon_social" IS 'Razón social para facturación — solo si tipo_comprador = empresa';



CREATE TABLE IF NOT EXISTS "public"."productos_secondhand" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "precio" numeric DEFAULT 0 NOT NULL,
    "precio_original" numeric,
    "departamento_id" "uuid",
    "departamento_nombre" "text",
    "imagen_principal" "text",
    "imagenes" "text"[],
    "videos" "text"[],
    "vendedor_id" "uuid",
    "rating" numeric DEFAULT 0,
    "rating_count" integer DEFAULT 0,
    "estado" "text" DEFAULT 'activo'::"text",
    "condicion" "text",
    "published_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "moneda" "text" DEFAULT 'UYU'::"text",
    "user_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "latitude" numeric,
    "longitude" numeric,
    CONSTRAINT "productos_secondhand_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."productos_secondhand" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_stats" AS
 SELECT "count"(*) AS "total_orders",
    COALESCE("sum"(
        CASE
            WHEN ("moneda" = 'USD'::"text") THEN "total_usd"
            ELSE "total_uyu"
        END) FILTER (WHERE ("estado" = 'pagado'::"text")), (0)::numeric) AS "revenue_total",
    COALESCE("sum"("total_uyu") FILTER (WHERE ("estado" = 'pagado'::"text")), (0)::numeric) AS "revenue_uyu",
    COALESCE("sum"("total_usd") FILTER (WHERE ("estado" = 'pagado'::"text")), (0)::numeric) AS "revenue_usd",
    "count"(*) FILTER (WHERE ("estado" = 'pagado'::"text")) AS "paid_orders",
    "count"(*) FILTER (WHERE ("estado" = 'pendiente'::"text")) AS "pending_orders",
    ( SELECT "count"(*) AS "count"
           FROM "public"."productos_market"
          WHERE ("productos_market"."status" = 'active'::"text")) AS "active_products",
    ( SELECT "count"(*) AS "count"
           FROM "public"."productos_market"
          WHERE (("productos_market"."stock" = 0) OR ("productos_market"."status" = 'sold'::"text"))) AS "out_of_stock",
    ( SELECT "count"(*) AS "count"
           FROM "public"."productos_market"
          WHERE (("productos_market"."ml_item_id" IS NOT NULL) AND ("productos_market"."ml_status" = 'active'::"text"))) AS "ml_active",
    ( SELECT "count"(*) AS "count"
           FROM "public"."productos_market"
          WHERE ("productos_market"."sync_status" = 'error'::"text")) AS "ml_sync_errors",
    ( SELECT "count"(*) AS "count"
           FROM "public"."productos_secondhand"
          WHERE ("productos_secondhand"."status" = 'active'::"text")) AS "sh_active_products"
   FROM "public"."ordenes";


ALTER VIEW "public"."admin_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_vault" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "type" "text" DEFAULT 'api_key'::"text" NOT NULL,
    "value" "text" NOT NULL,
    "env" "text" DEFAULT 'production'::"text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "notes" "text",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."api_vault" OWNER TO "postgres";


COMMENT ON COLUMN "public"."api_vault"."tenant_id" IS 'Tienda/tenant propietario de la credencial. NULL = credencial global (fallback). Reemplaza el patrón anterior de codificar store:<uuid> dentro de tags.';



CREATE TABLE IF NOT EXISTS "public"."articulo_variantes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "articulo_id" "uuid" NOT NULL,
    "sku" "text" NOT NULL,
    "nombre" "text",
    "precio" numeric(12,2) NOT NULL,
    "precio_original" numeric(12,2),
    "moneda" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "stock_ilimitado" boolean DEFAULT false NOT NULL,
    "imagen_principal" "text",
    "atributos" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "peso_kg" numeric(8,3),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "articulo_variantes_precio_check" CHECK (("precio" >= (0)::numeric)),
    CONSTRAINT "articulo_variantes_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'inactive'::"text"]))),
    CONSTRAINT "articulo_variantes_stock_check" CHECK (("stock" >= 0))
);


ALTER TABLE "public"."articulo_variantes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."articulos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "vendedor_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "slug" "text",
    "precio" numeric(12,2) DEFAULT 0 NOT NULL,
    "precio_original" numeric(12,2),
    "moneda" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "permite_descuento" boolean DEFAULT true NOT NULL,
    "imagen_principal" "text",
    "imagenes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "videos" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "departamento_id" "uuid",
    "departamento_nombre" "text",
    "categoria_id" "uuid",
    "categoria_nombre" "text",
    "subcategoria_id" "uuid",
    "atributos" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "condicion" "text",
    "stock" integer DEFAULT 1 NOT NULL,
    "stock_ilimitado" boolean DEFAULT false NOT NULL,
    "sku" "text",
    "peso_kg" numeric(8,3),
    "alto_cm" numeric(8,2),
    "ancho_cm" numeric(8,2),
    "largo_cm" numeric(8,2),
    "envio_tipo" "text" DEFAULT 'retiro'::"text" NOT NULL,
    "costo_envio" numeric(10,2),
    "envio_gratis" boolean DEFAULT false NOT NULL,
    "retiro_persona" boolean DEFAULT true NOT NULL,
    "formato_venta" "text" DEFAULT 'unidad'::"text" NOT NULL,
    "cantidad_por_pack" smallint DEFAULT 1,
    "garantia_tipo" "text",
    "garantia_meses" smallint,
    "impresiones" integer DEFAULT 0 NOT NULL,
    "clicks" integer DEFAULT 0 NOT NULL,
    "ventas_count" integer DEFAULT 0 NOT NULL,
    "ctr" numeric(8,6) DEFAULT 0,
    "conversion_rate" numeric(8,6) DEFAULT 0,
    "precio_score" numeric(8,6) DEFAULT 0,
    "stock_score" numeric(4,3) DEFAULT 0,
    "freshness_score" numeric(4,3) DEFAULT 0,
    "tipo_boost" numeric(4,3) DEFAULT 1,
    "margen" numeric(8,6) DEFAULT 0,
    "ranking_score" numeric(10,8) DEFAULT 0,
    "ranking_updated_at" timestamp with time zone DEFAULT "now"(),
    "favoritos" integer DEFAULT 0 NOT NULL,
    "rating_promedio" numeric(3,2),
    "rating_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "articulos_condicion_check" CHECK (("condicion" = ANY (ARRAY['Nuevo'::"text", 'Excelente'::"text", 'Muy bueno'::"text", 'Bueno'::"text", 'Regular'::"text", 'Para reparar'::"text"]))),
    CONSTRAINT "articulos_moneda_check" CHECK (("moneda" = ANY (ARRAY['UYU'::"text", 'USD'::"text", 'EUR'::"text"]))),
    CONSTRAINT "articulos_nombre_check" CHECK ((("char_length"("nombre") >= 4) AND ("char_length"("nombre") <= 120))),
    CONSTRAINT "articulos_precio_check" CHECK (("precio" >= (0)::numeric)),
    CONSTRAINT "articulos_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'paused'::"text", 'inactive'::"text", 'deleted'::"text"]))),
    CONSTRAINT "articulos_stock_check" CHECK (("stock" >= 0)),
    CONSTRAINT "articulos_tipo_check" CHECK (("tipo" = ANY (ARRAY['market'::"text", 'secondhand'::"text"])))
);


ALTER TABLE "public"."articulos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."articulos_con_variantes" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "nombre",
    NULL::"text" AS "tipo",
    NULL::"text" AS "status",
    NULL::numeric(12,2) AS "precio_base",
    NULL::"text" AS "moneda",
    NULL::"text" AS "departamento_nombre",
    NULL::"text" AS "categoria_nombre",
    NULL::"text" AS "imagen_principal",
    NULL::"uuid" AS "vendedor_id",
    NULL::bigint AS "total_variantes",
    NULL::bigint AS "stock_total",
    NULL::numeric AS "precio_desde",
    NULL::numeric AS "precio_hasta";


ALTER VIEW "public"."articulos_con_variantes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_distributors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "distributor_id" "uuid" NOT NULL,
    "country_code" character(2),
    "channel_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "contract_start" "date",
    "contract_end" "date",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."brand_distributors" OWNER TO "postgres";


COMMENT ON TABLE "public"."brand_distributors" IS 'CORE Rep — relación marca-distribuidor';



CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid",
    "name" "text" NOT NULL,
    "country_origin" character(2),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "brands_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


COMMENT ON TABLE "public"."brands" IS 'CORE Foundation — marcas representadas por CORE Rep';



CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "campaign_type" "text" NOT NULL,
    "discount_type" "text",
    "discount_value" numeric,
    "platform_id" "uuid",
    "territory_id" "uuid",
    "country_code" character(3),
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "time_from" time without time zone,
    "time_until" time without time zone,
    "days_of_week" integer[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "campaigns_campaign_type_check" CHECK (("campaign_type" = ANY (ARRAY['discount'::"text", 'fixed_price'::"text", 'promotion'::"text", 'liquidation'::"text", 'seasonal'::"text", 'flash'::"text", 'loyalty'::"text", 'wholesale'::"text", 'custom'::"text"]))),
    CONSTRAINT "campaigns_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text", 'none'::"text"]))),
    CONSTRAINT "campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carrito" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid",
    "sesion_id" "text",
    "producto_id" "text",
    "producto_tipo" "text" NOT NULL,
    "cantidad" integer DEFAULT 1 NOT NULL,
    "precio_unitario" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "moneda" "text" DEFAULT 'UYU'::"text",
    "store_product_id" "uuid",
    CONSTRAINT "carrito_producto_tipo_check" CHECK (("producto_tipo" = ANY (ARRAY['market'::"text", 'secondhand'::"text"]))),
    CONSTRAINT "chk_carrito_has_any_product" CHECK ((("producto_id" IS NOT NULL) OR ("store_product_id" IS NOT NULL)))
);


ALTER TABLE "public"."carrito" OWNER TO "postgres";


COMMENT ON COLUMN "public"."carrito"."producto_id" IS 'LEGACY - REQUIERE RESOLUCION EN BACKEND';



COMMENT ON COLUMN "public"."carrito"."producto_tipo" IS 'LEGACY - NO USAR EN NUEVO CHECKOUT';



CREATE OR REPLACE VIEW "public"."carrito_detalle" AS
 SELECT "c"."id",
    "c"."usuario_id",
    "c"."sesion_id",
    "c"."producto_id",
    "c"."producto_tipo",
    "c"."cantidad",
    "c"."precio_unitario",
    "c"."moneda",
    "c"."created_at",
    "c"."updated_at",
    ("p"."id")::"text" AS "producto_real_id",
    COALESCE("p"."name", "p"."title") AS "nombre",
        CASE
            WHEN (("p"."images" IS NOT NULL) AND ("array_length"("p"."images", 1) > 0)) THEN "p"."images"[1]
            ELSE NULL::"text"
        END AS "imagen"
   FROM ("public"."carrito" "c"
     LEFT JOIN "public"."products" "p" ON ((("c"."producto_tipo" = 'market'::"text") AND ("c"."producto_id" = ("p"."id")::"text"))))
UNION ALL
 SELECT "c"."id",
    "c"."usuario_id",
    "c"."sesion_id",
    "c"."producto_id",
    "c"."producto_tipo",
    "c"."cantidad",
    "c"."precio_unitario",
    "c"."moneda",
    "c"."created_at",
    "c"."updated_at",
    ("s"."id")::"text" AS "producto_real_id",
    "s"."nombre",
    "s"."imagen_principal" AS "imagen"
   FROM ("public"."carrito" "c"
     LEFT JOIN "public"."productos_secondhand" "s" ON ((("c"."producto_tipo" = 'secondhand'::"text") AND ("c"."producto_id" = ("s"."id")::"text"))));


ALTER VIEW "public"."carrito_detalle" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "store_product_id" "uuid",
    "quantity" integer,
    "price_snapshot" numeric,
    "currency" "text",
    "created_at" timestamp without time zone,
    CONSTRAINT "chk_cart_store_product" CHECK (("store_product_id" IS NOT NULL))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "emitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalog_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "taxonomy_node_id" "uuid",
    "brand_id" "uuid",
    "sku_prefix" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."catalog_item_status" DEFAULT 'draft'::"public"."catalog_item_status" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalog_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "external_id" "text",
    "status" "public"."catalog_listing_status" DEFAULT 'pending'::"public"."catalog_listing_status" NOT NULL,
    "channel_attrs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_error" "text",
    "synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalog_listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'warehouse'::"text" NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalog_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "url" "text" NOT NULL,
    "type" "public"."catalog_media_type" DEFAULT 'image'::"public"."catalog_media_type" NOT NULL,
    "alt_text" "text",
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalog_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "parent_id" "uuid",
    "level" integer DEFAULT 0 NOT NULL,
    "type" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "position" integer DEFAULT 0,
    "image_url" "text",
    "product_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "catalog_nodes_type_check" CHECK (("type" = ANY (ARRAY['department'::"text", 'category'::"text", 'subcategory'::"text", 'node'::"text", 'product'::"text"]))),
    CONSTRAINT "no_self_reference" CHECK (("id" <> "parent_id"))
);


ALTER TABLE "public"."catalog_nodes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "action" "public"."catalog_sync_action" NOT NULL,
    "result" "public"."catalog_sync_result" NOT NULL,
    "http_status" smallint,
    "payload" "jsonb",
    "response" "jsonb",
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalog_sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "sku" "text" NOT NULL,
    "barcode" "text",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "compare_price" numeric(12,2),
    "cost_price" numeric(12,2),
    "weight_g" numeric(10,2),
    "status" "public"."catalog_variant_status" DEFAULT 'active'::"public"."catalog_variant_status" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalog_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categoria_atributo_opciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "atributo_id" "uuid",
    "valor" "text" NOT NULL,
    "orden" integer DEFAULT 0
);


ALTER TABLE "public"."categoria_atributo_opciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categoria_atributos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "categoria_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "clave" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "obligatorio" boolean DEFAULT false,
    "multiple" boolean DEFAULT false,
    "unidad" "text",
    "orden" integer DEFAULT 0,
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "categoria_atributos_tipo_check" CHECK (("tipo" = ANY (ARRAY['text'::"text", 'number'::"text", 'boolean'::"text", 'select'::"text", 'multiselect'::"text"])))
);


ALTER TABLE "public"."categoria_atributos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categorias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "departamento_id" "uuid",
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true,
    "orden" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."categorias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "channel_type" "text" NOT NULL,
    "country_code" character(2),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "channels_channel_type_check" CHECK (("channel_type" = ANY (ARRAY['retail'::"text", 'horeca'::"text", 'gourmet'::"text", 'wholesale'::"text", 'ecommerce'::"text", 'pharmacy'::"text", 'specialty'::"text", 'export'::"text"])))
);


ALTER TABLE "public"."channels" OWNER TO "postgres";


COMMENT ON TABLE "public"."channels" IS 'CORE Rep — canales de distribución';



CREATE TABLE IF NOT EXISTS "public"."checkout_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checkout_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "seller_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(14,2) NOT NULL,
    "subtotal" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checkout_items_currency_check" CHECK (("currency" = ANY (ARRAY['UYU'::"text", 'USD'::"text"]))),
    CONSTRAINT "checkout_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "checkout_items_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "checkout_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."checkout_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "subtotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "shipping_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "discount_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "platform_fee" numeric(14,2) DEFAULT 0 NOT NULL,
    "total" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_provider" "text",
    "payment_reference" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checkouts_currency_check" CHECK (("currency" = ANY (ARRAY['UYU'::"text", 'USD'::"text"]))),
    CONSTRAINT "checkouts_discount_total_check" CHECK (("discount_total" >= (0)::numeric)),
    CONSTRAINT "checkouts_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'authorized'::"text", 'paid'::"text", 'partially_refunded'::"text", 'refunded'::"text", 'failed'::"text"]))),
    CONSTRAINT "checkouts_platform_fee_check" CHECK (("platform_fee" >= (0)::numeric)),
    CONSTRAINT "checkouts_shipping_total_check" CHECK (("shipping_total" >= (0)::numeric)),
    CONSTRAINT "checkouts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'paid'::"text", 'partially_paid'::"text", 'failed'::"text", 'cancelled'::"text", 'refunded'::"text", 'completed'::"text"]))),
    CONSTRAINT "checkouts_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "checkouts_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."checkouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "core_services_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'beta'::"text", 'planned'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."core_services" OWNER TO "postgres";


COMMENT ON TABLE "public"."core_services" IS 'CORE Foundation — verticales del ecosistema CORE';



CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iso_code" character(2) NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "countries_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


COMMENT ON TABLE "public"."countries" IS 'CORE Foundation — países activos del ecosistema';



CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" character(3) NOT NULL,
    "name" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "decimals" smallint DEFAULT 2 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "currencies_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."currencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "color" "text" DEFAULT '#C8C4BE'::"text",
    "orden" integer,
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "acepta_usd" boolean DEFAULT false,
    "moneda_default" "text" DEFAULT 'UYU'::"text"
);


ALTER TABLE "public"."departamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."distributors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid",
    "name" "text" NOT NULL,
    "country_code" character(2),
    "channel_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "distributors_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'prospect'::"text"])))
);


ALTER TABLE "public"."distributors" OWNER TO "postgres";


COMMENT ON TABLE "public"."distributors" IS 'CORE Rep — distribuidores por país y canal';



CREATE TABLE IF NOT EXISTS "public"."entities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "legal_name" "text",
    "tax_id" "text",
    "country_code" character(2),
    "entity_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "entities_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['core'::"text", 'brand_owner'::"text", 'manufacturer'::"text", 'importer'::"text", 'exporter'::"text", 'distributor'::"text", 'retailer'::"text", 'logistics_operator'::"text", 'customer'::"text", 'supplier'::"text"]))),
    CONSTRAINT "entities_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."entities" OWNER TO "postgres";


COMMENT ON TABLE "public"."entities" IS 'CORE Foundation — empresas y organizaciones del ecosistema';



CREATE TABLE IF NOT EXISTS "public"."entity_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'enabled'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "entity_services_status_check" CHECK (("status" = ANY (ARRAY['enabled'::"text", 'disabled'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."entity_services" OWNER TO "postgres";


COMMENT ON TABLE "public"."entity_services" IS 'CORE Foundation — servicios habilitados por entidad';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "events_event_type_check" CHECK (("event_type" = ANY (ARRAY['view_product'::"text", 'add_to_cart'::"text", 'checkout_started'::"text", 'purchase_completed'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_rate_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "url" "text",
    "api_key" "text",
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exchange_rate_sources_source_type_check" CHECK (("source_type" = ANY (ARRAY['manual'::"text", 'api'::"text", 'bank'::"text", 'central_bank'::"text", 'custom'::"text"]))),
    CONSTRAINT "exchange_rate_sources_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."exchange_rate_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_id" "uuid" NOT NULL,
    "from_currency" character(3) NOT NULL,
    "to_currency" character(3) NOT NULL,
    "rate" numeric NOT NULL,
    "valid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "listing_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "store_product_id" "uuid",
    CONSTRAINT "favorites_check" CHECK ((("product_id" IS NOT NULL) OR ("listing_id" IS NOT NULL)))
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


COMMENT ON COLUMN "public"."favorites"."product_id" IS 'LEGACY - DO NOT USE IN CHECKOUT';



CREATE TABLE IF NOT EXISTS "public"."hs_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "section" "text",
    "chapter" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hs_codes" OWNER TO "postgres";


COMMENT ON TABLE "public"."hs_codes" IS 'CORE Trade Engine — códigos arancelarios HS';



CREATE TABLE IF NOT EXISTS "public"."inventory_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_item_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "reservado" integer DEFAULT 0 NOT NULL,
    "condicion" "text" DEFAULT 'AVAILABLE'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_locations_condicion_check" CHECK (("condicion" = ANY (ARRAY['AVAILABLE'::"text", 'DAMAGED'::"text", 'IN_REPAIR'::"text", 'RESERVED'::"text"]))),
    CONSTRAINT "inventory_locations_reservado_check" CHECK (("reservado" >= 0)),
    CONSTRAINT "inventory_locations_stock_check" CHECK (("stock" >= 0))
);


ALTER TABLE "public"."inventory_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_movement_types" (
    "id" integer NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "direccion" "text" NOT NULL,
    "afecta_stock" boolean DEFAULT true NOT NULL,
    CONSTRAINT "inventory_movement_types_direccion_check" CHECK (("direccion" = ANY (ARRAY['IN'::"text", 'OUT'::"text", 'NONE'::"text"])))
);


ALTER TABLE "public"."inventory_movement_types" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."inventory_movement_types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_movement_types_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_movement_types_id_seq" OWNED BY "public"."inventory_movement_types"."id";



CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "movement_type_id" integer NOT NULL,
    "cantidad" integer NOT NULL,
    "stock_antes" integer,
    "stock_despues" integer,
    "condicion" "text" DEFAULT 'AVAILABLE'::"text" NOT NULL,
    "referencia" "text",
    "notas" "text",
    "usuario_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_movements_cantidad_check" CHECK (("cantidad" > 0)),
    CONSTRAINT "inventory_movements_condicion_check" CHECK (("condicion" = ANY (ARRAY['AVAILABLE'::"text", 'DAMAGED'::"text", 'IN_REPAIR'::"text", 'RESERVED'::"text"])))
);


ALTER TABLE "public"."inventory_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."languages" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "native_name" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "languages_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."languages" OWNER TO "postgres";


COMMENT ON TABLE "public"."languages" IS 'CORE i18n — idiomas soportados sin límite';



CREATE TABLE IF NOT EXISTS "public"."market_checkouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "subtotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "shipping_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "discount_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "total" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_provider" "text",
    "payment_reference" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "market_checkouts_currency_check" CHECK (("currency" = ANY (ARRAY['UYU'::"text", 'USD'::"text"]))),
    CONSTRAINT "market_checkouts_discount_total_check" CHECK (("discount_total" >= (0)::numeric)),
    CONSTRAINT "market_checkouts_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'authorized'::"text", 'paid'::"text", 'partially_refunded'::"text", 'refunded'::"text", 'failed'::"text"]))),
    CONSTRAINT "market_checkouts_shipping_total_check" CHECK (("shipping_total" >= (0)::numeric)),
    CONSTRAINT "market_checkouts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'paid'::"text", 'partially_paid'::"text", 'failed'::"text", 'cancelled'::"text", 'refunded'::"text", 'completed'::"text"]))),
    CONSTRAINT "market_checkouts_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "market_checkouts_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."market_checkouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_library" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bucket" "text" NOT NULL,
    "path" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "nombre" "text",
    "size_bytes" bigint,
    "width" integer,
    "height" integer,
    "duracion_seg" integer,
    "thumbnail_path" "text",
    "status" "text" DEFAULT 'ready'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "categoria" "text" DEFAULT 'articulo'::"text" NOT NULL,
    "etiquetas" "text"[] DEFAULT '{}'::"text"[],
    "venta_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "media_library_categoria_check" CHECK (("categoria" = ANY (ARRAY['articulo'::"text", 'documento'::"text", 'otro'::"text", 'producto'::"text", 'venta'::"text"]))),
    CONSTRAINT "media_library_status_check" CHECK (("status" = ANY (ARRAY['uploading'::"text", 'ready'::"text", 'failed'::"text"]))),
    CONSTRAINT "media_library_tipo_check" CHECK (("tipo" = ANY (ARRAY['imagen'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."media_library" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid",
    "activity_id" "uuid",
    "title" "text" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "duration_min" integer DEFAULT 60,
    "location" "text",
    "meeting_type" "text" DEFAULT 'virtual'::"text" NOT NULL,
    "attendees" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text",
    "outcome" "text",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "meetings_meeting_type_check" CHECK (("meeting_type" = ANY (ARRAY['virtual'::"text", 'in_person'::"text", 'phone'::"text"]))),
    CONSTRAINT "meetings_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'completed'::"text", 'cancelled'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


COMMENT ON TABLE "public"."meetings" IS 'CORE Rep — reuniones y visitas';



CREATE TABLE IF NOT EXISTS "public"."ml_category_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "oddy_category" "text" NOT NULL,
    "ml_category_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ml_category_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ml_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "text" NOT NULL,
    "app_id" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "token_type" "text" DEFAULT 'Bearer'::"text" NOT NULL,
    "scope" "text",
    "ml_user_id" bigint,
    "ml_nickname" "text",
    "connected_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_refresh_at" timestamp with time zone,
    "last_error" "text",
    "error_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ml_credentials" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ml_credentials_status" AS
 SELECT "id",
    "site_id",
    "app_id",
    "ml_user_id",
    "ml_nickname",
    "is_active",
    "expires_at",
    "last_refresh_at",
    "last_error",
    "error_count",
    "created_at",
    "updated_at",
    (("expires_at" - "now"()) < '00:30:00'::interval) AS "expiring_soon",
    ("expires_at" < "now"()) AS "is_expired"
   FROM "public"."ml_credentials";


ALTER VIEW "public"."ml_credentials_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ml_listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "ml_item_id" "text" NOT NULL,
    "status" "text",
    "price" numeric,
    "last_sync" timestamp with time zone,
    "raw_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "store_product_id" "uuid"
);


ALTER TABLE "public"."ml_listings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ml_listings"."product_id" IS 'LEGACY - DO NOT USE IN CHECKOUT';



CREATE TABLE IF NOT EXISTS "public"."ml_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text" NOT NULL,
    "topic" "text",
    "resource" "text",
    "payload" "jsonb",
    "processed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ml_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mp_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "text" DEFAULT 'MLU'::"text" NOT NULL,
    "app_id" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "public_key" "text",
    "token_type" "text" DEFAULT 'Bearer'::"text" NOT NULL,
    "mp_user_id" bigint,
    "mp_nickname" "text",
    "connected_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_refresh_at" timestamp with time zone,
    "last_error" "text",
    "error_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mp_credentials" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mp_credentials_status" AS
 SELECT "id",
    "site_id",
    "app_id",
    "mp_user_id",
    "mp_nickname",
    "is_active",
    "expires_at",
    "last_refresh_at",
    "last_error",
    "error_count",
    "created_at",
    "updated_at",
    (("expires_at" - "now"()) < '00:30:00'::interval) AS "expiring_soon",
    ("expires_at" < "now"()) AS "is_expired"
   FROM "public"."mp_credentials";


ALTER VIEW "public"."mp_credentials_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "data" "jsonb",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opportunities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid",
    "entity_id" "uuid",
    "channel_id" "uuid",
    "country_code" character(2),
    "title" "text" NOT NULL,
    "stage" "text" DEFAULT 'prospect'::"text" NOT NULL,
    "estimated_value" numeric,
    "currency" character(3) DEFAULT 'USD'::"bpchar",
    "owner_id" "uuid",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    CONSTRAINT "opportunities_stage_check" CHECK (("stage" = ANY (ARRAY['prospect'::"text", 'qualified'::"text", 'proposal'::"text", 'negotiation'::"text", 'closed_won'::"text", 'closed_lost'::"text"])))
);


ALTER TABLE "public"."opportunities" OWNER TO "postgres";


COMMENT ON TABLE "public"."opportunities" IS 'CORE Rep — oportunidades comerciales';



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "listing_id" "uuid",
    "name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "total_price" numeric(12,2) NOT NULL,
    "snapshot" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "store_product_id" "uuid",
    CONSTRAINT "chk_order_items_no_product_id" CHECK (("product_id" IS NULL)),
    CONSTRAINT "chk_order_items_store_product" CHECK ((("store_product_id" IS NOT NULL) OR ("store_product_id" IS NULL))),
    CONSTRAINT "chk_order_items_store_product_required" CHECK (("store_product_id" IS NOT NULL)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status" NOT NULL,
    "subtotal" numeric(12,2) NOT NULL,
    "shipping_cost" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) NOT NULL,
    "shipping_address_id" "uuid",
    "tracking_code" "text",
    "notes" "text",
    "commission_pct" numeric(5,4) DEFAULT 0.05 NOT NULL,
    "commission_amount" numeric(12,2),
    "cancelled_at" timestamp with time zone,
    "cancel_reason" "text",
    "estimated_delivery" "date",
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "currency" "text" DEFAULT 'UYU'::"text",
    "ml_order_id" "text",
    "checkout_id" "uuid"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "provider" "public"."payment_provider" NOT NULL,
    "provider_payment_id" "text",
    "provider_preference_id" "text",
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "commission_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "net_amount" numeric(12,2),
    "metadata" "jsonb",
    "webhook_verified" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "phone" "text",
    "role" "public"."app_role" DEFAULT 'buyer'::"public"."app_role" NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "bio" "text",
    "total_sales" integer DEFAULT 0 NOT NULL,
    "avg_rating" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."orders_with_details" AS
 SELECT "o"."id",
    "o"."buyer_id",
    "o"."seller_id",
    "o"."status",
    "o"."subtotal",
    "o"."shipping_cost",
    "o"."discount",
    "o"."total",
    "o"."shipping_address_id",
    "o"."tracking_code",
    "o"."notes",
    "o"."commission_pct",
    "o"."commission_amount",
    "o"."cancelled_at",
    "o"."cancel_reason",
    "o"."estimated_delivery",
    "o"."delivered_at",
    "o"."created_at",
    "o"."updated_at",
    "b"."full_name" AS "buyer_name",
    "b"."email" AS "buyer_email",
    "s"."full_name" AS "seller_name",
    "s"."email" AS "seller_email",
    "p"."status" AS "payment_status",
    "p"."provider",
    "p"."amount" AS "paid_amount"
   FROM ((("public"."orders" "o"
     LEFT JOIN "public"."profiles" "b" ON (("b"."id" = "o"."buyer_id")))
     LEFT JOIN "public"."profiles" "s" ON (("s"."id" = "o"."seller_id")))
     LEFT JOIN "public"."payments" "p" ON (("p"."order_id" = "o"."id")));


ALTER VIEW "public"."orders_with_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checkout_id" "uuid" NOT NULL,
    "seller_order_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "gross_amount" numeric(14,2) NOT NULL,
    "platform_fee" numeric(14,2) DEFAULT 0 NOT NULL,
    "seller_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "released_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_allocations_currency_check" CHECK (("currency" = ANY (ARRAY['UYU'::"text", 'USD'::"text"]))),
    CONSTRAINT "payment_allocations_gross_amount_check" CHECK (("gross_amount" >= (0)::numeric)),
    CONSTRAINT "payment_allocations_platform_fee_check" CHECK (("platform_fee" >= (0)::numeric)),
    CONSTRAINT "payment_allocations_seller_amount_check" CHECK (("seller_amount" >= (0)::numeric)),
    CONSTRAINT "payment_allocations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'authorized'::"text", 'paid'::"text", 'released'::"text", 'refunded'::"text", 'partially_refunded'::"text"])))
);


ALTER TABLE "public"."payment_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platforms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "platform_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "platforms_platform_type_check" CHECK (("platform_type" = ANY (ARRAY['core_market'::"text", 'marketplace'::"text", 'ecommerce'::"text", 'wholesale'::"text", 'retail'::"text", 'custom'::"text"]))),
    CONSTRAINT "platforms_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."platforms" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."revenue_by_day" AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "day",
    "count"(*) AS "order_count",
    "sum"("total") AS "revenue",
    "sum"("commission_amount") AS "commission"
   FROM "public"."orders"
  WHERE ("status" <> ALL (ARRAY['cancelled'::"public"."order_status", 'refunded'::"public"."order_status"]))
  GROUP BY ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC;


ALTER VIEW "public"."revenue_by_day" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "reviewed_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "listing_id" "uuid",
    "rating" smallint NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "store_product_id" "uuid",
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


COMMENT ON COLUMN "public"."reviews"."product_id" IS 'LEGACY - DO NOT USE IN CHECKOUT';



CREATE TABLE IF NOT EXISTS "public"."seller_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_order_id" "uuid" NOT NULL,
    "checkout_item_id" "uuid",
    "product_id" "uuid",
    "title" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(14,2) NOT NULL,
    "subtotal" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "seller_order_items_currency_check" CHECK (("currency" = ANY (ARRAY['UYU'::"text", 'USD'::"text"]))),
    CONSTRAINT "seller_order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "seller_order_items_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "seller_order_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."seller_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seller_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checkout_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "seller_order_number" bigint NOT NULL,
    "currency" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "subtotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "shipping_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "platform_fee" numeric(14,2) DEFAULT 0 NOT NULL,
    "seller_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "total" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "fulfillment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "seller_orders_currency_check" CHECK (("currency" = ANY (ARRAY['UYU'::"text", 'USD'::"text"]))),
    CONSTRAINT "seller_orders_fulfillment_status_check" CHECK (("fulfillment_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'ready'::"text", 'shipped'::"text", 'delivered'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "seller_orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'partially_refunded'::"text", 'refunded'::"text"]))),
    CONSTRAINT "seller_orders_platform_fee_check" CHECK (("platform_fee" >= (0)::numeric)),
    CONSTRAINT "seller_orders_seller_amount_check" CHECK (("seller_amount" >= (0)::numeric)),
    CONSTRAINT "seller_orders_shipping_amount_check" CHECK (("shipping_amount" >= (0)::numeric)),
    CONSTRAINT "seller_orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'processing'::"text", 'ready'::"text", 'shipped'::"text", 'delivered'::"text", 'cancelled'::"text", 'refunded'::"text", 'completed'::"text"]))),
    CONSTRAINT "seller_orders_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "seller_orders_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."seller_orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."seller_orders_seller_order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."seller_orders_seller_order_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."seller_orders_seller_order_number_seq" OWNED BY "public"."seller_orders"."seller_order_number";



CREATE TABLE IF NOT EXISTS "public"."seller_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "seller_order_id" "uuid" NOT NULL,
    "payment_allocation_id" "uuid",
    "gross_amount" numeric(14,2) NOT NULL,
    "platform_fee" numeric(14,2) DEFAULT 0 NOT NULL,
    "net_amount" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'UYU'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "payout_reference" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "seller_payouts_currency_check" CHECK (("currency" = ANY (ARRAY['UYU'::"text", 'USD'::"text"]))),
    CONSTRAINT "seller_payouts_gross_amount_check" CHECK (("gross_amount" >= (0)::numeric)),
    CONSTRAINT "seller_payouts_net_amount_check" CHECK (("net_amount" >= (0)::numeric)),
    CONSTRAINT "seller_payouts_platform_fee_check" CHECK (("platform_fee" >= (0)::numeric)),
    CONSTRAINT "seller_payouts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'available'::"text", 'processing'::"text", 'paid'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."seller_payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zz_deprecated_inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text" NOT NULL,
    "articulo_id" "uuid",
    "variante_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."zz_deprecated_inventory_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."stock_por_sku" AS
 SELECT "ii"."sku",
    "ii"."articulo_id",
    "ii"."variante_id",
    "sum"("il"."stock") AS "stock_total",
    "sum"("il"."reservado") AS "reservado_total",
    ("sum"("il"."stock") - "sum"("il"."reservado")) AS "stock_disponible",
    "sum"(
        CASE
            WHEN ("il"."condicion" = 'AVAILABLE'::"text") THEN "il"."stock"
            ELSE 0
        END) AS "stock_disponible_ok",
    "sum"(
        CASE
            WHEN ("il"."condicion" = 'DAMAGED'::"text") THEN "il"."stock"
            ELSE 0
        END) AS "stock_dañado",
    "sum"(
        CASE
            WHEN ("il"."condicion" = 'IN_REPAIR'::"text") THEN "il"."stock"
            ELSE 0
        END) AS "stock_reparacion"
   FROM ("public"."zz_deprecated_inventory_items" "ii"
     LEFT JOIN "public"."inventory_locations" "il" ON (("il"."inventory_item_id" = "ii"."id")))
  GROUP BY "ii"."id", "ii"."sku", "ii"."articulo_id", "ii"."variante_id";


ALTER VIEW "public"."stock_por_sku" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."store_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."store_members" IS 'Membresía usuario ↔ tienda. Sin columna de rol a propósito: el rol se resuelve en profiles.role, no acá.';



CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text",
    "nombre" "text",
    "tipo" "text",
    "owner_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."stores"."owner_id" IS 'Dueño de la tienda. La membresía operativa vive en store_members.';



CREATE TABLE IF NOT EXISTS "public"."subcategorias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "categoria_id" "uuid",
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true,
    "orden" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."subcategorias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."territories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country_id" "uuid" NOT NULL,
    "territory_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "territories_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "territories_territory_type_check" CHECK (("territory_type" = ANY (ARRAY['national'::"text", 'free_zone'::"text", 'bonded'::"text", 'free_port'::"text", 'special_regime'::"text"])))
);


ALTER TABLE "public"."territories" OWNER TO "postgres";


COMMENT ON TABLE "public"."territories" IS 'CORE Foundation — territorios fiscales y aduaneros';



CREATE TABLE IF NOT EXISTS "public"."trade_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trade_operation_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "reference" "text",
    "issued_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "file_url" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trade_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['commercial_invoice'::"text", 'packing_list'::"text", 'bill_of_lading'::"text", 'airway_bill'::"text", 'certificate_of_origin'::"text", 'customs_declaration'::"text", 'dua'::"text", 'nfe'::"text", 'cfe'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."trade_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."trade_documents" IS 'CORE Trade Engine — documentos aduaneros y fiscales';



CREATE TABLE IF NOT EXISTS "public"."trade_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trade_operation_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "description" "text",
    "actor_id" "uuid",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trade_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."trade_events" IS 'CORE Trade Engine — eventos de operaciones';



CREATE TABLE IF NOT EXISTS "public"."trade_operation_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trade_operation_id" "uuid" NOT NULL,
    "articulo_id" "uuid",
    "hs_code_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit" "text" DEFAULT 'unit'::"text" NOT NULL,
    "unit_value" numeric NOT NULL,
    "total_value" numeric NOT NULL,
    "currency" character(3) DEFAULT 'USD'::"bpchar",
    "weight_kg" numeric,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trade_operation_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."trade_operation_items" IS 'CORE Trade Engine — ítems por operación';



CREATE TABLE IF NOT EXISTS "public"."trade_operations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "entity_id" "uuid",
    "origin_territory_id" "uuid",
    "destination_territory_id" "uuid",
    "reference_number" "text",
    "declared_value" numeric,
    "currency" character(3) DEFAULT 'USD'::"bpchar",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "trade_operations_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'in_progress'::"text", 'cleared'::"text", 'completed'::"text", 'rejected'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "trade_operations_type_check" CHECK (("type" = ANY (ARRAY['import'::"text", 'export'::"text", 'transfer'::"text", 'free_zone_entry'::"text", 'free_zone_exit'::"text", 'bonded_entry'::"text", 'bonded_exit'::"text", 'customs_transit'::"text"])))
);


ALTER TABLE "public"."trade_operations" OWNER TO "postgres";


COMMENT ON TABLE "public"."trade_operations" IS 'CORE Trade Engine — operaciones de comercio exterior';



CREATE TABLE IF NOT EXISTS "public"."translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "language_code" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "field" "text" NOT NULL,
    "value" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "translations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'draft'::"text"])))
);


ALTER TABLE "public"."translations" OWNER TO "postgres";


COMMENT ON TABLE "public"."translations" IS 'CORE i18n — traducciones por entidad, campo e idioma';



CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "label" "text",
    "address" "text" NOT NULL,
    "lat" numeric,
    "lng" numeric,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text",
    "value" "text" NOT NULL,
    "is_preferred" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "preferred_contact_method" "text",
    "preferred_contact_time" "text",
    "notes" "text",
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles_extended" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "document" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles_extended" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_catalog_listings_priced" AS
SELECT
    NULL::"uuid" AS "listing_id",
    NULL::"text" AS "channel",
    NULL::"text" AS "external_id",
    NULL::"public"."catalog_listing_status" AS "listing_status",
    NULL::"jsonb" AS "channel_attrs",
    NULL::"text" AS "last_error",
    NULL::timestamp with time zone AS "synced_at",
    NULL::"uuid" AS "variant_id",
    NULL::"text" AS "sku",
    NULL::"text" AS "barcode",
    NULL::"jsonb" AS "variant_attrs",
    NULL::"public"."catalog_variant_status" AS "variant_status",
    NULL::numeric(12,2) AS "cost_price",
    NULL::"uuid" AS "item_id",
    NULL::"uuid" AS "tenant_id",
    NULL::"text" AS "item_title",
    NULL::"text" AS "item_description",
    NULL::"public"."catalog_item_status" AS "item_status",
    NULL::"text"[] AS "tags",
    NULL::bigint AS "total_available",
    NULL::timestamp with time zone AS "listing_updated_at";


ALTER VIEW "public"."v_catalog_listings_priced" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_catalog_variants_full" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "sku",
    NULL::"text" AS "barcode",
    NULL::"jsonb" AS "attributes",
    NULL::numeric(12,2) AS "price",
    NULL::numeric(12,2) AS "compare_price",
    NULL::numeric(12,2) AS "cost_price",
    NULL::"public"."catalog_variant_status" AS "variant_status",
    NULL::boolean AS "is_default",
    NULL::"uuid" AS "item_id",
    NULL::"uuid" AS "tenant_id",
    NULL::"text" AS "item_title",
    NULL::"public"."catalog_item_status" AS "item_status",
    NULL::"text"[] AS "tags",
    NULL::"public"."ltree" AS "taxonomy_path",
    NULL::"text" AS "taxonomy_name",
    NULL::bigint AS "total_stock",
    NULL::bigint AS "total_available";


ALTER VIEW "public"."v_catalog_variants_full" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb",
    "processed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."zz_deprecated_admin_orders" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::timestamp with time zone AS "created_at",
    NULL::numeric AS "total",
    NULL::"text" AS "currency",
    NULL::"text" AS "payment_status",
    NULL::"text" AS "status",
    NULL::"text" AS "estado",
    NULL::"text" AS "source",
    NULL::"text" AS "mp_payment_id",
    NULL::"text" AS "paypal_order_id",
    NULL::bigint AS "items_count",
    NULL::"uuid" AS "user_id";


ALTER VIEW "public"."zz_deprecated_admin_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zz_deprecated_article_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "articulo_id" "uuid" NOT NULL,
    "platform_id" "uuid",
    "territory_id" "uuid",
    "currency_code" character(3) NOT NULL,
    "campaign_id" "uuid",
    "price" numeric NOT NULL,
    "price_original" numeric,
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "time_from" time without time zone,
    "time_until" time without time zone,
    "days_of_week" integer[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
    "priority" smallint DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "article_prices_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'draft'::"text"])))
);


ALTER TABLE "public"."zz_deprecated_article_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."zz_deprecated_article_prices" IS 'CORE Pricing — precio por artículo × plataforma × territorio × moneda × campaña';



CREATE TABLE IF NOT EXISTS "public"."zz_deprecated_product_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "alt_text" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "store_product_id" "uuid"
);


ALTER TABLE "public"."zz_deprecated_product_images" OWNER TO "postgres";


COMMENT ON COLUMN "public"."zz_deprecated_product_images"."product_id" IS 'LEGACY - DO NOT USE IN CHECKOUT';



CREATE TABLE IF NOT EXISTS "public"."zz_deprecated_product_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "url" "text" NOT NULL,
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "store_product_id" "uuid",
    CONSTRAINT "product_media_type_check" CHECK (("type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."zz_deprecated_product_media" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."zz_deprecated_products_all" AS
 SELECT "id",
    "seller_id",
    "category_id",
    "name",
    "slug",
    "description",
    "price",
    "compare_at_price",
    "sku",
    "stock",
    "images",
    "tags",
    "attributes",
    "is_active",
    "is_featured",
    "weight_kg",
    "views",
    "search_vector",
    "created_at",
    "updated_at",
    "latitude",
    "longitude",
    "ml_item_id",
    "ml_status",
    "ml_last_sync",
    "sync_status",
    "type"
   FROM "public"."products";


ALTER VIEW "public"."zz_deprecated_products_all" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zz_deprecated_secondhand_listings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "condition" "public"."item_condition" NOT NULL,
    "images" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "public"."listing_status" DEFAULT 'active'::"public"."listing_status" NOT NULL,
    "views" integer DEFAULT 0 NOT NULL,
    "location" "text",
    "lat" numeric(9,6),
    "lng" numeric(9,6),
    "search_vector" "tsvector",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "secondhand_listings_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."zz_deprecated_secondhand_listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zz_deprecated_store_products" (
    "id" "uuid" NOT NULL,
    "store_id" "uuid",
    "codigo_interno" "text",
    "ean" "text",
    "nombre" "text",
    "descripcion" "text",
    "precio" numeric,
    "moneda" "text",
    "stock" numeric,
    "imagenes" "jsonb",
    "atributos" "jsonb",
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
);


ALTER TABLE "public"."zz_deprecated_store_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zz_deprecated_warehouses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "codigo" "text" NOT NULL,
    "direccion" "text",
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."zz_deprecated_warehouses" OWNER TO "postgres";


ALTER TABLE ONLY "public"."inventory_movement_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_movement_types_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."seller_orders" ALTER COLUMN "seller_order_number" SET DEFAULT "nextval"('"public"."seller_orders_seller_order_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_vault"
    ADD CONSTRAINT "api_vault_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zz_deprecated_article_prices"
    ADD CONSTRAINT "article_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articulo_variantes"
    ADD CONSTRAINT "articulo_variantes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articulo_variantes"
    ADD CONSTRAINT "articulo_variantes_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."articulos"
    ADD CONSTRAINT "articulos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_distributors"
    ADD CONSTRAINT "brand_distributors_brand_id_distributor_id_country_code_key" UNIQUE ("brand_id", "distributor_id", "country_code");



ALTER TABLE ONLY "public"."brand_distributors"
    ADD CONSTRAINT "brand_distributors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carrito"
    ADD CONSTRAINT "carrito_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_events"
    ADD CONSTRAINT "catalog_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_inventory"
    ADD CONSTRAINT "catalog_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_inventory"
    ADD CONSTRAINT "catalog_inventory_variant_id_location_id_key" UNIQUE ("variant_id", "location_id");



ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_listings"
    ADD CONSTRAINT "catalog_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_listings"
    ADD CONSTRAINT "catalog_listings_variant_id_channel_key" UNIQUE ("variant_id", "channel");



ALTER TABLE ONLY "public"."catalog_locations"
    ADD CONSTRAINT "catalog_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_media"
    ADD CONSTRAINT "catalog_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_nodes"
    ADD CONSTRAINT "catalog_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_nodes"
    ADD CONSTRAINT "catalog_nodes_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."catalog_prices"
    ADD CONSTRAINT "catalog_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_sync_log"
    ADD CONSTRAINT "catalog_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_taxonomy"
    ADD CONSTRAINT "catalog_taxonomy_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_taxonomy"
    ADD CONSTRAINT "catalog_taxonomy_tenant_id_path_key" UNIQUE ("tenant_id", "path");



ALTER TABLE ONLY "public"."catalog_variants"
    ADD CONSTRAINT "catalog_variants_item_id_sku_key" UNIQUE ("item_id", "sku");



ALTER TABLE ONLY "public"."catalog_variants"
    ADD CONSTRAINT "catalog_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categoria_atributo_opciones"
    ADD CONSTRAINT "categoria_atributo_opciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categoria_atributos"
    ADD CONSTRAINT "categoria_atributos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categorias"
    ADD CONSTRAINT "categorias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_items"
    ADD CONSTRAINT "checkout_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkouts"
    ADD CONSTRAINT "checkouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_services"
    ADD CONSTRAINT "core_services_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."core_services"
    ADD CONSTRAINT "core_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_iso_code_key" UNIQUE ("iso_code");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."currencies"
    ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."departamentos"
    ADD CONSTRAINT "departamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."distributors"
    ADD CONSTRAINT "distributors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entity_services"
    ADD CONSTRAINT "entity_services_entity_id_service_id_key" UNIQUE ("entity_id", "service_id");



ALTER TABLE ONLY "public"."entity_services"
    ADD CONSTRAINT "entity_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rate_sources"
    ADD CONSTRAINT "exchange_rate_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_source_id_from_currency_to_currency_valid_at_key" UNIQUE ("source_id", "from_currency", "to_currency", "valid_at");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_listing_id_key" UNIQUE ("user_id", "listing_id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."hs_codes"
    ADD CONSTRAINT "hs_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."hs_codes"
    ADD CONSTRAINT "hs_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zz_deprecated_inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zz_deprecated_inventory_items"
    ADD CONSTRAINT "inventory_items_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."inventory_locations"
    ADD CONSTRAINT "inventory_locations_inventory_item_id_warehouse_id_condicio_key" UNIQUE ("inventory_item_id", "warehouse_id", "condicion");



ALTER TABLE ONLY "public"."inventory_locations"
    ADD CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movement_types"
    ADD CONSTRAINT "inventory_movement_types_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."inventory_movement_types"
    ADD CONSTRAINT "inventory_movement_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."languages"
    ADD CONSTRAINT "languages_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."market_checkouts"
    ADD CONSTRAINT "market_checkouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_library"
    ADD CONSTRAINT "media_library_bucket_path_key" UNIQUE ("bucket", "path");



ALTER TABLE ONLY "public"."media_library"
    ADD CONSTRAINT "media_library_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ml_category_mapping"
    ADD CONSTRAINT "ml_category_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ml_credentials"
    ADD CONSTRAINT "ml_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ml_listings"
    ADD CONSTRAINT "ml_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ml_listings"
    ADD CONSTRAINT "ml_listings_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."ml_sync_queue"
    ADD CONSTRAINT "ml_sync_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ml_webhook_events"
    ADD CONSTRAINT "ml_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mp_credentials"
    ADD CONSTRAINT "mp_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ordenes"
    ADD CONSTRAINT "ordenes_paypal_order_id_key" UNIQUE ("paypal_order_id");



ALTER TABLE ONLY "public"."ordenes"
    ADD CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platforms"
    ADD CONSTRAINT "platforms_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."platforms"
    ADD CONSTRAINT "platforms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zz_deprecated_product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zz_deprecated_product_media"
    ADD CONSTRAINT "product_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_prices"
    ADD CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos_market"
    ADD CONSTRAINT "productos_market_ml_item_id_key" UNIQUE ("ml_item_id");



ALTER TABLE ONLY "public"."productos_market"
    ADD CONSTRAINT "productos_market_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos_secondhand"
    ADD CONSTRAINT "productos_secondhand_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_ml_item_id_key" UNIQUE ("ml_item_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_order_id_key" UNIQUE ("reviewer_id", "order_id");



ALTER TABLE ONLY "public"."zz_deprecated_secondhand_listings"
    ADD CONSTRAINT "secondhand_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zz_deprecated_secondhand_listings"
    ADD CONSTRAINT "secondhand_listings_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."seller_order_items"
    ADD CONSTRAINT "seller_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_orders"
    ADD CONSTRAINT "seller_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_orders"
    ADD CONSTRAINT "seller_orders_unique_seller_checkout" UNIQUE ("checkout_id", "seller_id");



ALTER TABLE ONLY "public"."seller_payouts"
    ADD CONSTRAINT "seller_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_store_id_user_id_key" UNIQUE ("store_id", "user_id");



ALTER TABLE ONLY "public"."zz_deprecated_store_products"
    ADD CONSTRAINT "store_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zz_deprecated_store_products"
    ADD CONSTRAINT "store_products_store_id_codigo_interno_key" UNIQUE ("store_id", "codigo_interno");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcategorias"
    ADD CONSTRAINT "subcategorias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."territories"
    ADD CONSTRAINT "territories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_documents"
    ADD CONSTRAINT "trade_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_events"
    ADD CONSTRAINT "trade_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_operation_items"
    ADD CONSTRAINT "trade_operation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_operations"
    ADD CONSTRAINT "trade_operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_language_code_entity_type_entity_id_field_key" UNIQUE ("language_code", "entity_type", "entity_id", "field");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ml_credentials"
    ADD CONSTRAINT "uq_ml_credentials_site_active" UNIQUE NULLS NOT DISTINCT ("site_id", "is_active");



ALTER TABLE ONLY "public"."ordenes"
    ADD CONSTRAINT "uq_ordenes_payment_id" UNIQUE ("payment_id");



ALTER TABLE ONLY "public"."product_prices"
    ADD CONSTRAINT "uq_product_prices_product" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_contacts"
    ADD CONSTRAINT "user_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_profiles_extended"
    ADD CONSTRAINT "user_profiles_extended_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zz_deprecated_warehouses"
    ADD CONSTRAINT "warehouses_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."zz_deprecated_warehouses"
    ADD CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "api_vault_platform_global_uidx" ON "public"."api_vault" USING "btree" ("platform") WHERE ("tenant_id" IS NULL);



CREATE INDEX "api_vault_platform_idx" ON "public"."api_vault" USING "btree" ("platform");



CREATE UNIQUE INDEX "api_vault_platform_tenant_uidx" ON "public"."api_vault" USING "btree" ("platform", "tenant_id") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "api_vault_tenant_id_idx" ON "public"."api_vault" USING "btree" ("tenant_id");



CREATE INDEX "api_vault_user_id_idx" ON "public"."api_vault" USING "btree" ("user_id");



CREATE INDEX "idx_activities_opp" ON "public"."activities" USING "btree" ("opportunity_id");



CREATE INDEX "idx_addresses_user" ON "public"."addresses" USING "btree" ("user_id");



CREATE INDEX "idx_art_categoria" ON "public"."articulos" USING "btree" ("categoria_id", "status", "precio") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_art_ranking" ON "public"."articulos" USING "btree" ("ranking_score" DESC NULLS LAST) WHERE (("status" = 'active'::"text") AND ("deleted_at" IS NULL));



CREATE INDEX "idx_art_vendedor" ON "public"."articulos" USING "btree" ("vendedor_id", "status", "created_at" DESC);



CREATE INDEX "idx_article_prices_articulo" ON "public"."zz_deprecated_article_prices" USING "btree" ("articulo_id");



CREATE INDEX "idx_article_prices_campaign" ON "public"."zz_deprecated_article_prices" USING "btree" ("campaign_id");



CREATE INDEX "idx_article_prices_currency" ON "public"."zz_deprecated_article_prices" USING "btree" ("currency_code");



CREATE INDEX "idx_article_prices_platform" ON "public"."zz_deprecated_article_prices" USING "btree" ("platform_id");



CREATE INDEX "idx_article_prices_priority" ON "public"."zz_deprecated_article_prices" USING "btree" ("priority" DESC);



CREATE INDEX "idx_article_prices_territory" ON "public"."zz_deprecated_article_prices" USING "btree" ("territory_id");



CREATE INDEX "idx_article_prices_valid" ON "public"."zz_deprecated_article_prices" USING "btree" ("valid_from", "valid_until");



CREATE INDEX "idx_attr_opciones_attr" ON "public"."categoria_atributo_opciones" USING "btree" ("atributo_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_entity_id" ON "public"."audit_logs" USING "btree" ("entity_id");



CREATE INDEX "idx_audit_logs_event_type" ON "public"."audit_logs" USING "btree" ("event_type");



CREATE INDEX "idx_brand_dist_brand" ON "public"."brand_distributors" USING "btree" ("brand_id");



CREATE INDEX "idx_brands_entity" ON "public"."brands" USING "btree" ("entity_id");



CREATE INDEX "idx_campaigns_platform" ON "public"."campaigns" USING "btree" ("platform_id");



CREATE INDEX "idx_campaigns_status" ON "public"."campaigns" USING "btree" ("status");



CREATE INDEX "idx_campaigns_valid" ON "public"."campaigns" USING "btree" ("valid_from", "valid_until");



CREATE INDEX "idx_carrito_store_product_id" ON "public"."carrito" USING "btree" ("store_product_id");



CREATE INDEX "idx_cart_items_store_product_id" ON "public"."cart_items" USING "btree" ("store_product_id");



CREATE INDEX "idx_cart_items_user_store_product" ON "public"."cart_items" USING "btree" ("user_id", "store_product_id");



CREATE INDEX "idx_cat_attr_categoria" ON "public"."categoria_atributos" USING "btree" ("categoria_id");



CREATE INDEX "idx_catalog_nodes_level" ON "public"."catalog_nodes" USING "btree" ("level");



CREATE INDEX "idx_catalog_nodes_parent_id" ON "public"."catalog_nodes" USING "btree" ("parent_id");



CREATE INDEX "idx_catalog_nodes_position" ON "public"."catalog_nodes" USING "btree" ("parent_id", "position");



CREATE INDEX "idx_checkout_items_checkout" ON "public"."checkout_items" USING "btree" ("checkout_id");



CREATE INDEX "idx_checkout_items_seller" ON "public"."checkout_items" USING "btree" ("seller_id");



CREATE INDEX "idx_checkouts_buyer" ON "public"."checkouts" USING "btree" ("buyer_id");



CREATE INDEX "idx_checkouts_status" ON "public"."checkouts" USING "btree" ("status");



CREATE INDEX "idx_distributors_country" ON "public"."distributors" USING "btree" ("country_code");



CREATE INDEX "idx_distributors_entity" ON "public"."distributors" USING "btree" ("entity_id");



CREATE INDEX "idx_entities_country" ON "public"."entities" USING "btree" ("country_code");



CREATE INDEX "idx_entities_deleted" ON "public"."entities" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_entities_status" ON "public"."entities" USING "btree" ("status");



CREATE INDEX "idx_entities_type" ON "public"."entities" USING "btree" ("entity_type");



CREATE INDEX "idx_entity_services_entity" ON "public"."entity_services" USING "btree" ("entity_id");



CREATE INDEX "idx_events_created_at" ON "public"."events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_events_emitted" ON "public"."catalog_events" USING "btree" ("emitted_at" DESC);



CREATE INDEX "idx_events_event_type" ON "public"."events" USING "btree" ("event_type");



CREATE INDEX "idx_events_type" ON "public"."catalog_events" USING "btree" ("type");



CREATE INDEX "idx_events_user_id" ON "public"."events" USING "btree" ("user_id");



CREATE INDEX "idx_exchange_rates_currencies" ON "public"."exchange_rates" USING "btree" ("from_currency", "to_currency");



CREATE INDEX "idx_exchange_rates_valid_at" ON "public"."exchange_rates" USING "btree" ("valid_at" DESC);



CREATE INDEX "idx_favorites_store_product_id" ON "public"."favorites" USING "btree" ("store_product_id");



CREATE INDEX "idx_favorites_user" ON "public"."favorites" USING "btree" ("user_id");



CREATE INDEX "idx_inv_items_sku" ON "public"."zz_deprecated_inventory_items" USING "btree" ("sku");



CREATE INDEX "idx_inv_loc_item" ON "public"."inventory_locations" USING "btree" ("inventory_item_id");



CREATE INDEX "idx_inv_loc_warehouse" ON "public"."inventory_locations" USING "btree" ("warehouse_id");



CREATE INDEX "idx_inv_mov_sku" ON "public"."inventory_movements" USING "btree" ("sku", "created_at" DESC);



CREATE INDEX "idx_inv_mov_type" ON "public"."inventory_movements" USING "btree" ("movement_type_id");



CREATE INDEX "idx_inv_mov_warehouse" ON "public"."inventory_movements" USING "btree" ("warehouse_id", "created_at" DESC);



CREATE INDEX "idx_inventory_location" ON "public"."catalog_inventory" USING "btree" ("location_id");



CREATE INDEX "idx_inventory_variant" ON "public"."catalog_inventory" USING "btree" ("variant_id");



CREATE INDEX "idx_items_meta" ON "public"."catalog_items" USING "gin" ("meta");



CREATE INDEX "idx_items_status" ON "public"."catalog_items" USING "btree" ("status");



CREATE INDEX "idx_items_tags" ON "public"."catalog_items" USING "gin" ("tags");



CREATE INDEX "idx_items_taxonomy" ON "public"."catalog_items" USING "btree" ("taxonomy_node_id");



CREATE INDEX "idx_items_tenant" ON "public"."catalog_items" USING "btree" ("tenant_id");



CREATE INDEX "idx_listings_category" ON "public"."zz_deprecated_secondhand_listings" USING "btree" ("category_id");



CREATE INDEX "idx_listings_channel" ON "public"."catalog_listings" USING "btree" ("channel");



CREATE INDEX "idx_listings_ext" ON "public"."catalog_listings" USING "btree" ("channel", "external_id");



CREATE INDEX "idx_listings_location" ON "public"."zz_deprecated_secondhand_listings" USING "btree" ("lat", "lng") WHERE ("lat" IS NOT NULL);



CREATE INDEX "idx_listings_price" ON "public"."zz_deprecated_secondhand_listings" USING "btree" ("price");



CREATE INDEX "idx_listings_search" ON "public"."zz_deprecated_secondhand_listings" USING "gin" ("search_vector");



CREATE INDEX "idx_listings_seller" ON "public"."zz_deprecated_secondhand_listings" USING "btree" ("seller_id");



CREATE INDEX "idx_listings_status" ON "public"."zz_deprecated_secondhand_listings" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_listings_variant" ON "public"."catalog_listings" USING "btree" ("variant_id");



CREATE INDEX "idx_locations_tenant" ON "public"."catalog_locations" USING "btree" ("tenant_id");



CREATE INDEX "idx_market_checkouts_buyer" ON "public"."market_checkouts" USING "btree" ("buyer_id");



CREATE INDEX "idx_market_checkouts_status" ON "public"."market_checkouts" USING "btree" ("status");



CREATE INDEX "idx_media_item" ON "public"."catalog_media" USING "btree" ("item_id");



CREATE INDEX "idx_media_library_categoria" ON "public"."media_library" USING "btree" ("user_id", "categoria");



CREATE INDEX "idx_media_library_etiquetas" ON "public"."media_library" USING "gin" ("etiquetas");



CREATE INDEX "idx_media_library_user_created" ON "public"."media_library" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_media_library_venta" ON "public"."media_library" USING "btree" ("venta_id") WHERE ("venta_id" IS NOT NULL);



CREATE INDEX "idx_media_variant" ON "public"."catalog_media" USING "btree" ("variant_id");



CREATE INDEX "idx_meetings_opp" ON "public"."meetings" USING "btree" ("opportunity_id");



CREATE INDEX "idx_ml_category_mapping_ml_id" ON "public"."ml_category_mapping" USING "btree" ("ml_category_id");



CREATE UNIQUE INDEX "idx_ml_category_mapping_oddy" ON "public"."ml_category_mapping" USING "btree" ("oddy_category");



CREATE INDEX "idx_ml_event_id" ON "public"."ml_webhook_events" USING "btree" ("event_id");



CREATE INDEX "idx_ml_listings_ml_item_id" ON "public"."ml_listings" USING "btree" ("ml_item_id");



CREATE INDEX "idx_ml_listings_product_id" ON "public"."ml_listings" USING "btree" ("product_id");



CREATE INDEX "idx_ml_listings_store_product_id" ON "public"."ml_listings" USING "btree" ("store_product_id");



CREATE INDEX "idx_ml_sync_queue_created_at" ON "public"."ml_sync_queue" USING "btree" ("created_at");



CREATE INDEX "idx_ml_sync_queue_product_id" ON "public"."ml_sync_queue" USING "btree" ("product_id");



CREATE INDEX "idx_ml_sync_queue_status" ON "public"."ml_sync_queue" USING "btree" ("status");



CREATE INDEX "idx_ml_sync_queue_store_product_id" ON "public"."ml_sync_queue" USING "btree" ("store_product_id");



CREATE INDEX "idx_ml_webhook_created" ON "public"."ml_webhook_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ml_webhook_event_id" ON "public"."ml_webhook_events" USING "btree" ("event_id");



CREATE INDEX "idx_ml_webhook_events_created_at" ON "public"."ml_webhook_events" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "idx_ml_webhook_events_event_id" ON "public"."ml_webhook_events" USING "btree" ("event_id");



CREATE INDEX "idx_ml_webhook_events_topic" ON "public"."ml_webhook_events" USING "btree" ("topic");



CREATE INDEX "idx_ml_webhook_processed" ON "public"."ml_webhook_events" USING "btree" ("processed");



CREATE INDEX "idx_notif_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "idx_opportunities_brand" ON "public"."opportunities" USING "btree" ("brand_id");



CREATE INDEX "idx_opportunities_stage" ON "public"."opportunities" USING "btree" ("stage");



CREATE INDEX "idx_ordenes_created_at" ON "public"."ordenes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ordenes_created_at_desc" ON "public"."ordenes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ordenes_estado" ON "public"."ordenes" USING "btree" ("estado");



CREATE INDEX "idx_ordenes_payment_status" ON "public"."ordenes" USING "btree" ("payment_status");



CREATE INDEX "idx_ordenes_tipo_comprador" ON "public"."ordenes" USING "btree" ("tipo_comprador");



CREATE INDEX "idx_order_items_listing" ON "public"."order_items" USING "btree" ("listing_id");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_order_id_store_product" ON "public"."order_items" USING "btree" ("order_id", "store_product_id");



CREATE INDEX "idx_order_items_order_store_product" ON "public"."order_items" USING "btree" ("order_id", "store_product_id");



CREATE INDEX "idx_order_items_product" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_items_store_product_id" ON "public"."order_items" USING "btree" ("store_product_id");



CREATE INDEX "idx_orders_buyer" ON "public"."orders" USING "btree" ("buyer_id", "created_at" DESC);



CREATE INDEX "idx_orders_checkout_id" ON "public"."orders" USING "btree" ("checkout_id");



CREATE INDEX "idx_orders_created" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_seller" ON "public"."orders" USING "btree" ("seller_id", "created_at" DESC);



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_payment_allocations_checkout" ON "public"."payment_allocations" USING "btree" ("checkout_id");



CREATE INDEX "idx_payment_allocations_seller" ON "public"."payment_allocations" USING "btree" ("seller_id");



CREATE UNIQUE INDEX "idx_payments_order" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_payments_provider_id" ON "public"."payments" USING "btree" ("provider_payment_id") WHERE ("provider_payment_id" IS NOT NULL);



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_pimages_product" ON "public"."zz_deprecated_product_images" USING "btree" ("product_id", "sort_order");



CREATE INDEX "idx_prices_campaign" ON "public"."catalog_prices" USING "btree" ("campaign") WHERE ("campaign" IS NOT NULL);



CREATE INDEX "idx_prices_channel" ON "public"."catalog_prices" USING "btree" ("channel") WHERE ("channel" IS NOT NULL);



CREATE INDEX "idx_prices_currency" ON "public"."catalog_prices" USING "btree" ("currency");



CREATE INDEX "idx_prices_item" ON "public"."catalog_prices" USING "btree" ("item_id") WHERE ("item_id" IS NOT NULL);



CREATE INDEX "idx_prices_period" ON "public"."catalog_prices" USING "btree" ("valid_from", "valid_until");



CREATE INDEX "idx_prices_priority" ON "public"."catalog_prices" USING "btree" ("priority" DESC);



CREATE INDEX "idx_prices_resolve" ON "public"."catalog_prices" USING "btree" ("variant_id", "channel", "country", "currency", "campaign", "priority" DESC) WHERE ("variant_id" IS NOT NULL);



CREATE INDEX "idx_prices_resolve_item" ON "public"."catalog_prices" USING "btree" ("item_id", "channel", "country", "currency", "campaign", "priority" DESC) WHERE ("item_id" IS NOT NULL);



CREATE INDEX "idx_prices_validity" ON "public"."catalog_prices" USING "btree" ("valid_from", "valid_until");



CREATE INDEX "idx_prices_variant" ON "public"."catalog_prices" USING "btree" ("variant_id") WHERE ("variant_id" IS NOT NULL);



CREATE INDEX "idx_product_images_store_product_id" ON "public"."zz_deprecated_product_images" USING "btree" ("store_product_id");



CREATE INDEX "idx_product_media_product_id" ON "public"."zz_deprecated_product_media" USING "btree" ("product_id");



CREATE INDEX "idx_product_media_store_product_id" ON "public"."zz_deprecated_product_media" USING "btree" ("store_product_id");



CREATE INDEX "idx_product_prices_product_id" ON "public"."product_prices" USING "btree" ("product_id");



CREATE INDEX "idx_product_prices_store_product_id" ON "public"."product_prices" USING "btree" ("store_product_id");



CREATE INDEX "idx_productos_market_geo" ON "public"."productos_market" USING "btree" ("latitude", "longitude") WHERE (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL));



CREATE INDEX "idx_productos_market_ml_item" ON "public"."productos_market" USING "btree" ("ml_item_id");



CREATE INDEX "idx_productos_market_ml_item_id" ON "public"."productos_market" USING "btree" ("ml_item_id");



CREATE INDEX "idx_productos_market_status" ON "public"."productos_market" USING "btree" ("status");



CREATE INDEX "idx_productos_market_stock" ON "public"."productos_market" USING "btree" ("stock");



CREATE INDEX "idx_productos_secondhand_geo" ON "public"."productos_secondhand" USING "btree" ("latitude", "longitude") WHERE (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL));



CREATE INDEX "idx_products_active" ON "public"."products" USING "btree" ("is_active", "created_at" DESC);



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_featured" ON "public"."products" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_products_price" ON "public"."products" USING "btree" ("price");



CREATE INDEX "idx_products_search" ON "public"."products" USING "gin" ("search_vector");



CREATE INDEX "idx_products_seller" ON "public"."products" USING "btree" ("seller_id");



CREATE INDEX "idx_products_slug" ON "public"."products" USING "btree" ("slug");



CREATE INDEX "idx_products_tags" ON "public"."products" USING "gin" ("tags");



CREATE INDEX "idx_reviews_product" ON "public"."reviews" USING "btree" ("product_id");



CREATE INDEX "idx_reviews_reviewed" ON "public"."reviews" USING "btree" ("reviewed_id");



CREATE INDEX "idx_reviews_store_product_id" ON "public"."reviews" USING "btree" ("store_product_id");



CREATE INDEX "idx_seller_order_items_order" ON "public"."seller_order_items" USING "btree" ("seller_order_id");



CREATE INDEX "idx_seller_orders_checkout" ON "public"."seller_orders" USING "btree" ("checkout_id");



CREATE INDEX "idx_seller_orders_seller" ON "public"."seller_orders" USING "btree" ("seller_id");



CREATE INDEX "idx_seller_orders_status" ON "public"."seller_orders" USING "btree" ("status");



CREATE INDEX "idx_seller_payouts_seller" ON "public"."seller_payouts" USING "btree" ("seller_id");



CREATE INDEX "idx_seller_payouts_status" ON "public"."seller_payouts" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_store_members_one_default" ON "public"."store_members" USING "btree" ("user_id") WHERE "is_default";



CREATE INDEX "idx_store_members_store" ON "public"."store_members" USING "btree" ("store_id");



CREATE INDEX "idx_store_members_user" ON "public"."store_members" USING "btree" ("user_id");



CREATE INDEX "idx_sync_log_created" ON "public"."catalog_sync_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sync_log_listing" ON "public"."catalog_sync_log" USING "btree" ("listing_id");



CREATE INDEX "idx_sync_log_result" ON "public"."catalog_sync_log" USING "btree" ("result");



CREATE INDEX "idx_taxonomy_parent" ON "public"."catalog_taxonomy" USING "btree" ("parent_id");



CREATE INDEX "idx_taxonomy_path" ON "public"."catalog_taxonomy" USING "gist" ("path");



CREATE INDEX "idx_taxonomy_tenant" ON "public"."catalog_taxonomy" USING "btree" ("tenant_id");



CREATE INDEX "idx_territories_country" ON "public"."territories" USING "btree" ("country_id");



CREATE INDEX "idx_trade_docs_op" ON "public"."trade_documents" USING "btree" ("trade_operation_id");



CREATE INDEX "idx_trade_events_op" ON "public"."trade_events" USING "btree" ("trade_operation_id");



CREATE INDEX "idx_trade_items_op" ON "public"."trade_operation_items" USING "btree" ("trade_operation_id");



CREATE INDEX "idx_trade_ops_entity" ON "public"."trade_operations" USING "btree" ("entity_id");



CREATE INDEX "idx_trade_ops_status" ON "public"."trade_operations" USING "btree" ("status");



CREATE INDEX "idx_trade_ops_type" ON "public"."trade_operations" USING "btree" ("type");



CREATE INDEX "idx_translations_entity" ON "public"."translations" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_translations_language" ON "public"."translations" USING "btree" ("language_code");



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_user_contacts_user_id" ON "public"."user_contacts" USING "btree" ("user_id");



CREATE INDEX "idx_var_articulo" ON "public"."articulo_variantes" USING "btree" ("articulo_id", "status");



CREATE INDEX "idx_var_atributos" ON "public"."articulo_variantes" USING "gin" ("atributos" "jsonb_path_ops");



CREATE INDEX "idx_var_sku" ON "public"."articulo_variantes" USING "btree" ("sku");



CREATE INDEX "idx_variants_attributes" ON "public"."catalog_variants" USING "gin" ("attributes");



CREATE INDEX "idx_variants_item" ON "public"."catalog_variants" USING "btree" ("item_id");



CREATE INDEX "idx_variants_sku" ON "public"."catalog_variants" USING "btree" ("sku");



CREATE INDEX "idx_webhook_events_created_at" ON "public"."webhook_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_webhook_events_payment_id" ON "public"."webhook_events" USING "btree" ("payment_id");



CREATE INDEX "media_library_user_idx" ON "public"."media_library" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "ml_sync_queue_product_action_pending_uq" ON "public"."ml_sync_queue" USING "btree" ("product_id", "action") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "orders_ml_order_id_uq" ON "public"."orders" USING "btree" ("ml_order_id") WHERE ("ml_order_id" IS NOT NULL);



CREATE INDEX "products_category_idx" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "products_owner_id_idx" ON "public"."products" USING "btree" ("owner_id");



CREATE UNIQUE INDEX "products_owner_title_unique" ON "public"."products" USING "btree" ("owner_id", "title");



CREATE INDEX "products_status_idx" ON "public"."products" USING "btree" ("status");



CREATE UNIQUE INDEX "uq_mp_credentials_site_active" ON "public"."mp_credentials" USING "btree" ("site_id") WHERE ("is_active" = true);



CREATE OR REPLACE VIEW "public"."articulos_con_variantes" AS
 SELECT "a"."id",
    "a"."nombre",
    "a"."tipo",
    "a"."status",
    "a"."precio" AS "precio_base",
    "a"."moneda",
    "a"."departamento_nombre",
    "a"."categoria_nombre",
    "a"."imagen_principal",
    "a"."vendedor_id",
    "count"("v"."id") AS "total_variantes",
    "sum"("v"."stock") AS "stock_total",
    "min"("v"."precio") AS "precio_desde",
    "max"("v"."precio") AS "precio_hasta"
   FROM ("public"."articulos" "a"
     LEFT JOIN "public"."articulo_variantes" "v" ON ((("v"."articulo_id" = "a"."id") AND ("v"."status" = 'active'::"text"))))
  WHERE ("a"."deleted_at" IS NULL)
  GROUP BY "a"."id";



CREATE OR REPLACE VIEW "public"."v_catalog_listings_priced" WITH ("security_invoker"='true') AS
 SELECT "l"."id" AS "listing_id",
    "l"."channel",
    "l"."external_id",
    "l"."status" AS "listing_status",
    "l"."channel_attrs",
    "l"."last_error",
    "l"."synced_at",
    "v"."id" AS "variant_id",
    "v"."sku",
    "v"."barcode",
    "v"."attributes" AS "variant_attrs",
    "v"."status" AS "variant_status",
    "v"."cost_price",
    "i"."id" AS "item_id",
    "i"."tenant_id",
    "i"."title" AS "item_title",
    "i"."description" AS "item_description",
    "i"."status" AS "item_status",
    "i"."tags",
    COALESCE("sum"("inv"."available") FILTER (WHERE ("inv"."available" IS NOT NULL)), (0)::bigint) AS "total_available",
    "l"."updated_at" AS "listing_updated_at"
   FROM ((("public"."catalog_listings" "l"
     JOIN "public"."catalog_variants" "v" ON (("v"."id" = "l"."variant_id")))
     JOIN "public"."catalog_items" "i" ON (("i"."id" = "v"."item_id")))
     LEFT JOIN "public"."catalog_inventory" "inv" ON (("inv"."variant_id" = "v"."id")))
  WHERE ("i"."tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid")
  GROUP BY "l"."id", "v"."id", "i"."id";



CREATE OR REPLACE VIEW "public"."v_catalog_variants_full" WITH ("security_invoker"='true') AS
 SELECT "v"."id",
    "v"."sku",
    "v"."barcode",
    "v"."attributes",
    "v"."price",
    "v"."compare_price",
    "v"."cost_price",
    "v"."status" AS "variant_status",
    "v"."is_default",
    "i"."id" AS "item_id",
    "i"."tenant_id",
    "i"."title" AS "item_title",
    "i"."status" AS "item_status",
    "i"."tags",
    "t"."path" AS "taxonomy_path",
    "t"."name" AS "taxonomy_name",
    COALESCE("sum"("inv"."quantity") FILTER (WHERE ("inv"."quantity" IS NOT NULL)), (0)::bigint) AS "total_stock",
    COALESCE("sum"("inv"."available") FILTER (WHERE ("inv"."available" IS NOT NULL)), (0)::bigint) AS "total_available"
   FROM ((("public"."catalog_variants" "v"
     JOIN "public"."catalog_items" "i" ON (("i"."id" = "v"."item_id")))
     LEFT JOIN "public"."catalog_taxonomy" "t" ON (("t"."id" = "i"."taxonomy_node_id")))
     LEFT JOIN "public"."catalog_inventory" "inv" ON (("inv"."variant_id" = "v"."id")))
  WHERE ("i"."tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid")
  GROUP BY "v"."id", "i"."id", "t"."path", "t"."name";



CREATE OR REPLACE VIEW "public"."zz_deprecated_admin_orders" AS
 SELECT "o"."id",
    "o"."created_at",
        CASE "o"."moneda"
            WHEN 'USD'::"text" THEN "o"."total_usd"
            ELSE "o"."total_uyu"
        END AS "total",
    "o"."moneda" AS "currency",
    "o"."payment_status",
    "o"."status",
    "o"."estado",
    "o"."source",
    "o"."mp_payment_id",
    "o"."paypal_order_id",
    "count"("oi"."id") AS "items_count",
    "o"."user_id"
   FROM ("public"."ordenes" "o"
     LEFT JOIN "public"."order_items" "oi" ON (("oi"."order_id" = "o"."id")))
  GROUP BY "o"."id";



CREATE OR REPLACE TRIGGER "api_vault_updated_at" BEFORE UPDATE ON "public"."api_vault" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_brands" BEFORE UPDATE ON "public"."brands" FOR EACH ROW EXECUTE FUNCTION "public"."core_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_entities" BEFORE UPDATE ON "public"."entities" FOR EACH ROW EXECUTE FUNCTION "public"."core_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_entity_services" BEFORE UPDATE ON "public"."entity_services" FOR EACH ROW EXECUTE FUNCTION "public"."core_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_territories" BEFORE UPDATE ON "public"."territories" FOR EACH ROW EXECUTE FUNCTION "public"."core_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_addresses_updated" BEFORE UPDATE ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_audit_order_created" AFTER INSERT ON "public"."ordenes" FOR EACH ROW EXECUTE FUNCTION "public"."trg_log_order_created"();



CREATE OR REPLACE TRIGGER "trg_audit_payment_confirmed" AFTER UPDATE OF "estado" ON "public"."ordenes" FOR EACH ROW EXECUTE FUNCTION "public"."trg_log_payment_confirmed"();



CREATE OR REPLACE TRIGGER "trg_audit_status_market" AFTER UPDATE OF "status" ON "public"."productos_market" FOR EACH ROW EXECUTE FUNCTION "public"."trg_log_status_changed"();



CREATE OR REPLACE TRIGGER "trg_audit_status_secondhand" AFTER UPDATE OF "status" ON "public"."productos_secondhand" FOR EACH ROW EXECUTE FUNCTION "public"."trg_log_status_changed"();



CREATE OR REPLACE TRIGGER "trg_audit_stock_updated" AFTER UPDATE OF "stock" ON "public"."productos_market" FOR EACH ROW EXECUTE FUNCTION "public"."trg_log_stock_updated"();



CREATE OR REPLACE TRIGGER "trg_checkouts_updated_at" BEFORE UPDATE ON "public"."checkouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inventory_updated" BEFORE UPDATE ON "public"."catalog_inventory" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_items_updated" BEFORE UPDATE ON "public"."catalog_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_listings_search" BEFORE INSERT OR UPDATE OF "title", "description" ON "public"."zz_deprecated_secondhand_listings" FOR EACH ROW EXECUTE FUNCTION "public"."listings_search_vector_update"();



CREATE OR REPLACE TRIGGER "trg_listings_updated" BEFORE UPDATE ON "public"."catalog_listings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_market_checkouts_updated_at" BEFORE UPDATE ON "public"."market_checkouts" FOR EACH ROW EXECUTE FUNCTION "public"."market_checkout_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ml_consistency" BEFORE UPDATE OF "status", "stock" ON "public"."productos_market" FOR EACH ROW EXECUTE FUNCTION "public"."trg_validate_ml_consistency"();



CREATE OR REPLACE TRIGGER "trg_ml_credentials_updated_at" BEFORE UPDATE ON "public"."ml_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ml_stock_sync" AFTER UPDATE OF "stock" ON "public"."productos_market" FOR EACH ROW EXECUTE FUNCTION "public"."trg_enqueue_ml_stock"();



CREATE OR REPLACE TRIGGER "trg_ml_webhook_events_updated" BEFORE UPDATE ON "public"."ml_webhook_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_mp_credentials_updated_at" BEFORE UPDATE ON "public"."mp_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_order_status_transition" BEFORE UPDATE OF "payment_status" ON "public"."ordenes" FOR EACH ROW EXECUTE FUNCTION "public"."trg_validate_status_transition"();



CREATE OR REPLACE TRIGGER "trg_payment_net" BEFORE INSERT OR UPDATE OF "amount", "commission_amount" ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."compute_payment_net"();



CREATE OR REPLACE TRIGGER "trg_prices_updated" BEFORE UPDATE ON "public"."catalog_prices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_products_search" BEFORE INSERT OR UPDATE OF "name", "description" ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."products_search_vector_update"();



CREATE OR REPLACE TRIGGER "trg_profiles_protect_role" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."profiles_protect_role"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated" BEFORE UPDATE ON "public"."user_profiles_extended" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_seller_orders_updated_at" BEFORE UPDATE ON "public"."seller_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_seller_payouts_updated_at" BEFORE UPDATE ON "public"."seller_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_single_default_address" BEFORE INSERT OR UPDATE OF "is_default" ON "public"."addresses" FOR EACH ROW WHEN (("new"."is_default" = true)) EXECUTE FUNCTION "public"."enforce_single_default_address"();



CREATE OR REPLACE TRIGGER "trg_single_default_address" BEFORE INSERT OR UPDATE ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_default_address"();



CREATE OR REPLACE TRIGGER "trg_sync_product_status" BEFORE UPDATE OF "stock" ON "public"."productos_market" FOR EACH ROW EXECUTE FUNCTION "public"."sync_product_status"();



CREATE OR REPLACE TRIGGER "trg_taxonomy_updated" BEFORE UPDATE ON "public"."catalog_taxonomy" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_update_seller_rating" AFTER INSERT OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_seller_rating"();



CREATE OR REPLACE TRIGGER "trg_updated_at_orders" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at_payments" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at_products" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at_profiles" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at_secondhand_listings" BEFORE UPDATE ON "public"."zz_deprecated_secondhand_listings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_var_updated_at" BEFORE UPDATE ON "public"."articulo_variantes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_variants_updated" BEFORE UPDATE ON "public"."catalog_variants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_vault"
    ADD CONSTRAINT "api_vault_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zz_deprecated_article_prices"
    ADD CONSTRAINT "article_prices_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id");



ALTER TABLE ONLY "public"."zz_deprecated_article_prices"
    ADD CONSTRAINT "article_prices_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id");



ALTER TABLE ONLY "public"."zz_deprecated_article_prices"
    ADD CONSTRAINT "article_prices_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."zz_deprecated_article_prices"
    ADD CONSTRAINT "article_prices_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id");



ALTER TABLE ONLY "public"."zz_deprecated_article_prices"
    ADD CONSTRAINT "article_prices_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id");



ALTER TABLE ONLY "public"."articulo_variantes"
    ADD CONSTRAINT "articulo_variantes_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_distributors"
    ADD CONSTRAINT "brand_distributors_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."brand_distributors"
    ADD CONSTRAINT "brand_distributors_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id");



ALTER TABLE ONLY "public"."brand_distributors"
    ADD CONSTRAINT "brand_distributors_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("iso_code");



ALTER TABLE ONLY "public"."brand_distributors"
    ADD CONSTRAINT "brand_distributors_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "public"."distributors"("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_country_origin_fkey" FOREIGN KEY ("country_origin") REFERENCES "public"."countries"("iso_code");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "public"."territories"("id");



ALTER TABLE ONLY "public"."carrito"
    ADD CONSTRAINT "carrito_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_store_product_id_fkey" FOREIGN KEY ("store_product_id") REFERENCES "public"."zz_deprecated_store_products"("id");



ALTER TABLE ONLY "public"."catalog_inventory"
    ADD CONSTRAINT "catalog_inventory_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."catalog_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_inventory"
    ADD CONSTRAINT "catalog_inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."catalog_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_taxonomy_node_id_fkey" FOREIGN KEY ("taxonomy_node_id") REFERENCES "public"."catalog_taxonomy"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."catalog_listings"
    ADD CONSTRAINT "catalog_listings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."catalog_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_media"
    ADD CONSTRAINT "catalog_media_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_media"
    ADD CONSTRAINT "catalog_media_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."catalog_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."catalog_nodes"
    ADD CONSTRAINT "catalog_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."catalog_nodes"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."catalog_nodes"
    ADD CONSTRAINT "catalog_nodes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."productos_market"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."catalog_prices"
    ADD CONSTRAINT "catalog_prices_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_prices"
    ADD CONSTRAINT "catalog_prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."catalog_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_sync_log"
    ADD CONSTRAINT "catalog_sync_log_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."catalog_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_taxonomy"
    ADD CONSTRAINT "catalog_taxonomy_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."catalog_taxonomy"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."catalog_variants"
    ADD CONSTRAINT "catalog_variants_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categoria_atributo_opciones"
    ADD CONSTRAINT "categoria_atributo_opciones_atributo_id_fkey" FOREIGN KEY ("atributo_id") REFERENCES "public"."categoria_atributos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categorias"
    ADD CONSTRAINT "categorias_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("iso_code");



ALTER TABLE ONLY "public"."checkout_items"
    ADD CONSTRAINT "checkout_items_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_items"
    ADD CONSTRAINT "checkout_items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checkouts"
    ADD CONSTRAINT "checkouts_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."distributors"
    ADD CONSTRAINT "distributors_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id");



ALTER TABLE ONLY "public"."distributors"
    ADD CONSTRAINT "distributors_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("iso_code");



ALTER TABLE ONLY "public"."distributors"
    ADD CONSTRAINT "distributors_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."entities"
    ADD CONSTRAINT "entities_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("iso_code");



ALTER TABLE ONLY "public"."entity_services"
    ADD CONSTRAINT "entity_services_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."entity_services"
    ADD CONSTRAINT "entity_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."core_services"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_from_currency_fkey" FOREIGN KEY ("from_currency") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."exchange_rate_sources"("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_to_currency_fkey" FOREIGN KEY ("to_currency") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."zz_deprecated_secondhand_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_listing" FOREIGN KEY ("listing_id") REFERENCES "public"."zz_deprecated_secondhand_listings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."zz_deprecated_inventory_items"
    ADD CONSTRAINT "inventory_items_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."zz_deprecated_inventory_items"
    ADD CONSTRAINT "inventory_items_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."articulo_variantes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_locations"
    ADD CONSTRAINT "inventory_locations_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."zz_deprecated_inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_locations"
    ADD CONSTRAINT "inventory_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."zz_deprecated_warehouses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_movement_type_id_fkey" FOREIGN KEY ("movement_type_id") REFERENCES "public"."inventory_movement_types"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."zz_deprecated_warehouses"("id");



ALTER TABLE ONLY "public"."market_checkouts"
    ADD CONSTRAINT "market_checkouts_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."media_library"
    ADD CONSTRAINT "media_library_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_library"
    ADD CONSTRAINT "media_library_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id");



ALTER TABLE ONLY "public"."ml_credentials"
    ADD CONSTRAINT "ml_credentials_connected_by_fkey" FOREIGN KEY ("connected_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ml_listings"
    ADD CONSTRAINT "ml_listings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."productos_market"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ml_sync_queue"
    ADD CONSTRAINT "ml_sync_queue_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."productos_market"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mp_credentials"
    ADD CONSTRAINT "mp_credentials_connected_by_fkey" FOREIGN KEY ("connected_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("iso_code");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."ordenes"
    ADD CONSTRAINT "ordenes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "public"."market_checkouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_seller_order_id_fkey" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zz_deprecated_product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zz_deprecated_product_media"
    ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."productos_market"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."productos_market"
    ADD CONSTRAINT "productos_market_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id");



ALTER TABLE ONLY "public"."productos_secondhand"
    ADD CONSTRAINT "productos_secondhand_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id");



ALTER TABLE ONLY "public"."productos_secondhand"
    ADD CONSTRAINT "productos_secondhand_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."zz_deprecated_secondhand_listings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewed_id_fkey" FOREIGN KEY ("reviewed_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zz_deprecated_secondhand_listings"
    ADD CONSTRAINT "secondhand_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_order_items"
    ADD CONSTRAINT "seller_order_items_checkout_item_id_fkey" FOREIGN KEY ("checkout_item_id") REFERENCES "public"."checkout_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."seller_order_items"
    ADD CONSTRAINT "seller_order_items_seller_order_id_fkey" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_orders"
    ADD CONSTRAINT "seller_orders_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_orders"
    ADD CONSTRAINT "seller_orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."seller_payouts"
    ADD CONSTRAINT "seller_payouts_payment_allocation_id_fkey" FOREIGN KEY ("payment_allocation_id") REFERENCES "public"."payment_allocations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."seller_payouts"
    ADD CONSTRAINT "seller_payouts_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."seller_payouts"
    ADD CONSTRAINT "seller_payouts_seller_order_id_fkey" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zz_deprecated_store_products"
    ADD CONSTRAINT "store_products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."subcategorias"
    ADD CONSTRAINT "subcategorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."territories"
    ADD CONSTRAINT "territories_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id");



ALTER TABLE ONLY "public"."trade_documents"
    ADD CONSTRAINT "trade_documents_trade_operation_id_fkey" FOREIGN KEY ("trade_operation_id") REFERENCES "public"."trade_operations"("id");



ALTER TABLE ONLY "public"."trade_events"
    ADD CONSTRAINT "trade_events_trade_operation_id_fkey" FOREIGN KEY ("trade_operation_id") REFERENCES "public"."trade_operations"("id");



ALTER TABLE ONLY "public"."trade_operation_items"
    ADD CONSTRAINT "trade_operation_items_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id");



ALTER TABLE ONLY "public"."trade_operation_items"
    ADD CONSTRAINT "trade_operation_items_hs_code_id_fkey" FOREIGN KEY ("hs_code_id") REFERENCES "public"."hs_codes"("id");



ALTER TABLE ONLY "public"."trade_operation_items"
    ADD CONSTRAINT "trade_operation_items_trade_operation_id_fkey" FOREIGN KEY ("trade_operation_id") REFERENCES "public"."trade_operations"("id");



ALTER TABLE ONLY "public"."trade_operations"
    ADD CONSTRAINT "trade_operations_destination_territory_id_fkey" FOREIGN KEY ("destination_territory_id") REFERENCES "public"."territories"("id");



ALTER TABLE ONLY "public"."trade_operations"
    ADD CONSTRAINT "trade_operations_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id");



ALTER TABLE ONLY "public"."trade_operations"
    ADD CONSTRAINT "trade_operations_origin_territory_id_fkey" FOREIGN KEY ("origin_territory_id") REFERENCES "public"."territories"("id");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_contacts"
    ADD CONSTRAINT "user_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles_extended"
    ADD CONSTRAINT "user_profiles_extended_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "addr_delete_own" ON "public"."addresses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "addr_insert_own" ON "public"."addresses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "addr_select_own" ON "public"."addresses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "addr_update_own" ON "public"."addresses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin access only" ON "public"."departamentos" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "admin full access categorias" ON "public"."categorias" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin full access departamentos" ON "public"."departamentos" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin full access subcategorias" ON "public"."subcategorias" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin only access" ON "public"."departamentos" USING ("public"."is_admin"());



CREATE POLICY "admin read ml_listings" ON "public"."ml_listings" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."api_vault" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "api_vault: usuario actualiza los suyos" ON "public"."api_vault" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "api_vault: usuario elimina los suyos" ON "public"."api_vault" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "api_vault: usuario inserta los suyos" ON "public"."api_vault" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "api_vault: usuario lee los suyos" ON "public"."api_vault" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "art_delete" ON "public"."articulos" FOR DELETE TO "authenticated" USING (("vendedor_id" = "auth"."uid"()));



CREATE POLICY "art_insert" ON "public"."articulos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "art_select_own" ON "public"."articulos" FOR SELECT TO "authenticated" USING (("vendedor_id" = "auth"."uid"()));



CREATE POLICY "art_select_public" ON "public"."articulos" FOR SELECT USING ((("status" = 'active'::"text") AND ("deleted_at" IS NULL)));



CREATE POLICY "art_update" ON "public"."articulos" FOR UPDATE TO "authenticated" USING (("vendedor_id" = "auth"."uid"()));



ALTER TABLE "public"."articulo_variantes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."articulos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "articulos_insert_open" ON "public"."articulos" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_admin_select" ON "public"."audit_logs" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."brand_distributors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brands_read_active" ON "public"."brands" FOR SELECT USING ((("deleted_at" IS NULL) AND ("status" = 'active'::"text")));



ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carrito" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "carrito public" ON "public"."carrito" USING (true) WITH CHECK (true);



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cat_public" ON "public"."categorias" FOR SELECT USING (("activo" = true));



ALTER TABLE "public"."catalog_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_nodes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalog_nodes_admin_write" ON "public"."catalog_nodes" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "catalog_nodes_public_read" ON "public"."catalog_nodes" FOR SELECT USING (true);



ALTER TABLE "public"."catalog_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_taxonomy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categoria_atributo_opciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categoria_atributos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categorias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checkout_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkout_items_select_own" ON "public"."checkout_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."checkouts" "c"
  WHERE (("c"."id" = "checkout_items"."checkout_id") AND ("c"."buyer_id" = "auth"."uid"())))));



CREATE POLICY "checkout_select_own" ON "public"."checkouts" FOR SELECT TO "authenticated" USING (("buyer_id" = "auth"."uid"()));



ALTER TABLE "public"."checkouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."core_services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "core_services_read_all" ON "public"."core_services" FOR SELECT USING (true);



ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "countries_read_all" ON "public"."countries" FOR SELECT USING (true);



ALTER TABLE "public"."currencies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete_own_media" ON "public"."media_library" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "dep_public" ON "public"."departamentos" FOR SELECT USING (("activo" = true));



ALTER TABLE "public"."departamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."distributors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entities_read_active" ON "public"."entities" FOR SELECT USING ((("deleted_at" IS NULL) AND ("status" = 'active'::"text")));



ALTER TABLE "public"."entity_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_admin_select" ON "public"."events" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "events_insert_anon" ON "public"."events" FOR INSERT TO "anon" WITH CHECK (("user_id" IS NULL));



CREATE POLICY "events_insert_authenticated" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."exchange_rate_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fav_all_own" ON "public"."favorites" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hs_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_media" ON "public"."media_library" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "inv_items_auth" ON "public"."zz_deprecated_inventory_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "inv_locations_auth" ON "public"."inventory_locations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "inv_movements_auth" ON "public"."inventory_movements" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."inventory_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_movement_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."languages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listings_delete_own" ON "public"."zz_deprecated_secondhand_listings" FOR DELETE USING (("auth"."uid"() = "seller_id"));



CREATE POLICY "listings_insert_auth" ON "public"."zz_deprecated_secondhand_listings" FOR INSERT WITH CHECK (("auth"."uid"() = "seller_id"));



CREATE POLICY "listings_select_active" ON "public"."zz_deprecated_secondhand_listings" FOR SELECT USING ((("status" = 'active'::"public"."listing_status") OR ("auth"."uid"() = "seller_id")));



CREATE POLICY "listings_update_own" ON "public"."zz_deprecated_secondhand_listings" FOR UPDATE USING (("auth"."uid"() = "seller_id"));



ALTER TABLE "public"."market_checkouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "market_checkouts_insert_own" ON "public"."market_checkouts" FOR INSERT TO "authenticated" WITH CHECK (("buyer_id" = "auth"."uid"()));



CREATE POLICY "market_checkouts_select_own" ON "public"."market_checkouts" FOR SELECT TO "authenticated" USING (("buyer_id" = "auth"."uid"()));



CREATE POLICY "market_checkouts_update_own" ON "public"."market_checkouts" FOR UPDATE TO "authenticated" USING (("buyer_id" = "auth"."uid"())) WITH CHECK (("buyer_id" = "auth"."uid"()));



CREATE POLICY "market_delete" ON "public"."productos_market" FOR DELETE TO "authenticated" USING (("vendedor_id" = "auth"."uid"()));



CREATE POLICY "market_insert" ON "public"."productos_market" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "vendedor_id"));



CREATE POLICY "market_update" ON "public"."productos_market" FOR UPDATE TO "authenticated" USING (("vendedor_id" = "auth"."uid"())) WITH CHECK (("vendedor_id" = "auth"."uid"()));



ALTER TABLE "public"."media_library" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meetings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ml_category_admin_select" ON "public"."ml_category_mapping" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."ml_category_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ml_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ml_delete_own" ON "public"."media_library" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "ml_insert_own" ON "public"."media_library" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ml_listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ml_listings_admin_select" ON "public"."ml_listings" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "ml_select_own" ON "public"."media_library" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ml_sync_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ml_update_own" ON "public"."media_library" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ml_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mp_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notif_own" ON "public"."notifications" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "oitems_insert_order" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND (("o"."buyer_id" = "auth"."uid"()) OR ("o"."seller_id" = "auth"."uid"()))))));



CREATE POLICY "oitems_select_parties" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND (("o"."buyer_id" = "auth"."uid"()) OR ("o"."seller_id" = "auth"."uid"()))))));



ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ordenes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ordenes_insert" ON "public"."ordenes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "ordenes_select" ON "public"."ordenes" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_select" ON "public"."order_items" FOR SELECT TO "authenticated" USING (("order_id" IN ( SELECT "ordenes"."id"
   FROM "public"."ordenes"
  WHERE ("ordenes"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_insert_buyer" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "orders_select_parties" ON "public"."orders" FOR SELECT USING ((("auth"."uid"() = "buyer_id") OR ("auth"."uid"() = "seller_id")));



CREATE POLICY "orders_update_seller" ON "public"."orders" FOR UPDATE USING ((("auth"."uid"() = "seller_id") OR ("auth"."uid"() = "buyer_id")));



ALTER TABLE "public"."payment_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_allocations_select_participant" ON "public"."payment_allocations" FOR SELECT TO "authenticated" USING ((("seller_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."checkouts" "c"
  WHERE (("c"."id" = "payment_allocations"."checkout_id") AND ("c"."buyer_id" = "auth"."uid"()))))));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_select_parties" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND (("o"."buyer_id" = "auth"."uid"()) OR ("o"."seller_id" = "auth"."uid"()))))));



ALTER TABLE "public"."platforms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_media_admin_write" ON "public"."zz_deprecated_product_media" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "product_media_public_read" ON "public"."zz_deprecated_product_media" FOR SELECT USING (true);



ALTER TABLE "public"."product_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_prices_insert" ON "public"."product_prices" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "product_prices_select" ON "public"."product_prices" FOR SELECT USING (true);



CREATE POLICY "product_prices_select_safe" ON "public"."product_prices" FOR SELECT USING (true);



CREATE POLICY "product_prices_update" ON "public"."product_prices" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."productos_market" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."productos_secondhand" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete_owner" ON "public"."products" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "products_insert_owner" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "products_select_active" ON "public"."products" FOR SELECT USING ((("status" = 'active'::"text") OR ("auth"."uid"() = "owner_id")));



CREATE POLICY "products_select_public" ON "public"."products" FOR SELECT USING (("is_active" = true));



CREATE POLICY "products_update_owner" ON "public"."products" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_public" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "public read categorias" ON "public"."categorias" FOR SELECT USING (true);



CREATE POLICY "public read departamentos" ON "public"."departamentos" FOR SELECT USING (true);



CREATE POLICY "public read market" ON "public"."productos_market" FOR SELECT USING (true);



CREATE POLICY "public read subcategorias" ON "public"."subcategorias" FOR SELECT USING (true);



CREATE POLICY "read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_insert_own" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "reviews_select_all" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "reviews_update_own" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "secondhand_delete" ON "public"."productos_secondhand" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "secondhand_insert" ON "public"."productos_secondhand" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "secondhand_select" ON "public"."productos_secondhand" FOR SELECT USING ((("status" = 'active'::"text") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "secondhand_update" ON "public"."productos_secondhand" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "select_own_media" ON "public"."media_library" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."seller_order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seller_order_items_select_participant" ON "public"."seller_order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."seller_orders" "so"
     JOIN "public"."checkouts" "c" ON (("c"."id" = "so"."checkout_id")))
  WHERE (("so"."id" = "seller_order_items"."seller_order_id") AND (("so"."seller_id" = "auth"."uid"()) OR ("c"."buyer_id" = "auth"."uid"()))))));



ALTER TABLE "public"."seller_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seller_orders_select_participant" ON "public"."seller_orders" FOR SELECT TO "authenticated" USING ((("seller_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."checkouts" "c"
  WHERE (("c"."id" = "seller_orders"."checkout_id") AND ("c"."buyer_id" = "auth"."uid"()))))));



ALTER TABLE "public"."seller_payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seller_payouts_select_own" ON "public"."seller_payouts" FOR SELECT TO "authenticated" USING (("seller_id" = "auth"."uid"()));



CREATE POLICY "service_only" ON "public"."catalog_events" USING (false);



CREATE POLICY "service_role_all_ml" ON "public"."ml_credentials" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_mp" ON "public"."mp_credentials" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."store_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_members_auth_admin_read" ON "public"."store_members" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "store_members_self_read" ON "public"."store_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stores_auth_admin_read" ON "public"."stores" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "stores_member_read" ON "public"."stores" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "sm"."store_id"
   FROM "public"."store_members" "sm"
  WHERE ("sm"."user_id" = "auth"."uid"()))));



CREATE POLICY "sub_public" ON "public"."subcategorias" FOR SELECT USING (("activo" = true));



ALTER TABLE "public"."subcategorias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_isolation" ON "public"."catalog_inventory" USING (("variant_id" IN ( SELECT "v"."id"
   FROM ("public"."catalog_variants" "v"
     JOIN "public"."catalog_items" "i" ON (("i"."id" = "v"."item_id")))
  WHERE ("i"."tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid"))));



CREATE POLICY "tenant_isolation" ON "public"."catalog_items" USING (("tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid"));



CREATE POLICY "tenant_isolation" ON "public"."catalog_listings" USING (("variant_id" IN ( SELECT "v"."id"
   FROM ("public"."catalog_variants" "v"
     JOIN "public"."catalog_items" "i" ON (("i"."id" = "v"."item_id")))
  WHERE ("i"."tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid"))));



CREATE POLICY "tenant_isolation" ON "public"."catalog_locations" USING (("tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid"));



CREATE POLICY "tenant_isolation" ON "public"."catalog_media" USING (("item_id" IN ( SELECT "catalog_items"."id"
   FROM "public"."catalog_items"
  WHERE ("catalog_items"."tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid"))));



CREATE POLICY "tenant_isolation" ON "public"."catalog_prices" USING (
CASE
    WHEN ("variant_id" IS NOT NULL) THEN ("variant_id" IN ( SELECT "v"."id"
       FROM ("public"."catalog_variants" "v"
         JOIN "public"."catalog_items" "i" ON (("i"."id" = "v"."item_id")))
      WHERE ("i"."tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid")))
    ELSE ("item_id" IN ( SELECT "catalog_items"."id"
       FROM "public"."catalog_items"
      WHERE ("catalog_items"."tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid")))
END);



CREATE POLICY "tenant_isolation" ON "public"."catalog_sync_log" USING (("listing_id" IN ( SELECT "l"."id"
   FROM (("public"."catalog_listings" "l"
     JOIN "public"."catalog_variants" "v" ON (("v"."id" = "l"."variant_id")))
     JOIN "public"."catalog_items" "i" ON (("i"."id" = "v"."item_id")))
  WHERE ("i"."tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid"))));



CREATE POLICY "tenant_isolation" ON "public"."catalog_taxonomy" USING (("tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid"));



CREATE POLICY "tenant_isolation" ON "public"."catalog_variants" USING (("item_id" IN ( SELECT "catalog_items"."id"
   FROM "public"."catalog_items"
  WHERE ("catalog_items"."tenant_id" = (("auth"."jwt"() ->> 'store_id'::"text"))::"uuid"))));



ALTER TABLE "public"."territories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "territories_read_all" ON "public"."territories" FOR SELECT USING (true);



ALTER TABLE "public"."trade_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trade_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trade_operation_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trade_operations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."translations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_own_media" ON "public"."media_library" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user addresses access" ON "public"."user_addresses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user addresses delete" ON "public"."user_addresses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user addresses insert" ON "public"."user_addresses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user addresses select" ON "public"."user_addresses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user addresses update" ON "public"."user_addresses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user contacts access" ON "public"."user_contacts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user preferences access" ON "public"."user_preferences" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user profile insert" ON "public"."user_profiles_extended" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "user profile select" ON "public"."user_profiles_extended" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "user profile update" ON "public"."user_profiles_extended" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "user profile upsert" ON "public"."user_profiles_extended" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."user_addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_addresses_own" ON "public"."user_addresses" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles_extended" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "var_all_auth" ON "public"."articulo_variantes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."articulos" "a"
  WHERE (("a"."id" = "articulo_variantes"."articulo_id") AND ("a"."vendedor_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."articulos" "a"
  WHERE (("a"."id" = "articulo_variantes"."articulo_id") AND ("a"."vendedor_id" = "auth"."uid"())))));



CREATE POLICY "var_select_public" ON "public"."articulo_variantes" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "warehouses_auth" ON "public"."zz_deprecated_warehouses" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zz_deprecated_article_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zz_deprecated_inventory_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zz_deprecated_product_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zz_deprecated_product_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zz_deprecated_secondhand_listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zz_deprecated_store_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zz_deprecated_warehouses" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."actualizar_publicacion"("p_variant_id" "uuid", "p_title" "text", "p_description" "text", "p_status" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_stock" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."actualizar_publicacion"("p_variant_id" "uuid", "p_title" "text", "p_description" "text", "p_status" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_stock" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."actualizar_publicacion"("p_variant_id" "uuid", "p_title" "text", "p_description" "text", "p_status" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_stock" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_category"("p_department_id" "uuid", "p_name" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_category"("p_department_id" "uuid", "p_name" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_category"("p_department_id" "uuid", "p_name" "text", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_department"("p_name" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_department"("p_name" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_department"("p_name" "text", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_subcategory"("p_category_id" "uuid", "p_name" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_subcategory"("p_category_id" "uuid", "p_name" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_subcategory"("p_category_id" "uuid", "p_name" "text", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_category"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_category"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_category"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_department"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_department"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_department"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_subcategory"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_subcategory"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_subcategory"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_enqueue_ml_sync"("p_product_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_enqueue_ml_sync"("p_product_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_enqueue_ml_sync"("p_product_id" "uuid", "p_action" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_fix_stock"("p_product_id" "uuid", "p_new_stock" integer, "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_fix_stock"("p_product_id" "uuid", "p_new_stock" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_fix_stock"("p_product_id" "uuid", "p_new_stock" integer, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_pause_product"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_pause_product"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_pause_product"("p_product_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_publish_ml"("p_product_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_publish_ml"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_publish_ml"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_category"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_department_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_category"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_department_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_category"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_department_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_department"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_department"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_department"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_nombre" "text", "p_precio" numeric, "p_stock" integer, "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_nombre" "text", "p_precio" numeric, "p_stock" integer, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_nombre" "text", "p_precio" numeric, "p_stock" integer, "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_subcategory"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_subcategory"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_subcategory"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_category_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."catalog_inventory" TO "anon";
GRANT ALL ON TABLE "public"."catalog_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_inventory" TO "service_role";



GRANT ALL ON FUNCTION "public"."catalog_adjust_inventory"("p_variant_id" "uuid", "p_location_id" "uuid", "p_delta" integer, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."catalog_adjust_inventory"("p_variant_id" "uuid", "p_location_id" "uuid", "p_delta" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."catalog_adjust_inventory"("p_variant_id" "uuid", "p_location_id" "uuid", "p_delta" integer, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."catalog_publicaciones"("p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."catalog_publicaciones"("p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."catalog_publicaciones"("p_currency" "text") TO "service_role";



GRANT ALL ON TABLE "public"."catalog_taxonomy" TO "anon";
GRANT ALL ON TABLE "public"."catalog_taxonomy" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_taxonomy" TO "service_role";



GRANT ALL ON FUNCTION "public"."catalog_taxonomy_ancestors"("p_path" "public"."ltree", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."catalog_taxonomy_ancestors"("p_path" "public"."ltree", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."catalog_taxonomy_ancestors"("p_path" "public"."ltree", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."catalog_vidriera"("p_currency" "text", "p_limit" integer, "p_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."catalog_vidriera"("p_currency" "text", "p_limit" integer, "p_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."catalog_vidriera"("p_currency" "text", "p_limit" integer, "p_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_system_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_system_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_system_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_payment_net"() TO "anon";
GRANT ALL ON FUNCTION "public"."compute_payment_net"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_payment_net"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."confirmar_pago"("p_order_id" "uuid", "p_payment_id" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirmar_pago"("p_order_id" "uuid", "p_payment_id" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."core_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."core_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."core_set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."crear_orden"("p_user_id" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."crear_orden"("p_user_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_orden"("p_user_id" "uuid", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."crear_orden_segura"("p_user_id" "uuid", "p_items" "jsonb", "p_nombre" "text", "p_email" "text", "p_telefono" "text", "p_direccion" "text", "p_ciudad" "text", "p_codigo_postal" "text", "p_tipo_comprador" "text", "p_documento" "text", "p_razon_social" "text", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."crear_orden_segura"("p_user_id" "uuid", "p_items" "jsonb", "p_nombre" "text", "p_email" "text", "p_telefono" "text", "p_direccion" "text", "p_ciudad" "text", "p_codigo_postal" "text", "p_tipo_comprador" "text", "p_documento" "text", "p_razon_social" "text", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_orden_segura"("p_user_id" "uuid", "p_items" "jsonb", "p_nombre" "text", "p_email" "text", "p_telefono" "text", "p_direccion" "text", "p_ciudad" "text", "p_codigo_postal" "text", "p_tipo_comprador" "text", "p_documento" "text", "p_razon_social" "text", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."crear_publicacion"("p_title" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_description" "text", "p_stock" integer, "p_channels" "text"[], "p_status" "text", "p_attributes" "jsonb", "p_images" "text"[], "p_videos" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."crear_publicacion"("p_title" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_description" "text", "p_stock" integer, "p_channels" "text"[], "p_status" "text", "p_attributes" "jsonb", "p_images" "text"[], "p_videos" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_publicacion"("p_title" "text", "p_price" numeric, "p_currency" "text", "p_sku" "text", "p_description" "text", "p_stock" integer, "p_channels" "text"[], "p_status" "text", "p_attributes" "jsonb", "p_images" "text"[], "p_videos" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_catalog_node"("p_parent_id" "uuid", "p_name" "text", "p_type" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_catalog_node"("p_parent_id" "uuid", "p_name" "text", "p_type" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_catalog_node"("p_parent_id" "uuid", "p_name" "text", "p_type" "text", "p_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."delete_catalog_node"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_catalog_node"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_catalog_node"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."descontar_stock"("p_product_id" "uuid", "p_quantity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."descontar_stock"("p_product_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."descontar_stock"("p_product_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."descontar_stock_market"("p_id" "uuid", "cantidad" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."descontar_stock_market"("p_id" "uuid", "cantidad" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."descontar_stock_market"("p_id" "uuid", "cantidad" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_single_default_address"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_single_default_address"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_single_default_address"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_ml_stock_update"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_ml_stock_update"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_ml_stock_update"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_address"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_address"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_address"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_catalog_tree"("p_parent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_catalog_tree"("p_parent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_catalog_tree"("p_parent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ml_category"("p_oddy_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ml_category"("p_oddy_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ml_category"("p_oddy_category" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_ml_token"("p_site_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_ml_token"("p_site_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_mp_token"("p_site_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_mp_token"("p_site_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_status"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_status"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_status"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_payment_status"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_payment_status"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_payment_status"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_near"("lat" numeric, "lng" numeric, "radius_km" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_near"("lat" numeric, "lng" numeric, "radius_km" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_near"("lat" numeric, "lng" numeric, "radius_km" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."listings_search_vector_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."listings_search_vector_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."listings_search_vector_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_event"("p_event_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_event"("p_event_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_event"("p_event_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."market_checkout_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."market_checkout_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."market_checkout_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ml_credentials_mark_error"("p_site_id" "text", "p_error" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ml_credentials_mark_error"("p_site_id" "text", "p_error" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ml_credentials_mark_error"("p_site_id" "text", "p_error" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."move_catalog_node"("p_node_id" "uuid", "p_new_parent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."move_catalog_node"("p_node_id" "uuid", "p_new_parent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_catalog_node"("p_node_id" "uuid", "p_new_parent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mp_credentials_mark_error"("p_site_id" "text", "p_error" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mp_credentials_mark_error"("p_site_id" "text", "p_error" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mp_credentials_mark_error"("p_site_id" "text", "p_error" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."products_search_vector_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."products_search_vector_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."products_search_vector_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."profiles_protect_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."profiles_protect_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."profiles_protect_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reconcile_stock"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_stock"() TO "service_role";



GRANT ALL ON TABLE "public"."catalog_prices" TO "anon";
GRANT ALL ON TABLE "public"."catalog_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_prices" TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_price"("p_variant_id" "uuid", "p_currency" character, "p_channel" "text", "p_price_list" "text", "p_country" character, "p_campaign" "text", "p_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_price"("p_variant_id" "uuid", "p_currency" character, "p_channel" "text", "p_price_list" "text", "p_country" character, "p_campaign" "text", "p_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_price"("p_variant_id" "uuid", "p_currency" character, "p_channel" "text", "p_price_list" "text", "p_country" character, "p_campaign" "text", "p_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_product_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_product_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_product_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_canal_publicacion"("p_variant_id" "uuid", "p_channel" "text", "p_activo" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_canal_publicacion"("p_variant_id" "uuid", "p_channel" "text", "p_activo" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_canal_publicacion"("p_variant_id" "uuid", "p_channel" "text", "p_activo" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."track_event"("p_user_id" "uuid", "p_event_type" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."track_event"("p_user_id" "uuid", "p_event_type" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_event"("p_user_id" "uuid", "p_event_type" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_enqueue_ml_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_enqueue_ml_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_enqueue_ml_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_log_order_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_log_order_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_log_order_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_log_payment_confirmed"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_log_payment_confirmed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_log_payment_confirmed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_log_status_changed"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_log_status_changed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_log_status_changed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_log_stock_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_log_stock_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_log_stock_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_validate_ml_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_validate_ml_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_validate_ml_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_validate_status_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_validate_status_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_validate_status_transition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_catalog_node"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_image_url" "text", "p_position" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_catalog_node"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_image_url" "text", "p_position" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_catalog_node"("p_id" "uuid", "p_name" "text", "p_slug" "text", "p_is_active" boolean, "p_image_url" "text", "p_position" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_seller_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_seller_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_seller_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validar_atributos_articulo"() TO "anon";
GRANT ALL ON FUNCTION "public"."validar_atributos_articulo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validar_atributos_articulo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_ml_sync"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_ml_sync"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_ml_sync"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vender_secondhand"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vender_secondhand"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vender_secondhand"("p_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ml_sync_queue" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ml_sync_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."ml_sync_queue" TO "service_role";



GRANT ALL ON TABLE "public"."productos_market" TO "anon";
GRANT ALL ON TABLE "public"."productos_market" TO "authenticated";
GRANT ALL ON TABLE "public"."productos_market" TO "service_role";



GRANT ALL ON TABLE "public"."admin_ml_errors" TO "anon";
GRANT ALL ON TABLE "public"."admin_ml_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_ml_errors" TO "service_role";



GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_prices" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."product_prices" TO "service_role";



GRANT ALL ON TABLE "public"."admin_products" TO "anon";
GRANT ALL ON TABLE "public"."admin_products" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_products" TO "service_role";



GRANT ALL ON TABLE "public"."ordenes" TO "anon";
GRANT ALL ON TABLE "public"."ordenes" TO "authenticated";
GRANT ALL ON TABLE "public"."ordenes" TO "service_role";



GRANT ALL ON TABLE "public"."productos_secondhand" TO "anon";
GRANT ALL ON TABLE "public"."productos_secondhand" TO "authenticated";
GRANT ALL ON TABLE "public"."productos_secondhand" TO "service_role";



GRANT ALL ON TABLE "public"."admin_stats" TO "anon";
GRANT ALL ON TABLE "public"."admin_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_stats" TO "service_role";



GRANT ALL ON TABLE "public"."api_vault" TO "anon";
GRANT ALL ON TABLE "public"."api_vault" TO "authenticated";
GRANT ALL ON TABLE "public"."api_vault" TO "service_role";



GRANT ALL ON TABLE "public"."articulo_variantes" TO "anon";
GRANT ALL ON TABLE "public"."articulo_variantes" TO "authenticated";
GRANT ALL ON TABLE "public"."articulo_variantes" TO "service_role";



GRANT ALL ON TABLE "public"."articulos" TO "anon";
GRANT ALL ON TABLE "public"."articulos" TO "authenticated";
GRANT ALL ON TABLE "public"."articulos" TO "service_role";



GRANT ALL ON TABLE "public"."articulos_con_variantes" TO "anon";
GRANT ALL ON TABLE "public"."articulos_con_variantes" TO "authenticated";
GRANT ALL ON TABLE "public"."articulos_con_variantes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_logs" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."brand_distributors" TO "anon";
GRANT ALL ON TABLE "public"."brand_distributors" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_distributors" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."carrito" TO "anon";
GRANT ALL ON TABLE "public"."carrito" TO "authenticated";
GRANT ALL ON TABLE "public"."carrito" TO "service_role";



GRANT ALL ON TABLE "public"."carrito_detalle" TO "anon";
GRANT ALL ON TABLE "public"."carrito_detalle" TO "authenticated";
GRANT ALL ON TABLE "public"."carrito_detalle" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_events" TO "anon";
GRANT ALL ON TABLE "public"."catalog_events" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_events" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_items" TO "anon";
GRANT ALL ON TABLE "public"."catalog_items" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_items" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_listings" TO "anon";
GRANT ALL ON TABLE "public"."catalog_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_listings" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_locations" TO "anon";
GRANT ALL ON TABLE "public"."catalog_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_locations" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_media" TO "anon";
GRANT ALL ON TABLE "public"."catalog_media" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_media" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_nodes" TO "anon";
GRANT ALL ON TABLE "public"."catalog_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_nodes" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."catalog_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_variants" TO "anon";
GRANT ALL ON TABLE "public"."catalog_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_variants" TO "service_role";



GRANT ALL ON TABLE "public"."categoria_atributo_opciones" TO "anon";
GRANT ALL ON TABLE "public"."categoria_atributo_opciones" TO "authenticated";
GRANT ALL ON TABLE "public"."categoria_atributo_opciones" TO "service_role";



GRANT ALL ON TABLE "public"."categoria_atributos" TO "anon";
GRANT ALL ON TABLE "public"."categoria_atributos" TO "authenticated";
GRANT ALL ON TABLE "public"."categoria_atributos" TO "service_role";



GRANT ALL ON TABLE "public"."categorias" TO "anon";
GRANT ALL ON TABLE "public"."categorias" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias" TO "service_role";



GRANT ALL ON TABLE "public"."channels" TO "anon";
GRANT ALL ON TABLE "public"."channels" TO "authenticated";
GRANT ALL ON TABLE "public"."channels" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_items" TO "anon";
GRANT ALL ON TABLE "public"."checkout_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_items" TO "service_role";



GRANT ALL ON TABLE "public"."checkouts" TO "anon";
GRANT ALL ON TABLE "public"."checkouts" TO "authenticated";
GRANT ALL ON TABLE "public"."checkouts" TO "service_role";



GRANT ALL ON TABLE "public"."core_services" TO "anon";
GRANT ALL ON TABLE "public"."core_services" TO "authenticated";
GRANT ALL ON TABLE "public"."core_services" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."currencies" TO "anon";
GRANT ALL ON TABLE "public"."currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."currencies" TO "service_role";



GRANT ALL ON TABLE "public"."departamentos" TO "anon";
GRANT ALL ON TABLE "public"."departamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."departamentos" TO "service_role";



GRANT ALL ON TABLE "public"."distributors" TO "anon";
GRANT ALL ON TABLE "public"."distributors" TO "authenticated";
GRANT ALL ON TABLE "public"."distributors" TO "service_role";



GRANT ALL ON TABLE "public"."entities" TO "anon";
GRANT ALL ON TABLE "public"."entities" TO "authenticated";
GRANT ALL ON TABLE "public"."entities" TO "service_role";



GRANT ALL ON TABLE "public"."entity_services" TO "anon";
GRANT ALL ON TABLE "public"."entity_services" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_services" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rate_sources" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rate_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rate_sources" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."favorites" TO "anon";
GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";



GRANT ALL ON TABLE "public"."hs_codes" TO "anon";
GRANT ALL ON TABLE "public"."hs_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."hs_codes" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_locations" TO "anon";
GRANT ALL ON TABLE "public"."inventory_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_locations" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movement_types" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movement_types" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movement_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_movement_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_movement_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_movement_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movements" TO "service_role";



GRANT ALL ON TABLE "public"."languages" TO "anon";
GRANT ALL ON TABLE "public"."languages" TO "authenticated";
GRANT ALL ON TABLE "public"."languages" TO "service_role";



GRANT ALL ON TABLE "public"."market_checkouts" TO "anon";
GRANT ALL ON TABLE "public"."market_checkouts" TO "authenticated";
GRANT ALL ON TABLE "public"."market_checkouts" TO "service_role";



GRANT ALL ON TABLE "public"."media_library" TO "anon";
GRANT ALL ON TABLE "public"."media_library" TO "authenticated";
GRANT ALL ON TABLE "public"."media_library" TO "service_role";



GRANT ALL ON TABLE "public"."meetings" TO "anon";
GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ml_category_mapping" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ml_category_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."ml_category_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."ml_credentials" TO "anon";
GRANT ALL ON TABLE "public"."ml_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."ml_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."ml_credentials_status" TO "anon";
GRANT ALL ON TABLE "public"."ml_credentials_status" TO "authenticated";
GRANT ALL ON TABLE "public"."ml_credentials_status" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ml_listings" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ml_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."ml_listings" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ml_webhook_events" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ml_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."ml_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."mp_credentials" TO "anon";
GRANT ALL ON TABLE "public"."mp_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."mp_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."mp_credentials_status" TO "anon";
GRANT ALL ON TABLE "public"."mp_credentials_status" TO "authenticated";
GRANT ALL ON TABLE "public"."mp_credentials_status" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."opportunities" TO "anon";
GRANT ALL ON TABLE "public"."opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."orders_with_details" TO "anon";
GRANT ALL ON TABLE "public"."orders_with_details" TO "authenticated";
GRANT ALL ON TABLE "public"."orders_with_details" TO "service_role";



GRANT ALL ON TABLE "public"."payment_allocations" TO "anon";
GRANT ALL ON TABLE "public"."payment_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."platforms" TO "anon";
GRANT ALL ON TABLE "public"."platforms" TO "authenticated";
GRANT ALL ON TABLE "public"."platforms" TO "service_role";



GRANT ALL ON TABLE "public"."revenue_by_day" TO "anon";
GRANT ALL ON TABLE "public"."revenue_by_day" TO "authenticated";
GRANT ALL ON TABLE "public"."revenue_by_day" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."seller_order_items" TO "anon";
GRANT ALL ON TABLE "public"."seller_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."seller_orders" TO "anon";
GRANT ALL ON TABLE "public"."seller_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."seller_orders_seller_order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."seller_orders_seller_order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."seller_orders_seller_order_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."seller_payouts" TO "anon";
GRANT ALL ON TABLE "public"."seller_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."zz_deprecated_inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."zz_deprecated_inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."zz_deprecated_inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_por_sku" TO "anon";
GRANT ALL ON TABLE "public"."stock_por_sku" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_por_sku" TO "service_role";



GRANT ALL ON TABLE "public"."store_members" TO "anon";
GRANT ALL ON TABLE "public"."store_members" TO "authenticated";
GRANT ALL ON TABLE "public"."store_members" TO "service_role";
GRANT SELECT ON TABLE "public"."store_members" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";
GRANT SELECT ON TABLE "public"."stores" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."subcategorias" TO "anon";
GRANT ALL ON TABLE "public"."subcategorias" TO "authenticated";
GRANT ALL ON TABLE "public"."subcategorias" TO "service_role";



GRANT ALL ON TABLE "public"."territories" TO "anon";
GRANT ALL ON TABLE "public"."territories" TO "authenticated";
GRANT ALL ON TABLE "public"."territories" TO "service_role";



GRANT ALL ON TABLE "public"."trade_documents" TO "anon";
GRANT ALL ON TABLE "public"."trade_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_documents" TO "service_role";



GRANT ALL ON TABLE "public"."trade_events" TO "anon";
GRANT ALL ON TABLE "public"."trade_events" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_events" TO "service_role";



GRANT ALL ON TABLE "public"."trade_operation_items" TO "anon";
GRANT ALL ON TABLE "public"."trade_operation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_operation_items" TO "service_role";



GRANT ALL ON TABLE "public"."trade_operations" TO "anon";
GRANT ALL ON TABLE "public"."trade_operations" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_operations" TO "service_role";



GRANT ALL ON TABLE "public"."translations" TO "anon";
GRANT ALL ON TABLE "public"."translations" TO "authenticated";
GRANT ALL ON TABLE "public"."translations" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "anon";
GRANT ALL ON TABLE "public"."user_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."user_contacts" TO "anon";
GRANT ALL ON TABLE "public"."user_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles_extended" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles_extended" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles_extended" TO "service_role";



GRANT ALL ON TABLE "public"."v_catalog_listings_priced" TO "anon";
GRANT ALL ON TABLE "public"."v_catalog_listings_priced" TO "authenticated";
GRANT ALL ON TABLE "public"."v_catalog_listings_priced" TO "service_role";



GRANT ALL ON TABLE "public"."v_catalog_variants_full" TO "anon";
GRANT ALL ON TABLE "public"."v_catalog_variants_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_catalog_variants_full" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."webhook_events" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."zz_deprecated_admin_orders" TO "anon";
GRANT ALL ON TABLE "public"."zz_deprecated_admin_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."zz_deprecated_admin_orders" TO "service_role";



GRANT ALL ON TABLE "public"."zz_deprecated_article_prices" TO "anon";
GRANT ALL ON TABLE "public"."zz_deprecated_article_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."zz_deprecated_article_prices" TO "service_role";



GRANT ALL ON TABLE "public"."zz_deprecated_product_images" TO "anon";
GRANT ALL ON TABLE "public"."zz_deprecated_product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."zz_deprecated_product_images" TO "service_role";



GRANT ALL ON TABLE "public"."zz_deprecated_product_media" TO "anon";
GRANT ALL ON TABLE "public"."zz_deprecated_product_media" TO "authenticated";
GRANT ALL ON TABLE "public"."zz_deprecated_product_media" TO "service_role";



GRANT ALL ON TABLE "public"."zz_deprecated_products_all" TO "anon";
GRANT ALL ON TABLE "public"."zz_deprecated_products_all" TO "authenticated";
GRANT ALL ON TABLE "public"."zz_deprecated_products_all" TO "service_role";



GRANT ALL ON TABLE "public"."zz_deprecated_secondhand_listings" TO "anon";
GRANT ALL ON TABLE "public"."zz_deprecated_secondhand_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."zz_deprecated_secondhand_listings" TO "service_role";



GRANT ALL ON TABLE "public"."zz_deprecated_store_products" TO "anon";
GRANT ALL ON TABLE "public"."zz_deprecated_store_products" TO "authenticated";
GRANT ALL ON TABLE "public"."zz_deprecated_store_products" TO "service_role";



GRANT ALL ON TABLE "public"."zz_deprecated_warehouses" TO "anon";
GRANT ALL ON TABLE "public"."zz_deprecated_warehouses" TO "authenticated";
GRANT ALL ON TABLE "public"."zz_deprecated_warehouses" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







