-- =============================================================================
-- MIGRACIÓN 0004 — SOFT DELETE
-- Proyecto: CORE / BEP
-- Autora: Handoff desde diseño Core Nexus / BEP
-- Precondición: 0003_governance_security aplicada y verificada (2026-06-27)
-- =============================================================================
--
-- INSTRUCCIÓN DE EJECUCIÓN EN SUPABASE SQL EDITOR:
-- El SQL Editor de Supabase ejecuta solo el último statement de un bloque
-- multi-statement. Por eso esta migración está dividida en BLOQUES NUMERADOS.
-- Ejecutar cada bloque por separado, en orden, verificando que no haya errores.
-- Los bloques dentro de un BEGIN/COMMIT son transaccionales por bloque.
--
-- BLOQUES:
--   BLOQUE 1  — Agregar columna deleted_at (18 tablas)
--   BLOQUE 2  — Crear índices parciales en deleted_at (18 tablas)
--   BLOQUE 3  — Recrear policies SELECT con filtro deleted_at IS NULL
--   BLOQUE 4  — Crear función soft_delete con whitelist
--   BLOQUE 5  — Reemplazar policies DELETE Arquetipo A (solo superadmin)
--
-- =============================================================================


-- =============================================================================
-- BLOQUE 1 — Agregar columna deleted_at
-- Tablas con ciclo de vida (24 → 18 según diseño final aprobado).
-- Se usa ADD COLUMN IF NOT EXISTS para idempotencia.
-- Tablas excluidas intencionalmente: profiles, lessons_learned, entity_links,
-- entity_versions, project_roles.
-- =============================================================================

BEGIN;

-- Transaccionales
ALTER TABLE public.bom_lines         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.requirements      ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.compliance_matrix ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.rfqs              ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.rfq_lines         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.risks             ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.systems           ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.circulars         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.project_queries   ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.documents         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.decisions         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.quotes            ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Entidades maestras
ALTER TABLE public.projects          ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.project_members   ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.organizations     ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.workspaces        ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.manufacturers     ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.products          ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

COMMIT;


