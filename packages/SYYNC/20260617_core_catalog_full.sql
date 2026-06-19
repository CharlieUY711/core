-- =============================================================================
-- CORE — packages/core-catalog
-- 20260617_core_catalog_full.sql
--
-- Script completo de instalación. Seguro para re-ejecución (idempotente).
-- Incluye:
--   1. Extensions y helpers
--   2. Tablas del catálogo (taxonomy, items, variants, media, locations,
--      inventory, listings, sync_log, events)
--   3. RLS multi-tenant
--   4. Vista v_catalog_variants_full
--   5. catalog_prices (modelo de precios multidimensional)
--   6. resolve_price() (función de resolución con herencia variant → item)
--   7. Eliminación de price_override (obsoleto)
--
-- Ejecutar en Supabase SQL Editor o vía CLI:
--   supabase db push --file 20260617_core_catalog_full.sql
-- =============================================================================

-- =============================================================================
-- 0. EXTENSIONS Y HELPERS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- =============================================================================
-- 1. TAXONOMÍA
-- =============================================================================
CREATE TABLE IF NOT EXISTS catalog_taxonomy (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  parent_id   UUID        REFERENCES catalog_taxonomy(id) ON DELETE RESTRICT,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  path        LTREE       NOT NULL,
  depth       SMALLINT    NOT NULL DEFAULT 0,
  sort_order  SMALLINT    NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  meta        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, path)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_path   ON catalog_taxonomy USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_taxonomy_tenant ON catalog_taxonomy (tenant_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_parent ON catalog_taxonomy (parent_id);

DROP TRIGGER IF EXISTS trg_taxonomy_updated ON catalog_taxonomy;
CREATE TRIGGER trg_taxonomy_updated
  BEFORE UPDATE ON catalog_taxonomy
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION catalog_taxonomy_ancestors(
  p_path      LTREE,
  p_tenant_id UUID
)
RETURNS SETOF catalog_taxonomy
LANGUAGE sql STABLE AS $$
  SELECT *
  FROM   catalog_taxonomy
  WHERE  tenant_id = p_tenant_id
    AND  path @> p_path
  ORDER  BY depth ASC;
$$;

-- =============================================================================
-- 2. ÍTEMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE catalog_item_status AS ENUM (
    'draft', 'active', 'archived', 'discontinued'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS catalog_items (
  id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID                NOT NULL,
  taxonomy_node_id UUID                REFERENCES catalog_taxonomy(id) ON DELETE SET NULL,
  brand_id         UUID,
  sku_prefix       TEXT,
  title            TEXT                NOT NULL,
  description      TEXT,
  status           catalog_item_status NOT NULL DEFAULT 'draft',
  tags             TEXT[]              NOT NULL DEFAULT '{}',
  meta             JSONB               NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_tenant   ON catalog_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_taxonomy ON catalog_items (taxonomy_node_id);
CREATE INDEX IF NOT EXISTS idx_items_status   ON catalog_items (status);
CREATE INDEX IF NOT EXISTS idx_items_tags     ON catalog_items USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_items_meta     ON catalog_items USING GIN (meta);

DROP TRIGGER IF EXISTS trg_items_updated ON catalog_items;
CREATE TRIGGER trg_items_updated
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 3. VARIANTES
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE catalog_variant_status AS ENUM (
    'active', 'inactive', 'discontinued'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS catalog_variants (
  id            UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID                   NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  sku           TEXT                   NOT NULL,
  barcode       TEXT,
  attributes    JSONB                  NOT NULL DEFAULT '{}',
  price         NUMERIC(12,2)          NOT NULL,
  compare_price NUMERIC(12,2),
  cost_price    NUMERIC(12,2),
  weight_g      NUMERIC(10,2),
  status        catalog_variant_status NOT NULL DEFAULT 'active',
  is_default    BOOLEAN                NOT NULL DEFAULT FALSE,
  meta          JSONB                  NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_variants_item       ON catalog_variants (item_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku        ON catalog_variants (sku);
CREATE INDEX IF NOT EXISTS idx_variants_attributes ON catalog_variants USING GIN (attributes);

DROP TRIGGER IF EXISTS trg_variants_updated ON catalog_variants;
CREATE TRIGGER trg_variants_updated
  BEFORE UPDATE ON catalog_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 4. MEDIA
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE catalog_media_type AS ENUM (
    'image', 'video', 'model_3d', 'document'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS catalog_media (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID               NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  variant_id  UUID               REFERENCES catalog_variants(id) ON DELETE SET NULL,
  url         TEXT               NOT NULL,
  type        catalog_media_type NOT NULL DEFAULT 'image',
  alt_text    TEXT,
  sort_order  SMALLINT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_item    ON catalog_media (item_id);
CREATE INDEX IF NOT EXISTS idx_media_variant ON catalog_media (variant_id);

-- =============================================================================
-- 5. LOCATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS catalog_locations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'warehouse',
  meta        JSONB       NOT NULL DEFAULT '{}',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_tenant ON catalog_locations (tenant_id);

-- =============================================================================
-- 6. INVENTORY
-- =============================================================================
CREATE TABLE IF NOT EXISTS catalog_inventory (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  UUID        NOT NULL REFERENCES catalog_variants(id) ON DELETE CASCADE,
  location_id UUID        NOT NULL REFERENCES catalog_locations(id) ON DELETE CASCADE,
  quantity    INT         NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved    INT         NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  available   INT         GENERATED ALWAYS AS (quantity - reserved) STORED,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant  ON catalog_inventory (variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON catalog_inventory (location_id);

DROP TRIGGER IF EXISTS trg_inventory_updated ON catalog_inventory;
CREATE TRIGGER trg_inventory_updated
  BEFORE UPDATE ON catalog_inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION catalog_adjust_inventory(
  p_variant_id  UUID,
  p_location_id UUID,
  p_delta       INT,
  p_reason      TEXT DEFAULT NULL
)
RETURNS catalog_inventory
LANGUAGE plpgsql AS $$
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

-- =============================================================================
-- 7. CHANNEL LISTINGS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE catalog_listing_status AS ENUM (
    'pending', 'syncing', 'active', 'paused', 'error', 'delisted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS catalog_listings (
  id             UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id     UUID                   NOT NULL REFERENCES catalog_variants(id) ON DELETE CASCADE,
  channel        TEXT                   NOT NULL,
  external_id    TEXT,
  status         catalog_listing_status NOT NULL DEFAULT 'pending',
  price_override NUMERIC(12,2),         -- se elimina al final de este script
  channel_attrs  JSONB                  NOT NULL DEFAULT '{}',
  last_error     TEXT,
  synced_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_listings_variant ON catalog_listings (variant_id);
CREATE INDEX IF NOT EXISTS idx_listings_channel ON catalog_listings (channel);
CREATE INDEX IF NOT EXISTS idx_listings_status  ON catalog_listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_ext     ON catalog_listings (channel, external_id);

DROP TRIGGER IF EXISTS trg_listings_updated ON catalog_listings;
CREATE TRIGGER trg_listings_updated
  BEFORE UPDATE ON catalog_listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 8. SYNC LOG
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE catalog_sync_action AS ENUM (
    'create', 'update', 'pause', 'delete', 'refresh_price', 'refresh_stock'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE catalog_sync_result AS ENUM (
    'success', 'error', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS catalog_sync_log (
  id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID                NOT NULL REFERENCES catalog_listings(id) ON DELETE CASCADE,
  action      catalog_sync_action NOT NULL,
  result      catalog_sync_result NOT NULL,
  http_status SMALLINT,
  payload     JSONB,
  response    JSONB,
  error_code  TEXT,
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_listing ON catalog_sync_log (listing_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_result  ON catalog_sync_log (result);
CREATE INDEX IF NOT EXISTS idx_sync_log_created ON catalog_sync_log (created_at DESC);

-- =============================================================================
-- 9. EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS catalog_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  emitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type    ON catalog_events (type);
CREATE INDEX IF NOT EXISTS idx_events_emitted ON catalog_events (emitted_at DESC);

-- =============================================================================
-- 10. ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE catalog_taxonomy  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_variants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_media     ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_listings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_sync_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_events    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_taxonomy;
CREATE POLICY "tenant_isolation" ON catalog_taxonomy
  USING (tenant_id = (auth.jwt() ->> 'store_id')::UUID);

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_items;
CREATE POLICY "tenant_isolation" ON catalog_items
  USING (tenant_id = (auth.jwt() ->> 'store_id')::UUID);

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_locations;
CREATE POLICY "tenant_isolation" ON catalog_locations
  USING (tenant_id = (auth.jwt() ->> 'store_id')::UUID);

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_variants;
CREATE POLICY "tenant_isolation" ON catalog_variants
  USING (
    item_id IN (
      SELECT id FROM catalog_items
      WHERE tenant_id = (auth.jwt() ->> 'store_id')::UUID
    )
  );

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_media;
CREATE POLICY "tenant_isolation" ON catalog_media
  USING (
    item_id IN (
      SELECT id FROM catalog_items
      WHERE tenant_id = (auth.jwt() ->> 'store_id')::UUID
    )
  );

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_inventory;
CREATE POLICY "tenant_isolation" ON catalog_inventory
  USING (
    variant_id IN (
      SELECT v.id FROM catalog_variants v
      JOIN   catalog_items i ON i.id = v.item_id
      WHERE  i.tenant_id = (auth.jwt() ->> 'store_id')::UUID
    )
  );

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_listings;
CREATE POLICY "tenant_isolation" ON catalog_listings
  USING (
    variant_id IN (
      SELECT v.id FROM catalog_variants v
      JOIN   catalog_items i ON i.id = v.item_id
      WHERE  i.tenant_id = (auth.jwt() ->> 'store_id')::UUID
    )
  );

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_sync_log;
CREATE POLICY "tenant_isolation" ON catalog_sync_log
  USING (
    listing_id IN (
      SELECT l.id FROM catalog_listings l
      JOIN   catalog_variants v ON v.id = l.variant_id
      JOIN   catalog_items i    ON i.id = v.item_id
      WHERE  i.tenant_id = (auth.jwt() ->> 'store_id')::UUID
    )
  );

DROP POLICY IF EXISTS "service_only" ON catalog_events;
CREATE POLICY "service_only" ON catalog_events
  USING (FALSE);

-- =============================================================================
-- 11. VISTA
-- =============================================================================
DROP VIEW IF EXISTS v_catalog_variants_full;
CREATE VIEW v_catalog_variants_full
WITH (security_invoker = TRUE) AS
SELECT
  v.id,
  v.sku,
  v.barcode,
  v.attributes,
  v.price,
  v.compare_price,
  v.cost_price,
  v.status        AS variant_status,
  v.is_default,
  i.id            AS item_id,
  i.tenant_id,
  i.title         AS item_title,
  i.status        AS item_status,
  i.tags,
  t.path          AS taxonomy_path,
  t.name          AS taxonomy_name,
  COALESCE(
    SUM(inv.quantity) FILTER (WHERE inv.quantity IS NOT NULL), 0
  )               AS total_stock,
  COALESCE(
    SUM(inv.available) FILTER (WHERE inv.available IS NOT NULL), 0
  )               AS total_available
FROM  catalog_variants v
JOIN  catalog_items    i   ON i.id = v.item_id
LEFT  JOIN catalog_taxonomy t ON t.id = i.taxonomy_node_id
LEFT  JOIN catalog_inventory inv ON inv.variant_id = v.id
WHERE i.tenant_id = (auth.jwt() ->> 'store_id')::UUID
GROUP BY v.id, i.id, t.path, t.name;

-- =============================================================================
-- 12. CATALOG_PRICES — modelo de precios multidimensional
-- =============================================================================
CREATE TABLE IF NOT EXISTS catalog_prices (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nivel de aplicación: exactamente uno de los dos debe estar poblado.
  -- variant_id → precio específico de esa variante.
  -- item_id    → precio heredado a todas las variantes del ítem.
  variant_id  UUID          REFERENCES catalog_variants(id) ON DELETE CASCADE,
  item_id     UUID          REFERENCES catalog_items(id)    ON DELETE CASCADE,

  -- Dimensiones — todas nullable (NULL = aplica a cualquier valor).
  channel     TEXT,          -- 'mercadolibre', 'meta', 'oddy', NULL = todos
  price_list  TEXT,          -- 'retail', 'wholesale', 'vip', NULL = lista general
  country     CHAR(2),       -- ISO 3166-1 alpha-2: 'AR', 'UY', NULL = todos
  currency    CHAR(3)        NOT NULL,  -- ISO 4217: 'ARS', 'UYU', 'USD'
  campaign    TEXT,          -- slug: 'black-friday-2026', NULL = sin campaña
  valid_from  TIMESTAMPTZ,   -- NULL = vigente desde siempre
  valid_until TIMESTAMPTZ,   -- NULL = sin vencimiento

  -- Precio final al consumidor (impuestos y comisiones se descuentan hacia adentro)
  amount      NUMERIC(12,2)  NOT NULL CHECK (amount >= 0),

  -- Resolución de conflictos: mayor número gana.
  -- Convención sugerida:
  --   10 = precio base global
  --   20 = + por canal
  --   30 = + por lista
  --   40 = + por país/moneda
  --   50 = + por campaña
  --   Combinar sumando: campaña+canal = 70, campaña+canal+país = 80, etc.
  priority    SMALLINT       NOT NULL DEFAULT 10,

  -- Auditoría
  created_by  UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_prices_level CHECK (
    (variant_id IS NOT NULL AND item_id IS NULL)
    OR
    (variant_id IS NULL     AND item_id IS NOT NULL)
  ),
  CONSTRAINT chk_prices_period CHECK (
    valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until
  )
);

CREATE INDEX IF NOT EXISTS idx_prices_variant  ON catalog_prices (variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prices_item     ON catalog_prices (item_id)    WHERE item_id    IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prices_channel  ON catalog_prices (channel)    WHERE channel    IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prices_currency ON catalog_prices (currency);
CREATE INDEX IF NOT EXISTS idx_prices_campaign ON catalog_prices (campaign)   WHERE campaign   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prices_period   ON catalog_prices (valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_prices_priority ON catalog_prices (priority DESC);

DROP TRIGGER IF EXISTS trg_prices_updated ON catalog_prices;
CREATE TRIGGER trg_prices_updated
  BEFORE UPDATE ON catalog_prices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE catalog_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_prices;
CREATE POLICY "tenant_isolation" ON catalog_prices
  USING (
    CASE
      WHEN variant_id IS NOT NULL THEN
        variant_id IN (
          SELECT v.id FROM catalog_variants v
          JOIN   catalog_items i ON i.id = v.item_id
          WHERE  i.tenant_id = (auth.jwt() ->> 'store_id')::UUID
        )
      ELSE
        item_id IN (
          SELECT id FROM catalog_items
          WHERE  tenant_id = (auth.jwt() ->> 'store_id')::UUID
        )
    END
  );

-- =============================================================================
-- 13. FUNCIÓN resolve_price()
--
-- Resuelve el precio vigente para una variante dado un contexto.
-- Herencia: busca primero a nivel variante, luego a nivel ítem padre.
-- Gana la fila con mayor priority. NULL en dimensiones = wildcard.
-- Devuelve NULL si no hay precio.
--
-- Uso desde Edge Function:
--   supabase.rpc('resolve_price', {
--     p_variant_id: '<uuid>',
--     p_currency:   'ARS',
--     p_channel:    'mercadolibre',
--     p_country:    'AR',
--   })
-- =============================================================================
CREATE OR REPLACE FUNCTION resolve_price(
  p_variant_id  UUID,
  p_currency    CHAR(3),
  p_channel     TEXT        DEFAULT NULL,
  p_price_list  TEXT        DEFAULT NULL,
  p_country     CHAR(2)     DEFAULT NULL,
  p_campaign    TEXT        DEFAULT NULL,
  p_at          TIMESTAMPTZ DEFAULT NULL
)
RETURNS catalog_prices
LANGUAGE plpgsql STABLE AS $$
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

COMMENT ON FUNCTION resolve_price IS
'Resuelve el precio vigente para una variante dado un contexto (canal, lista,
país, moneda, campaña, timestamp). Herencia variant → item. Mayor priority gana.
NULL en dimensiones = wildcard. Devuelve NULL si no hay precio.';

-- =============================================================================
-- 14. ELIMINAR price_override (obsoleto — reemplazado por catalog_prices)
-- =============================================================================
ALTER TABLE catalog_listings DROP COLUMN IF EXISTS price_override;

-- =============================================================================
-- FIN
-- =============================================================================
