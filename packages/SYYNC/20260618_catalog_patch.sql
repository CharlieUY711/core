-- =============================================================================
-- CORE — packages/core-catalog
-- Migración: 20260618_ml_webhook_events.sql
--
-- Tabla de idempotencia para ml-webhook.
-- Registra cada evento recibido de ML para evitar procesamiento duplicado.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_webhook_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT        NOT NULL UNIQUE,
  topic       TEXT        NOT NULL,
  resource    TEXT        NOT NULL,
  processed   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_webhook_event_id  ON ml_webhook_events (event_id);
CREATE INDEX IF NOT EXISTS idx_ml_webhook_processed ON ml_webhook_events (processed);
CREATE INDEX IF NOT EXISTS idx_ml_webhook_created   ON ml_webhook_events (created_at DESC);

DROP TRIGGER IF EXISTS trg_ml_webhook_events_updated ON ml_webhook_events;
CREATE TRIGGER trg_ml_webhook_events_updated
  BEFORE UPDATE ON ml_webhook_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sin RLS — solo accesible por service_role (webhook no tiene JWT de usuario)
-- =============================================================================
-- CORE — packages/core-catalog
-- Migración: 20260618_reconcile_stock.sql
--
-- Reescribe la función reconcile_stock() para que opere sobre
-- catalog_inventory + catalog_listings en vez de productos_market/ml_listings.
--
-- La Edge Function reconcile-stock llama esta RPC sin cambios —
-- solo cambia la implementación SQL.
--
-- Qué hace reconcile_stock():
--   1. Para cada catalog_listing activo en channel='mercadolibre',
--      obtiene el stock disponible local (suma catalog_inventory.available)
--   2. Compara con el último valor conocido en catalog_listings.channel_attrs->>'last_known_stock'
--   3. Devuelve las filas donde hay discrepancia para que el caller decida
--      si disparar ml-sync
--
-- Nota: la reconciliación efectiva (PUT a ML) sigue siendo responsabilidad
-- de ml-sync. Esta función solo detecta discrepancias.
-- =============================================================================

CREATE OR REPLACE FUNCTION reconcile_stock()
RETURNS TABLE (
  listing_id    UUID,
  variant_id    UUID,
  external_id   TEXT,
  local_stock   INT,
  last_known    INT,
  discrepancy   INT
)
LANGUAGE sql STABLE
SECURITY DEFINER
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

COMMENT ON FUNCTION reconcile_stock IS
'Detecta discrepancias entre stock local (catalog_inventory) y el último
stock conocido en ML (catalog_listings.channel_attrs->last_known_stock).
Devuelve solo las filas con discrepancia. La reconciliación efectiva
(PUT a ML) es responsabilidad de ml-sync.';
