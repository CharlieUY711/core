-- =============================================================================
-- ROLLBACK 0005 — Revierte al estado post-0004
-- Proyecto: CORE / BEP
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.restore_soft_delete(text, uuid);

COMMIT;