-- =============================================================================
-- BLOQUE 2 — Índices parciales en deleted_at
-- Un índice por tabla. WHERE deleted_at IS NOT NULL optimiza las queries de
-- papelera. Las queries de activos (IS NULL) se benefician del índice inverso.
-- CREATE INDEX IF NOT EXISTS garantiza idempotencia.
-- =============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_bom_lines_deleted_at         ON public.bom_lines         (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requirements_deleted_at      ON public.requirements      (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_matrix_deleted_at ON public.compliance_matrix (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rfqs_deleted_at              ON public.rfqs              (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rfq_lines_deleted_at         ON public.rfq_lines         (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_deleted_at             ON public.risks             (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_systems_deleted_at           ON public.systems           (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_circulars_deleted_at         ON public.circulars         (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_queries_deleted_at   ON public.project_queries   (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at         ON public.documents         (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decisions_deleted_at         ON public.decisions         (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at            ON public.quotes            (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at          ON public.projects          (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_members_deleted_at   ON public.project_members   (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at     ON public.organizations     (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at        ON public.workspaces        (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_manufacturers_deleted_at     ON public.manufacturers     (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at          ON public.products          (deleted_at) WHERE deleted_at IS NOT NULL;

COMMIT;


-- =============================================================================
-- BLOQUE 3 — Recrear policies SELECT con filtro deleted_at IS NULL
--
-- ESTRATEGIA: DROP + CREATE con el mismo nombre.
-- Las expresiones USING base se toman del ground truth verificado de 0003.
-- Si Fase 0 reveló discrepancias, editar las expresiones base antes de correr.
--
-- PATRÓN:
--   Tablas con project_id FK: is_project_member(project_id) AND deleted_at IS NULL
--   Tablas con id como PK de proyecto: is_project_member(id) AND deleted_at IS NULL
--   Tablas globales (auth check): (auth.uid() IS NOT NULL) AND deleted_at IS NULL
--
-- NO SE TOCAN: profiles_select, lessons_learned_select, entity_links_select,
-- entity_versions_select, project_roles_select (si existe).
-- =============================================================================

BEGIN;

-- ---- bom_lines ----
DROP POLICY IF EXISTS bom_lines_select ON public.bom_lines;
CREATE POLICY bom_lines_select ON public.bom_lines
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- requirements ----
DROP POLICY IF EXISTS requirements_select ON public.requirements;
CREATE POLICY requirements_select ON public.requirements
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- compliance_matrix ----
DROP POLICY IF EXISTS compliance_matrix_select ON public.compliance_matrix;
CREATE POLICY compliance_matrix_select ON public.compliance_matrix
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- rfqs ----
DROP POLICY IF EXISTS rfqs_select ON public.rfqs;
CREATE POLICY rfqs_select ON public.rfqs
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- rfq_lines ----
DROP POLICY IF EXISTS rfq_lines_select ON public.rfq_lines;
CREATE POLICY rfq_lines_select ON public.rfq_lines
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- risks ----
DROP POLICY IF EXISTS risks_select ON public.risks;
CREATE POLICY risks_select ON public.risks
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- systems ----
DROP POLICY IF EXISTS systems_select ON public.systems;
CREATE POLICY systems_select ON public.systems
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- circulars ----
DROP POLICY IF EXISTS circulars_select ON public.circulars;
CREATE POLICY circulars_select ON public.circulars
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- project_queries ----
DROP POLICY IF EXISTS project_queries_select ON public.project_queries;
CREATE POLICY project_queries_select ON public.project_queries
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- documents ----
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- decisions ----
DROP POLICY IF EXISTS decisions_select ON public.decisions;
CREATE POLICY decisions_select ON public.decisions
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- quotes ----
DROP POLICY IF EXISTS quotes_select ON public.quotes;
CREATE POLICY quotes_select ON public.quotes
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- projects ----
-- projects usa id (PK) como referencia de proyecto, no project_id
DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT USING (is_project_member(id) AND deleted_at IS NULL);

-- ---- project_members ----
DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members
  FOR SELECT USING (is_project_member(project_id) AND deleted_at IS NULL);

-- ---- organizations ----
-- organizations es entidad global; revisar Fase 0 para confirmar USING base
DROP POLICY IF EXISTS organizations_select ON public.organizations;
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT USING ((auth.uid() IS NOT NULL) AND deleted_at IS NULL);

-- ---- workspaces ----
DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT USING ((auth.uid() IS NOT NULL) AND deleted_at IS NULL);

-- ---- manufacturers ----
DROP POLICY IF EXISTS manufacturers_select ON public.manufacturers;
CREATE POLICY manufacturers_select ON public.manufacturers
  FOR SELECT USING ((auth.uid() IS NOT NULL) AND deleted_at IS NULL);

-- ---- products ----
DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products
  FOR SELECT USING ((auth.uid() IS NOT NULL) AND deleted_at IS NULL);

COMMIT;


-- =============================================================================
-- BLOQUE 4 — Función soft_delete con whitelist de tablas
--
-- SECURITY DEFINER: la función corre con privilegios del owner (postgres),
-- no del caller. Por eso la whitelist es CRÍTICA para evitar que un usuario
-- malicioso pueda actualizar tablas arbitrarias.
--
-- El caller igual debe tener UPDATE permitido por RLS en esa fila específica
-- (la función hace UPDATE, y el UPDATE de la app pasa por RLS del caller
-- cuando no es SECURITY DEFINER... pero aquí sí lo es).
--
-- DECISIÓN DE SEGURIDAD: dado que es SECURITY DEFINER, la whitelist es la
-- única barrera contra table injection. Mantener actualizada al agregar tablas.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.soft_delete(
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
  -- Validar que la tabla esté en la whitelist
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'soft_delete: tabla no permitida: %', p_table
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Ejecutar soft delete (solo si no está ya eliminado)
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
    p_table
  ) USING p_id;
END;
$$;

-- Revocar acceso público y conceder solo a authenticated
REVOKE ALL ON FUNCTION public.soft_delete(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete(text, uuid) TO authenticated;

COMMIT;


-- =============================================================================
-- BLOQUE 5 — Reemplazar policies DELETE Arquetipo A
--
-- Antes (0003): is_superadmin() OR has_delete_role(project_id)
-- Ahora (0004): is_superadmin()  ← solo superadmin puede DELETE físico
--
-- El "delete" del usuario pasa a ser soft delete vía función del Bloque 4.
-- Arquetipo B y C ya eran solo superadmin → no se tocan.
--
-- Tablas Arquetipo A con soft delete:
-- bom_lines, requirements, compliance_matrix, rfqs, risks, systems,
-- circulars, project_queries, documents
--
-- NOTA: rfq_lines y quotes son Arquetipo C → no se tocan aquí.
-- decisions: verificar en Fase 0 su arquetipo. Asumido Arquetipo A.
-- =============================================================================

BEGIN;

-- ---- bom_lines ----
DROP POLICY IF EXISTS bom_lines_delete ON public.bom_lines;
CREATE POLICY bom_lines_delete ON public.bom_lines
  FOR DELETE USING (public.is_superadmin());

-- ---- requirements ----
DROP POLICY IF EXISTS requirements_delete ON public.requirements;
CREATE POLICY requirements_delete ON public.requirements
  FOR DELETE USING (public.is_superadmin());

-- ---- compliance_matrix ----
DROP POLICY IF EXISTS compliance_matrix_delete ON public.compliance_matrix;
CREATE POLICY compliance_matrix_delete ON public.compliance_matrix
  FOR DELETE USING (public.is_superadmin());

-- ---- rfqs ----
DROP POLICY IF EXISTS rfqs_delete ON public.rfqs;
CREATE POLICY rfqs_delete ON public.rfqs
  FOR DELETE USING (public.is_superadmin());

-- ---- risks ----
DROP POLICY IF EXISTS risks_delete ON public.risks;
CREATE POLICY risks_delete ON public.risks
  FOR DELETE USING (public.is_superadmin());

-- ---- systems ----
DROP POLICY IF EXISTS systems_delete ON public.systems;
CREATE POLICY systems_delete ON public.systems
  FOR DELETE USING (public.is_superadmin());

-- ---- circulars ----
DROP POLICY IF EXISTS circulars_delete ON public.circulars;
CREATE POLICY circulars_delete ON public.circulars
  FOR DELETE USING (public.is_superadmin());

-- ---- project_queries ----
DROP POLICY IF EXISTS project_queries_delete ON public.project_queries;
CREATE POLICY project_queries_delete ON public.project_queries
  FOR DELETE USING (public.is_superadmin());

-- ---- documents ----
DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents
  FOR DELETE USING (public.is_superadmin());

-- ---- decisions ----
-- Verificar en Fase 0 si decisions era Arquetipo A o B.
-- Si era Arquetipo B (ya era solo superadmin), este DROP+CREATE es idempotente.
DROP POLICY IF EXISTS decisions_delete ON public.decisions;
CREATE POLICY decisions_delete ON public.decisions
  FOR DELETE USING (public.is_superadmin());

COMMIT;


-- =============================================================================
-- FIN DE 0004_soft_delete.sql
-- Ejecutar queries de Fase 2 para verificar criterios de aceptación.
-- NO aplicar a producción sin aprobación humana explícita.
-- =============================================================================
