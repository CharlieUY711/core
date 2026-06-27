-- =============================================================================
-- ROLLBACK 0004 — Revierte soft delete al estado post-0003
-- Proyecto: CORE / BEP
-- PRECONDICIÓN: 0004_soft_delete.sql fue aplicada exitosamente.
-- EFECTO: restaura el estado exacto de 0003_governance_security.
--
-- ADVERTENCIA: Aplicar este rollback elimina la columna deleted_at y todos
-- sus datos. Si hay registros soft-deleted en producción, se perderá esa info.
-- Confirmar con el equipo antes de correr en producción.
--
-- INSTRUCCIÓN: ejecutar cada bloque por separado en el SQL Editor de Supabase.
-- BLOQUES:
--   BLOQUE R1 — Dropear función soft_delete
--   BLOQUE R2 — Restaurar policies DELETE Arquetipo A (con has_delete_role)
--   BLOQUE R3 — Restaurar policies SELECT sin filtro deleted_at
--   BLOQUE R4 — Dropear índices parciales
--   BLOQUE R5 — Dropear columnas deleted_at
-- =============================================================================


-- =============================================================================
-- BLOQUE R1 — Dropear función soft_delete
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.soft_delete(text, uuid);

COMMIT;


-- =============================================================================
-- BLOQUE R2 — Restaurar policies DELETE Arquetipo A
-- Estado objetivo: is_superadmin() OR has_delete_role(project_id)
-- (forma exacta de 0003_governance_security)
-- =============================================================================

BEGIN;

-- ---- bom_lines ----
DROP POLICY IF EXISTS bom_lines_delete ON public.bom_lines;
CREATE POLICY bom_lines_delete ON public.bom_lines
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ---- requirements ----
DROP POLICY IF EXISTS requirements_delete ON public.requirements;
CREATE POLICY requirements_delete ON public.requirements
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ---- compliance_matrix ----
DROP POLICY IF EXISTS compliance_matrix_delete ON public.compliance_matrix;
CREATE POLICY compliance_matrix_delete ON public.compliance_matrix
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ---- rfqs ----
DROP POLICY IF EXISTS rfqs_delete ON public.rfqs;
CREATE POLICY rfqs_delete ON public.rfqs
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ---- risks ----
DROP POLICY IF EXISTS risks_delete ON public.risks;
CREATE POLICY risks_delete ON public.risks
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ---- systems ----
DROP POLICY IF EXISTS systems_delete ON public.systems;
CREATE POLICY systems_delete ON public.systems
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ---- circulars ----
DROP POLICY IF EXISTS circulars_delete ON public.circulars;
CREATE POLICY circulars_delete ON public.circulars
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ---- project_queries ----
DROP POLICY IF EXISTS project_queries_delete ON public.project_queries;
CREATE POLICY project_queries_delete ON public.project_queries
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ---- documents ----
DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ---- decisions ----
-- Si decisions era Arquetipo B en 0003 (solo superadmin), ajustar aquí.
DROP POLICY IF EXISTS decisions_delete ON public.decisions;
CREATE POLICY decisions_delete ON public.decisions
  FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

COMMIT;


-- =============================================================================
-- BLOQUE R3 — Restaurar policies SELECT sin filtro deleted_at IS NULL
-- Estado objetivo: USING expr originales de 0003 (sin deleted_at).
-- =============================================================================

BEGIN;

-- ---- bom_lines ----
DROP POLICY IF EXISTS bom_lines_select ON public.bom_lines;
CREATE POLICY bom_lines_select ON public.bom_lines
  FOR SELECT USING (is_project_member(project_id));

-- ---- requirements ----
DROP POLICY IF EXISTS requirements_select ON public.requirements;
CREATE POLICY requirements_select ON public.requirements
  FOR SELECT USING (is_project_member(project_id));

-- ---- compliance_matrix ----
DROP POLICY IF EXISTS compliance_matrix_select ON public.compliance_matrix;
CREATE POLICY compliance_matrix_select ON public.compliance_matrix
  FOR SELECT USING (is_project_member(project_id));

-- ---- rfqs ----
DROP POLICY IF EXISTS rfqs_select ON public.rfqs;
CREATE POLICY rfqs_select ON public.rfqs
  FOR SELECT USING (is_project_member(project_id));

