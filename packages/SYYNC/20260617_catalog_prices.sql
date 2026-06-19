-- =============================================================================
-- CORE — packages/core-catalog
-- Migración: 20260617_catalog_prices.sql
-- Depende de: 20260617_core_catalog_v2.sql (catalog_items, catalog_variants)
-- Postgres 15+ / Supabase
-- =============================================================================
--
-- Modelo de precios multicanalDimensiones (todas nullable salvo currency):
--   channel    TEXT    — NULL = aplica a todos los canales
--   price_list TEXT    — NULL = precio general (no lista específica)
--   country    TEXT    — NULL = todos los países (ISO 3166-1 alpha-2)
--   currency   TEXT    — NOT NULL siempre (ISO 4217)
--   campaign   TEXT    — NULL = sin campaña
--   valid_from TIMESTAMPTZ — NULL = sin inicio (siempre vigente desde el pasado)
--   valid_until TIMESTAMPTZ — NULL = sin vencimiento
--
-- Resolución cuando múltiples filas matchean:
--   Campo `priority` numérico — mayor número gana.
--   El caller es responsable de asignar priority coherente
--   (campaña activa > lista especial > precio general).
--
-- Herencia item → variant:
--   Una fila puede referenciar item_id (sin variant_id) como precio base
--   del ítem completo. resolve_price() da prioridad a filas con variant_id
--   explícita; si no hay match, cae a la fila con item_id del padre.
--   Dentro de cada nivel la resolución sigue siendo por priority.
-- =============================================================================

-- =============================================================================
-- TABLA catalog_prices
-- =============================================================================
CREATE TABLE IF NOT EXISTS catalog_prices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope: exactamente uno de los dos debe estar definido
  item_id     UUID        REFERENCES catalog_items(id)    ON DELETE CASCADE,
  variant_id  UUID        REFERENCES catalog_variants(id) ON DELETE CASCADE,

  -- Dimensiones de segmentación (NULL = wildcard)
  channel     TEXT,                       -- 'ML', 'meta', 'oddy', NULL = todos
  price_list  TEXT,                       -- 'retail', 'wholesale', NULL = general
  country     TEXT,                       -- 'AR', 'UY', NULL = todos
  currency    TEXT        NOT NULL,       -- 'ARS', 'UYU', 'USD' — siempre obligatorio
  campaign    TEXT,                       -- slug de campaña, NULL = sin campaña

  -- Vigencia
  valid_from  TIMESTAMPTZ,               -- NULL = desde siempre
  valid_until TIMESTAMPTZ,               -- NULL = sin vencimiento

  -- Precio final al consumidor (antes de descontar impuestos/comisiones)
  amount      NUMERIC(12,4) NOT NULL CHECK (amount >= 0),

  -- Resolución de conflictos: mayor priority gana
  priority    SMALLINT    NOT NULL DEFAULT 0,

  -- Auditoría
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Exactamente uno entre item_id y variant_id
  CONSTRAINT chk_price_scope CHECK (
    (item_id IS NOT NULL AND variant_id IS NULL) OR
    (item_id IS NULL     AND variant_id IS NOT NULL)
  ),

  -- Vigencia coherente
  CONSTRAINT chk_price_period CHECK (
    valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until
  )
);

