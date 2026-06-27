-- =============================================================================
-- ROLLBACK 0006 — Revierte security_hardening al estado post-0005
-- Repo: CORE / apps/core-bep
-- Fecha: 2026-06-27
--
-- ADVERTENCIA: este rollback elimina el seed del superadmin.
-- Si el superadmin ya hizo primer login y tiene datos asociados (proyectos,
-- logs, etc.), considerar si conviene conservar la fila con is_superadmin = false
-- en lugar de borrarla. El bloque 2R tiene comentario al respecto.
--
-- INSTRUCCIONES:
--   Ejecutar cada bloque por separado en el SQL Editor de Supabase.
--   Aplicar en orden 1R → 2R → 3R → 4R.
--   NO aplicar a producción sin aprobación humana.
-- =============================================================================


-- =============================================================================
-- BLOQUE 1R — Restaurar profiles_update al estado post-0005 (sin WITH CHECK)
-- =============================================================================

DROP POLICY IF EXISTS profiles_update ON public.profiles;

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);


-- =============================================================================
-- BLOQUE 2R — Remover seed del superadmin
--
-- ADVERTENCIA: si el usuario ya hizo login y tiene datos propios en el sistema,
-- borrar su fila de profiles puede dejar huérfanos o errores de FK.
-- Opción conservadora: comentar el DELETE y solo poner is_superadmin = false.
-- Opción por defecto (estado exacto post-0005 = profiles vacío): DELETE.
-- =============================================================================

-- Opción A — Estado exacto post-0005 (profiles vacío):
DELETE FROM public.profiles
WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';

-- Opción B — Conservar fila pero revocar superadmin (descomentar si aplica):
-- UPDATE public.profiles SET is_superadmin = false
-- WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';


-- =============================================================================
-- BLOQUE 3R — Restaurar soft_delete() al estado post-0005 (sin auth por fila)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete(p_table text, p_id uuid)
RETURNS void
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
    RAISE EXCEPTION 'soft_delete: tabla no permitida: %', p_table
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
    p_table
  ) USING p_id;
END;
$$;


-- =============================================================================
-- BLOQUE 4R — Restaurar restore_soft_delete() al estado post-0005
-- =============================================================================

CREATE OR REPLACE FUNCTION public.restore_soft_delete(p_table text, p_id uuid)
RETURNS void
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
