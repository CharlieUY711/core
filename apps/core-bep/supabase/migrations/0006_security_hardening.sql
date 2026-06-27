-- =============================================================================
-- MIGRACIÓN 0006 — Security Hardening
-- Repo: CORE / apps/core-bep
-- Autora: revisión de seguridad post-0005
-- Fecha: 2026-06-27
-- Depende de: 0005_bom_crud.sql (aplicada y verificada)
--
-- PROBLEMAS QUE CIERRA:
--   1. Escalada de privilegios via profiles_update (sin WITH CHECK)
--   2. Superadmin muerto — profiles vacío, is_superadmin() siempre false
--   3. soft_delete / restore_soft_delete sin autorización por fila
--
-- INSTRUCCIONES DE APLICACIÓN:
--   Ejecutar cada bloque por separado en el SQL Editor de Supabase.
--   Verificar que cada bloque termina sin errores antes de continuar.
--   NO aplicar a producción sin aprobación humana.
-- =============================================================================


-- =============================================================================
-- BLOQUE 1 — Fix profiles_update: agregar WITH CHECK contra escalada de
--             privilegios vía is_superadmin
--
-- PROBLEMA: la policy existente tiene USING (auth.uid() = id) pero sin
-- WITH CHECK, lo que permite a cualquier usuario autenticado ejecutar:
--   UPDATE profiles SET is_superadmin = true WHERE id = <su propio id>
--
-- FIX: WITH CHECK que congela el valor de is_superadmin al valor actual
-- de la fila para usuarios no-superadmin.
--
-- NOTA sobre usuarios nuevos (sin fila en profiles aún):
--   No existe trigger on_auth_user_created — la fila se crea manualmente.
--   La subquery puede devolver NULL para usuarios sin fila; COALESCE(…, false)
--   garantiza que el WITH CHECK no rechace el INSERT inicial del perfil.
--   Un superadmin real tiene is_superadmin = true en su fila → la subquery
--   devuelve true → WITH CHECK permite cualquier valor de is_superadmin
--   que él escriba (incluyendo true). Para usuarios normales la subquery
--   devuelve false → solo pueden escribir false → no pueden escalarse.
-- =============================================================================

DROP POLICY IF EXISTS profiles_update ON public.profiles;

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_superadmin = COALESCE(
      (SELECT p.is_superadmin FROM public.profiles p WHERE p.id = auth.uid()),
      false
    )
  );


-- =============================================================================
-- BLOQUE 2 — Seed superadmin conocido
--
-- PROBLEMA: profiles tiene 0 filas → is_superadmin() devuelve false para
-- todos → nadie puede ejecutar operaciones que requieren superadmin
-- (DELETE físico, operaciones sobre entidades maestras, etc.).
--
-- FIX: INSERT idempotente del superadmin conocido.
-- ON CONFLICT DO UPDATE garantiza que si el usuario ya hizo primer login
-- y tiene fila, solo se actualiza is_superadmin = true sin tocar el resto.
--
-- Columnas NOT NULL en profiles:
--   - id: proporcionado
--   - is_superadmin: proporcionado (DEFAULT false, NOT NULL)
--   - resto: todas NULL-able → no requieren valores en este INSERT
-- =============================================================================

INSERT INTO public.profiles (id, is_superadmin)
VALUES ('5e12ace0-05c6-4208-b7c8-8250b7063848', true)
ON CONFLICT (id) DO UPDATE SET is_superadmin = true;


-- =============================================================================
-- BLOQUE 3 — soft_delete() con autorización por fila
--
-- PROBLEMA: la función es SECURITY DEFINER y solo valida whitelist de tabla.
-- Cualquier usuario autenticado puede soft-deletear filas de cualquier
-- proyecto sin pertenecer a él.
--
-- FIX: antes del EXECUTE, resolver el project_id de la fila y verificar:
--   - Superadmin → permitir siempre
--   - Tabla de proyecto (project_id resolvible) → has_project_permission(..., 'delete')
--   - Entidad maestra (sin project_id) → solo superadmin
--
-- MAPA tabla → project_id (basado en Fase 0):
--   Directas: bom_lines, requirements, compliance_matrix, rfqs, risks,
--             systems, circulars, project_queries, documents, decisions,
--             project_members
--   Caso especial: projects → project_id = id (la entidad es el proyecto)
--   Via FK:   quotes → rfqs.project_id, rfq_lines → rfqs.project_id
--   Solo superadmin: organizations, workspaces, manufacturers, products
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
  v_project_id uuid;
  v_masters    text[] := ARRAY['organizations','workspaces','manufacturers','products'];
