-- =============================================================================
-- MIGRACIÓN 0005 — BOM CRUD
-- Proyecto: CORE / BEP
-- Precondición: 0004_soft_delete aplicada y verificada (2026-06-27)
-- Aplicada: 2026-06-27
-- =============================================================================
--
-- HALLAZGOS DE FASE 0:
-- bom_lines ya tenía todas las columnas, policies y trigger necesarios.
-- La migración se reduce a crear restore_soft_delete(), complemento de
-- soft_delete() introducida en 0004.
--
-- BLOQUE ÚNICO — Función restore_soft_delete
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.restore_soft_delete(
  p_table text,
  p_id    uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'bom_lines',
    'requirements',
    'compliance_matrix',
    'rfqs',
    'rfq_lines',
    'risks',
    'systems',
    'circulars',
    'project_queries',
    'documents',
    'decisions',
    'quotes',
    'projects',
    'project_members',
    'organizations',
    'workspaces',
    'manufacturers',
    'products'
  ];
BEGIN
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'restore_soft_delete: tabla no permitida: %', p_table
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table
  ) USING p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_soft_delete(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_soft_delete(text, uuid) TO authenticated;

COMMIT;
