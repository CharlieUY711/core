-- ============================================================
-- ROLLBACK: 0003_rollback.sql
-- Revierte 0003_governance_security.sql
-- ADVERTENCIA: Solo aplicar si la migración fue aplicada y NO
-- se aplicó ninguna migración posterior.
-- NO aplicar a producción sin aprobación humana explícita.
-- ============================================================

BEGIN;

-- ============================================================
-- ROLLBACK CAMBIO 4 — Eliminar todas las policies de DELETE
-- ============================================================

-- Arquetipo A
DROP POLICY IF EXISTS bom_lines_delete        ON public.bom_lines;
DROP POLICY IF EXISTS requirements_delete     ON public.requirements;
DROP POLICY IF EXISTS compliance_matrix_delete ON public.compliance_matrix;
DROP POLICY IF EXISTS rfqs_delete             ON public.rfqs;
DROP POLICY IF EXISTS risks_delete            ON public.risks;
DROP POLICY IF EXISTS systems_delete          ON public.systems;
DROP POLICY IF EXISTS circulars_delete        ON public.circulars;
DROP POLICY IF EXISTS project_queries_delete  ON public.project_queries;
DROP POLICY IF EXISTS documents_delete        ON public.documents;

-- Arquetipo B
DROP POLICY IF EXISTS decisions_delete        ON public.decisions;
DROP POLICY IF EXISTS lessons_learned_delete  ON public.lessons_learned;
DROP POLICY IF EXISTS entity_versions_delete  ON public.entity_versions;
DROP POLICY IF EXISTS entity_links_delete     ON public.entity_links;

-- Arquetipo C
DROP POLICY IF EXISTS projects_delete         ON public.projects;
DROP POLICY IF EXISTS project_members_delete  ON public.project_members;
DROP POLICY IF EXISTS organizations_delete    ON public.organizations;
DROP POLICY IF EXISTS workspaces_delete       ON public.workspaces;
DROP POLICY IF EXISTS profiles_delete         ON public.profiles;
DROP POLICY IF EXISTS manufacturers_delete    ON public.manufacturers;
DROP POLICY IF EXISTS products_delete         ON public.products;
DROP POLICY IF EXISTS quotes_delete           ON public.quotes;
DROP POLICY IF EXISTS rfq_lines_delete        ON public.rfq_lines;

-- Helper de delete roles
DROP FUNCTION IF EXISTS public.has_delete_role(uuid);

-- ============================================================
-- ROLLBACK CAMBIO 3 — Restaurar policies superadmin con is_superadmin()
-- y eliminar la infraestructura del flag
--
-- NOTA IMPORTANTE: El rollback NO re-hardcodea el UUID en las policies.
-- En su lugar, mantiene is_superadmin() como mecanismo de control.
-- Si se requiere volver al UUID hardcodeado, hacerlo manualmente y de
-- forma consciente — no es una operación que deba automatizarse.
--
-- Lo que SÍ revierte este script:
--   - Elimina la función is_superadmin()
--   - Elimina la columna profiles.is_superadmin
--   - Recrea las 8 policies superadmin_* con el UUID original
--     (como estado pre-0003, documentado aquí para trazabilidad)
-- ============================================================

-- Dropear las 8 policies que usan is_superadmin()
DROP POLICY IF EXISTS superadmin_bom          ON public.bom_lines;
DROP POLICY IF EXISTS superadmin_compliance   ON public.compliance_matrix;
DROP POLICY IF EXISTS superadmin_documents    ON public.documents;
DROP POLICY IF EXISTS superadmin_members      ON public.project_members;
DROP POLICY IF EXISTS superadmin_bypass       ON public.projects;
DROP POLICY IF EXISTS superadmin_requirements ON public.requirements;
DROP POLICY IF EXISTS superadmin_rfqs         ON public.rfqs;
DROP POLICY IF EXISTS superadmin_risks        ON public.risks;

-- Recrear con UUID hardcodeado (estado pre-0003)
-- ADVERTENCIA: Esto re-introduce el antipatrón que 0003 elimina.
-- Usar solo como medida de emergencia temporal.
CREATE POLICY superadmin_bom
  ON public.bom_lines FOR ALL
  USING (auth.uid() = '5e12ace0-05c6-4208-b7c8-8250b7063848'::uuid);

CREATE POLICY superadmin_compliance
  ON public.compliance_matrix FOR ALL
  USING (auth.uid() = '5e12ace0-05c6-4208-b7c8-8250b7063848'::uuid);

CREATE POLICY superadmin_documents
  ON public.documents FOR ALL
  USING (auth.uid() = '5e12ace0-05c6-4208-b7c8-8250b7063848'::uuid);

CREATE POLICY superadmin_members
  ON public.project_members FOR ALL
  USING (auth.uid() = '5e12ace0-05c6-4208-b7c8-8250b7063848'::uuid);

CREATE POLICY superadmin_bypass
  ON public.projects FOR ALL
  USING (auth.uid() = '5e12ace0-05c6-4208-b7c8-8250b7063848'::uuid);

CREATE POLICY superadmin_requirements
  ON public.requirements FOR ALL
  USING (auth.uid() = '5e12ace0-05c6-4208-b7c8-8250b7063848'::uuid);

CREATE POLICY superadmin_rfqs
  ON public.rfqs FOR ALL
  USING (auth.uid() = '5e12ace0-05c6-4208-b7c8-8250b7063848'::uuid);

CREATE POLICY superadmin_risks
  ON public.risks FOR ALL
  USING (auth.uid() = '5e12ace0-05c6-4208-b7c8-8250b7063848'::uuid);

-- Eliminar función helper
DROP FUNCTION IF EXISTS public.is_superadmin();

-- Eliminar columna is_superadmin de profiles
-- PRECAUCIÓN: esto borra el dato de quién es superadmin.
-- Asegurarse de tener el UUID anotado antes de ejecutar.
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS is_superadmin;

-- ============================================================
-- ROLLBACK CAMBIO 2 — Restaurar project_members.role a enum project_role
-- ============================================================

-- Dropear FK a project_roles
ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS fk_project_members_role;

-- Dropear la policy recreada (sin cast al enum)
DROP POLICY IF EXISTS project_members_select ON public.project_members;

-- Restaurar tipo enum
ALTER TABLE public.project_members
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.project_members
  ALTER COLUMN role TYPE project_role USING role::project_role;

ALTER TABLE public.project_members
  ALTER COLUMN role SET DEFAULT 'guest'::project_role;

-- Recrear la policy original con cast al enum
CREATE POLICY project_members_select
  ON public.project_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id    = auth.uid()
        AND pm2.role       = ANY (ARRAY['bid_manager'::project_role, 'pmo'::project_role])
    )
  );

-- ============================================================
-- ROLLBACK CAMBIO 1 — Vaciar project_roles
-- NOTA: Solo elimina los 14 roles insertados por 0003.
-- Si había datos previos (no los había según Fase 0), este DELETE
-- los respeta usando el filtro de IDs exactos.
-- ============================================================

DELETE FROM public.project_roles
WHERE id IN (
  'bid_manager', 'director', 'manager', 'engineer', 'procurement',
  'cost', 'pmo', 'consultant', 'guest', 'client',
  'manufacturer', 'distributor', 'supplier', 'subcontract'
);

-- ============================================================
-- FIN DE ROLLBACK
-- ============================================================

COMMIT;