-- Índices funcionales para resolve_price() — cubre el WHERE más común
CREATE INDEX IF NOT EXISTS idx_prices_variant
  ON catalog_prices (variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prices_item
  ON catalog_prices (item_id)
  WHERE item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prices_channel
  ON catalog_prices (channel)
  WHERE channel IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prices_currency
  ON catalog_prices (currency);

CREATE INDEX IF NOT EXISTS idx_prices_validity
  ON catalog_prices (valid_from, valid_until);

-- Índice compuesto para la query de resolución completa
CREATE INDEX IF NOT EXISTS idx_prices_resolve
  ON catalog_prices (variant_id, channel, country, currency, campaign, priority DESC)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prices_resolve_item
  ON catalog_prices (item_id, channel, country, currency, campaign, priority DESC)
  WHERE item_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_prices_updated ON catalog_prices;
CREATE TRIGGER trg_prices_updated
  BEFORE UPDATE ON catalog_prices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE catalog_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON catalog_prices;
CREATE POLICY "tenant_isolation" ON catalog_prices
  USING (
    -- Alcanza por variant_id o item_id, resuelve tenant via catalog_items
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
-- FUNCIÓN resolve_price
--
-- Devuelve el amount ganador para una variante dado un contexto de precio.
-- Prioridad de resolución:
--   1. Filas con variant_id explícita (más específico)
--   2. Filas con item_id del padre (fallback)
--   Dentro de cada nivel: ORDER BY priority DESC → primera fila gana.
--
-- Dimensiones con valor NULL en la tabla = wildcard (matchea cualquier valor).
-- Dimensiones con valor NULL en el parámetro = se busca solo wildcards para
--   esa dimensión (no se filtra por valor concreto).
--
-- Ejemplo de uso desde Edge Function:
--   SELECT resolve_price(
--     p_variant_id := '<uuid>',
--     p_channel    := 'ML',
--     p_country    := 'AR',
--     p_currency   := 'ARS',
--     p_campaign   := NULL,
--     p_price_list := NULL,
--     p_at         := NOW()
--   );
-- =============================================================================
CREATE OR REPLACE FUNCTION resolve_price(
  p_variant_id UUID,
  p_currency   TEXT,
  p_channel    TEXT    DEFAULT NULL,
  p_country    TEXT    DEFAULT NULL,
  p_campaign   TEXT    DEFAULT NULL,
  p_price_list TEXT    DEFAULT NULL,
  p_at         TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC(12,4)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_amount     NUMERIC(12,4);
  v_item_id    UUID;
BEGIN
  -- ── Nivel 1: precio directo en variant_id ──────────────────────────────────
  SELECT amount INTO v_amount
  FROM   catalog_prices
  WHERE  variant_id = p_variant_id
    AND  currency   = p_currency
    -- Dimensiones: valor exacto OR wildcard (NULL en tabla = aplica a todo)
    AND  (channel    = p_channel    OR (channel    IS NULL AND p_channel    IS NULL) OR channel    IS NULL)
    AND  (country    = p_country    OR (country    IS NULL AND p_country    IS NULL) OR country    IS NULL)
    AND  (campaign   = p_campaign   OR (campaign   IS NULL AND p_campaign   IS NULL) OR campaign   IS NULL)
    AND  (price_list = p_price_list OR (price_list IS NULL AND p_price_list IS NULL) OR price_list IS NULL)
    -- Vigencia
    AND  (valid_from  IS NULL OR valid_from  <= p_at)
    AND  (valid_until IS NULL OR valid_until >  p_at)
  ORDER BY
    -- Especificidad primero (NULL wildcards al final de su nivel)
    (channel    IS NOT NULL)::INT DESC,
    (country    IS NOT NULL)::INT DESC,
    (campaign   IS NOT NULL)::INT DESC,
    (price_list IS NOT NULL)::INT DESC,
    priority DESC
  LIMIT 1;

  IF v_amount IS NOT NULL THEN
    RETURN v_amount;
  END IF;

  -- ── Nivel 2: fallback al item padre ───────────────────────────────────────
  SELECT i.id INTO v_item_id
  FROM   catalog_variants v
  JOIN   catalog_items    i ON i.id = v.item_id
  WHERE  v.id = p_variant_id;

  IF v_item_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT amount INTO v_amount
  FROM   catalog_prices
  WHERE  item_id   = v_item_id
    AND  currency  = p_currency
    AND  variant_id IS NULL           -- solo filas de nivel item
    AND  (channel    = p_channel    OR channel    IS NULL)
    AND  (country    = p_country    OR country    IS NULL)
    AND  (campaign   = p_campaign   OR campaign   IS NULL)
    AND  (price_list = p_price_list OR price_list IS NULL)
    AND  (valid_from  IS NULL OR valid_from  <= p_at)
    AND  (valid_until IS NULL OR valid_until >  p_at)
  ORDER BY
    (channel    IS NOT NULL)::INT DESC,
    (country    IS NOT NULL)::INT DESC,
    (campaign   IS NOT NULL)::INT DESC,
    (price_list IS NOT NULL)::INT DESC,
    priority DESC
  LIMIT 1;

  RETURN v_amount;  -- puede ser NULL si no hay precio configurado en ningún nivel
END;
$$;

-- =============================================================================
-- VISTA actualizada: agrega precio resuelto por canal
-- (extiende v_catalog_variants_full — no la reemplaza para no romper código
--  existente que la usa; esta vista agrega la dimensión de precio por canal)
-- =============================================================================
DROP VIEW IF EXISTS v_catalog_listings_priced;
CREATE VIEW v_catalog_listings_priced
WITH (security_invoker = TRUE) AS
SELECT
  l.id                AS listing_id,
  l.channel,
  l.external_id,
  l.status            AS listing_status,
  l.channel_attrs,
  l.last_error,
  l.synced_at,
  v.id                AS variant_id,
  v.sku,
  v.barcode,
  v.attributes        AS variant_attrs,
  v.status            AS variant_status,
  v.cost_price,
  i.id                AS item_id,
  i.tenant_id,
  i.title             AS item_title,
  i.description       AS item_description,
  i.status            AS item_status,
  i.tags,
  -- Stock total disponible
  COALESCE(
    SUM(inv.available) FILTER (WHERE inv.available IS NOT NULL), 0
  )                   AS total_available,
  -- Precio resuelto: se necesita currency en el caller, la vista no puede
  -- asumir moneda. Usar resolve_price() directamente en queries que conocen
  -- la moneda del contexto.
  l.updated_at        AS listing_updated_at
FROM  catalog_listings  l
JOIN  catalog_variants  v   ON v.id = l.variant_id
JOIN  catalog_items     i   ON i.id = v.item_id
LEFT  JOIN catalog_inventory inv ON inv.variant_id = v.id
WHERE i.tenant_id = (auth.jwt() ->> 'store_id')::UUID
GROUP BY l.id, v.id, i.id;

-- =============================================================================
-- FIN 20260617_catalog_prices.sql
-- =============================================================================
