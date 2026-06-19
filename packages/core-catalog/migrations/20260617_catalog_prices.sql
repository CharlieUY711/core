-- =============================================================================
-- CORE — packages/core-catalog
-- Migración: 20260617_catalog_prices.sql
-- Postgres 15+ / Supabase
--
-- Modelo de precios multidimensional.
-- Dimensiones: canal, lista, país, moneda, campaña, período.
-- Resolución: prioridad explícita (campo `priority` DESC).
-- Herencia: variant → item padre como fallback.
-- Dirección de cálculo: precio final al consumidor (impuestos y comisiones
-- se descuentan hacia adentro, no se suman hacia afuera).
--
-- Reemplaza: catalog_listings.price_override (campo único, insuficiente).
-- Ver migración 20260617_catalog_listings_cleanup.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLA
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_prices (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nivel de aplicación: variante directa o ítem (heredado a variantes)
  -- Exactamente uno de los dos debe ser NOT NULL (constraint más abajo).
  variant_id  UUID          REFERENCES catalog_variants(id) ON DELETE CASCADE,
  item_id     UUID          REFERENCES catalog_items(id)    ON DELETE CASCADE,

  -- Dimensiones de segmentación — todas nullable.
  -- NULL significa "aplica a cualquier valor de esta dimensión".
  -- La combinación NULL+NULL+NULL+... es un precio global de fallback.
  channel     TEXT,                          -- 'mercadolibre', 'meta', 'oddy', NULL=todos
  price_list  TEXT,                          -- 'retail', 'wholesale', 'vip', NULL=lista general
  country     CHAR(2),                       -- ISO 3166-1 alpha-2: 'AR', 'UY', NULL=todos
  currency    CHAR(3)       NOT NULL,        -- ISO 4217: 'ARS', 'UYU', 'USD' — siempre requerido
  campaign    TEXT,                          -- slug de campaña: 'black-friday-2026', NULL=ninguna
  valid_from  TIMESTAMPTZ,                   -- NULL = sin inicio (vigente desde siempre)
  valid_until TIMESTAMPTZ,                   -- NULL = sin vencimiento

  -- Precio
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),

  -- Resolución de conflictos cuando múltiples filas matchean.
  -- Mayor número = mayor prioridad. Convención sugerida:
  --   10 = precio global base
  --   20 = precio por canal
  --   30 = precio por lista
  --   40 = precio por país/moneda
  --   50 = precio de campaña
  --   (combinar sumando: canal+país = 60, campaña+canal = 70, etc.)
  priority    SMALLINT      NOT NULL DEFAULT 10,

  -- Auditoría
  created_by  UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Exactamente uno: variant_id o item_id
  CONSTRAINT chk_prices_level CHECK (
    (variant_id IS NOT NULL AND item_id IS NULL)
    OR
    (variant_id IS NULL AND item_id IS NOT NULL)
  ),

  -- Integridad temporal
  CONSTRAINT chk_prices_period CHECK (
    valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until
  )
);

-- Índices para la query de resolución (resolve_price busca por estas columnas)
CREATE INDEX IF NOT EXISTS idx_prices_variant  ON catalog_prices (variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prices_item     ON catalog_prices (item_id)    WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prices_channel  ON catalog_prices (channel)    WHERE channel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prices_currency ON catalog_prices (currency);
CREATE INDEX IF NOT EXISTS idx_prices_campaign ON catalog_prices (campaign)   WHERE campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prices_period   ON catalog_prices (valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_prices_priority ON catalog_prices (priority DESC);

DROP TRIGGER IF EXISTS trg_prices_updated ON catalog_prices;
CREATE TRIGGER trg_prices_updated
  BEFORE UPDATE ON catalog_prices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE catalog_prices ENABLE ROW LEVEL SECURITY;

-- Acceso por tenant: la fila es del tenant si su variant o su item lo es.
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

-- ---------------------------------------------------------------------------
-- FUNCIÓN: resolve_price
--
-- Devuelve el precio vigente para una variante dado un contexto de búsqueda.
-- Aplica herencia: busca primero a nivel variante, luego a nivel ítem padre.
-- Dentro de cada nivel, gana la fila con mayor `priority`.
-- Las dimensiones NULL en catalog_prices actúan como wildcard (matchean todo).
--
-- Parámetros:
--   p_variant_id  — variante a resolver (NOT NULL)
--   p_currency    — moneda requerida (NOT NULL)
--   p_channel     — canal (NULL = no filtrar por canal)
--   p_price_list  — lista de precio (NULL = no filtrar)
--   p_country     — país ISO (NULL = no filtrar)
--   p_campaign    — campaña (NULL = no filtrar)
--   p_at          — timestamp de evaluación (NULL = NOW())
--
-- Retorna: la fila ganadora de catalog_prices, o NULL si no hay precio.
-- ---------------------------------------------------------------------------
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
  v_at         TIMESTAMPTZ := COALESCE(p_at, NOW());
  v_item_id    UUID;
  v_result     catalog_prices;
BEGIN
  -- Buscar a nivel variante (prioridad alta)
  SELECT cp.*
  INTO   v_result
  FROM   catalog_prices cp
  WHERE  cp.variant_id = p_variant_id
    AND  cp.currency   = p_currency
    -- Dimensiones: NULL en la tabla = wildcard (acepta cualquier valor del param)
    AND  (cp.channel    IS NULL OR cp.channel    = p_channel)
    AND  (cp.price_list IS NULL OR cp.price_list = p_price_list)
    AND  (cp.country    IS NULL OR cp.country    = p_country)
    AND  (cp.campaign   IS NULL OR cp.campaign   = p_campaign)
    -- Período vigente
    AND  (cp.valid_from  IS NULL OR cp.valid_from  <= v_at)
    AND  (cp.valid_until IS NULL OR cp.valid_until >  v_at)
  ORDER  BY cp.priority DESC
  LIMIT  1;

  IF FOUND THEN
    RETURN v_result;
  END IF;

  -- Fallback: buscar a nivel ítem padre
  SELECT item_id INTO v_item_id
  FROM   catalog_variants
  WHERE  id = p_variant_id;

  IF v_item_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT cp.*
  INTO   v_result
  FROM   catalog_prices cp
  WHERE  cp.item_id    = v_item_id
    AND  cp.currency   = p_currency
    AND  (cp.channel    IS NULL OR cp.channel    = p_channel)
    AND  (cp.price_list IS NULL OR cp.price_list = p_price_list)
    AND  (cp.country    IS NULL OR cp.country    = p_country)
    AND  (cp.campaign   IS NULL OR cp.campaign   = p_campaign)
    AND  (cp.valid_from  IS NULL OR cp.valid_from  <= v_at)
    AND  (cp.valid_until IS NULL OR cp.valid_until >  v_at)
  ORDER  BY cp.priority DESC
  LIMIT  1;

  RETURN v_result; -- NULL si tampoco hay precio a nivel ítem
END;
$$;

-- Comentario de uso
COMMENT ON FUNCTION resolve_price IS
'Resuelve el precio vigente para una variante dado un contexto (canal, lista,
país, moneda, campaña, timestamp). Busca primero a nivel variante, luego
hereda del ítem padre. Gana la fila de mayor priority. Las dimensiones NULL
en catalog_prices actúan como wildcard. Devuelve NULL si no hay precio.

Ejemplo:
  SELECT (resolve_price(
    ''<variant-uuid>'', ''ARS'',
    p_channel => ''mercadolibre'',
    p_country => ''AR''
  )).amount;
';