-- ---- rfq_lines ----
DROP POLICY IF EXISTS rfq_lines_select ON public.rfq_lines;
CREATE POLICY rfq_lines_select ON public.rfq_lines
  FOR SELECT USING (is_project_member(project_id));

-- ---- risks ----
DROP POLICY IF EXISTS risks_select ON public.risks;
CREATE POLICY risks_select ON public.risks
  FOR SELECT USING (is_project_member(project_id));

-- ---- systems ----
DROP POLICY IF EXISTS systems_select ON public.systems;
CREATE POLICY systems_select ON public.systems
  FOR SELECT USING (is_project_member(project_id));

-- ---- circulars ----
DROP POLICY IF EXISTS circulars_select ON public.circulars;
CREATE POLICY circulars_select ON public.circulars
  FOR SELECT USING (is_project_member(project_id));

-- ---- project_queries ----
DROP POLICY IF EXISTS project_queries_select ON public.project_queries;
CREATE POLICY project_queries_select ON public.project_queries
  FOR SELECT USING (is_project_member(project_id));

-- ---- documents ----
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
  FOR SELECT USING (is_project_member(project_id));

-- ---- decisions ----
DROP POLICY IF EXISTS decisions_select ON public.decisions;
CREATE POLICY decisions_select ON public.decisions
  FOR SELECT USING (is_project_member(project_id));

-- ---- quotes ----
DROP POLICY IF EXISTS quotes_select ON public.quotes;
CREATE POLICY quotes_select ON public.quotes
  FOR SELECT USING (is_project_member(project_id));

-- ---- projects ----
DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT USING (is_project_member(id));

-- ---- project_members ----
DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members
  FOR SELECT USING (is_project_member(project_id));

-- ---- organizations ----
DROP POLICY IF EXISTS organizations_select ON public.organizations;
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ---- workspaces ----
DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ---- manufacturers ----
DROP POLICY IF EXISTS manufacturers_select ON public.manufacturers;
CREATE POLICY manufacturers_select ON public.manufacturers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ---- products ----
DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

COMMIT;


-- =============================================================================
-- BLOQUE R4 — Dropear índices parciales
-- =============================================================================

BEGIN;

DROP INDEX IF EXISTS public.idx_bom_lines_deleted_at;
DROP INDEX IF EXISTS public.idx_requirements_deleted_at;
DROP INDEX IF EXISTS public.idx_compliance_matrix_deleted_at;
DROP INDEX IF EXISTS public.idx_rfqs_deleted_at;
DROP INDEX IF EXISTS public.idx_rfq_lines_deleted_at;
DROP INDEX IF EXISTS public.idx_risks_deleted_at;
DROP INDEX IF EXISTS public.idx_systems_deleted_at;
DROP INDEX IF EXISTS public.idx_circulars_deleted_at;
DROP INDEX IF EXISTS public.idx_project_queries_deleted_at;
DROP INDEX IF EXISTS public.idx_documents_deleted_at;
DROP INDEX IF EXISTS public.idx_decisions_deleted_at;
DROP INDEX IF EXISTS public.idx_quotes_deleted_at;
DROP INDEX IF EXISTS public.idx_projects_deleted_at;
DROP INDEX IF EXISTS public.idx_project_members_deleted_at;
DROP INDEX IF EXISTS public.idx_organizations_deleted_at;
DROP INDEX IF EXISTS public.idx_workspaces_deleted_at;
DROP INDEX IF EXISTS public.idx_manufacturers_deleted_at;
DROP INDEX IF EXISTS public.idx_products_deleted_at;

COMMIT;


-- =============================================================================
-- BLOQUE R5 — Dropear columnas deleted_at
-- ADVERTENCIA: esto elimina datos de soft delete si los hay.
-- =============================================================================

BEGIN;

ALTER TABLE public.bom_lines         DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.requirements      DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.compliance_matrix DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.rfqs              DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.rfq_lines         DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.risks             DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.systems           DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.circulars         DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.project_queries   DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.documents         DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.decisions         DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.quotes            DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.projects          DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.project_members   DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.organizations     DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.workspaces        DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.manufacturers     DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.products          DROP COLUMN IF EXISTS deleted_at;

COMMIT;


-- =============================================================================
-- FIN DE 0004_rollback.sql
-- Estado resultante: equivalente a post-0003_governance_security.
-- =============================================================================