BEGIN
  -- Validar tabla en whitelist
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'soft_delete: tabla no permitida: %', p_table
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Superadmin puede operar sobre cualquier tabla sin más verificación
  IF is_superadmin() THEN
    EXECUTE format(
      'UPDATE public.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
      p_table
    ) USING p_id;
    RETURN;
  END IF;

  -- Entidades maestras: solo superadmin (ya descartado arriba → denegar)
  IF p_table = ANY(v_masters) THEN
    RAISE EXCEPTION 'soft_delete: permiso denegado — operación restringida a superadmin para tabla %', p_table
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Resolver project_id según la tabla
  CASE p_table
    WHEN 'bom_lines'         THEN SELECT project_id INTO v_project_id FROM public.bom_lines         WHERE id = p_id;
    WHEN 'requirements'      THEN SELECT project_id INTO v_project_id FROM public.requirements      WHERE id = p_id;
    WHEN 'compliance_matrix' THEN SELECT project_id INTO v_project_id FROM public.compliance_matrix WHERE id = p_id;
    WHEN 'rfqs'              THEN SELECT project_id INTO v_project_id FROM public.rfqs              WHERE id = p_id;
    WHEN 'risks'             THEN SELECT project_id INTO v_project_id FROM public.risks             WHERE id = p_id;
    WHEN 'systems'           THEN SELECT project_id INTO v_project_id FROM public.systems           WHERE id = p_id;
    WHEN 'circulars'         THEN SELECT project_id INTO v_project_id FROM public.circulars         WHERE id = p_id;
    WHEN 'project_queries'   THEN SELECT project_id INTO v_project_id FROM public.project_queries   WHERE id = p_id;
    WHEN 'documents'         THEN SELECT project_id INTO v_project_id FROM public.documents         WHERE id = p_id;
    WHEN 'decisions'         THEN SELECT project_id INTO v_project_id FROM public.decisions         WHERE id = p_id;
    WHEN 'project_members'   THEN SELECT project_id INTO v_project_id FROM public.project_members   WHERE id = p_id;
    WHEN 'projects'          THEN v_project_id := p_id;  -- el proyecto es el objeto
    WHEN 'quotes'            THEN
      SELECT r.project_id INTO v_project_id
      FROM public.quotes q
      JOIN public.rfqs r ON r.id = q.rfq_id
      WHERE q.id = p_id;
    WHEN 'rfq_lines'         THEN
      SELECT r.project_id INTO v_project_id
      FROM public.rfq_lines rl
      JOIN public.rfqs r ON r.id = rl.rfq_id
      WHERE rl.id = p_id;
    ELSE
      RAISE EXCEPTION 'soft_delete: tabla sin mapeo de project_id: %', p_table
        USING ERRCODE = 'invalid_parameter_value';
  END CASE;

  -- Fila no encontrada
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'soft_delete: fila no encontrada o project_id nulo para tabla % id %', p_table, p_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Verificar permiso de delete en el proyecto
  IF NOT has_project_permission(v_project_id, 'delete') THEN
    RAISE EXCEPTION 'soft_delete: permiso denegado — sin permiso de delete en proyecto %', v_project_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Ejecutar soft delete
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
    p_table
  ) USING p_id;
END;
$$;


-- =============================================================================
-- BLOQUE 4 — restore_soft_delete() con autorización por fila
--
-- Misma lógica de autorización que soft_delete().
-- La restauración requiere el mismo nivel de permiso que el borrado.
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
  v_project_id uuid;
  v_masters    text[] := ARRAY['organizations','workspaces','manufacturers','products'];
BEGIN
  -- Validar tabla en whitelist
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'restore_soft_delete: tabla no permitida: %', p_table
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Superadmin puede operar sobre cualquier tabla sin más verificación
  IF is_superadmin() THEN
    EXECUTE format(
      'UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
      p_table
    ) USING p_id;
    RETURN;
  END IF;

  -- Entidades maestras: solo superadmin
  IF p_table = ANY(v_masters) THEN
    RAISE EXCEPTION 'restore_soft_delete: permiso denegado — operación restringida a superadmin para tabla %', p_table
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Resolver project_id según la tabla
  -- NOTA: para restore, la fila tiene deleted_at IS NOT NULL; las columnas
  -- de negocio (project_id, rfq_id) siguen siendo accesibles.
  CASE p_table
    WHEN 'bom_lines'         THEN SELECT project_id INTO v_project_id FROM public.bom_lines         WHERE id = p_id;
    WHEN 'requirements'      THEN SELECT project_id INTO v_project_id FROM public.requirements      WHERE id = p_id;
    WHEN 'compliance_matrix' THEN SELECT project_id INTO v_project_id FROM public.compliance_matrix WHERE id = p_id;
    WHEN 'rfqs'              THEN SELECT project_id INTO v_project_id FROM public.rfqs              WHERE id = p_id;
    WHEN 'risks'             THEN SELECT project_id INTO v_project_id FROM public.risks             WHERE id = p_id;
    WHEN 'systems'           THEN SELECT project_id INTO v_project_id FROM public.systems           WHERE id = p_id;
    WHEN 'circulars'         THEN SELECT project_id INTO v_project_id FROM public.circulars         WHERE id = p_id;
    WHEN 'project_queries'   THEN SELECT project_id INTO v_project_id FROM public.project_queries   WHERE id = p_id;
    WHEN 'documents'         THEN SELECT project_id INTO v_project_id FROM public.documents         WHERE id = p_id;
    WHEN 'decisions'         THEN SELECT project_id INTO v_project_id FROM public.decisions         WHERE id = p_id;
    WHEN 'project_members'   THEN SELECT project_id INTO v_project_id FROM public.project_members   WHERE id = p_id;
    WHEN 'projects'          THEN v_project_id := p_id;
    WHEN 'quotes'            THEN
      SELECT r.project_id INTO v_project_id
      FROM public.quotes q
      JOIN public.rfqs r ON r.id = q.rfq_id
      WHERE q.id = p_id;
    WHEN 'rfq_lines'         THEN
      SELECT r.project_id INTO v_project_id
      FROM public.rfq_lines rl
      JOIN public.rfqs r ON r.id = rl.rfq_id
      WHERE rl.id = p_id;
    ELSE
      RAISE EXCEPTION 'restore_soft_delete: tabla sin mapeo de project_id: %', p_table
        USING ERRCODE = 'invalid_parameter_value';
  END CASE;

  -- Fila no encontrada
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'restore_soft_delete: fila no encontrada o project_id nulo para tabla % id %', p_table, p_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Verificar permiso de delete en el proyecto (mismo permiso que para borrar)
  IF NOT has_project_permission(v_project_id, 'delete') THEN
    RAISE EXCEPTION 'restore_soft_delete: permiso denegado — sin permiso de delete en proyecto %', v_project_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Ejecutar restauración
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table
  ) USING p_id;
END;
$$;
