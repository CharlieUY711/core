-- =============================================================================
-- CORE — packages/core-catalog
-- Migración: 20260617_catalog_listings_cleanup.sql
-- Debe ejecutarse DESPUÉS de 20260617_catalog_prices.sql
--
-- Elimina catalog_listings.price_override — campo de precio único que queda
-- obsoleto una vez que catalog_prices cubre el modelo multidimensional.
-- El precio publicado en cada canal se resuelve vía resolve_price().
-- =============================================================================

ALTER TABLE catalog_listings DROP COLUMN IF EXISTS price_override;
