-- ============================================================
-- MIGRACIÓN: 0003_governance_security.sql
-- Repo:      C:\CORE\apps\BEP
-- Destino:   apps/core-bep/supabase/migrations/
-- Aplicada:  2026-06-27 — verificada en producción (Fase 2 OK)
--
-- NOTA DE APLICACIÓN:
--   Esta migración fue aplicada en bloques separados vía SQL Editor
--   de Supabase debido a limitaciones del editor (ejecuta un statement
--   a la vez en bloques multi-statement). El contenido es idéntico
--   al resultado verificado. Para re-aplicar en un entorno limpio,
--   correr los 6 bloques en orden.
--
-- CAMBIOS:
--   1. Seed de project_roles (14 roles)
--   2. Migrar project_members.role: enum project_role → text + FK
--   3. Reemplazar superadmin hardcodeado → flag is_superadmin + helper
--   4. Policies de DELETE por arquetipo (22 policies)
--
-- GUARDRAILS:
--   - Idempotente: re-ejecutar no rompe nada
--   - No destructivo: cero borrado de filas
--   - NO aplicar a producción sin aprobación humana explícita
-- ============================================================


-- ============================================================
-- BLOQUE 1 — SEED DE project_roles (14 roles)
-- Idempotente: ON CONFLICT (id) DO UPDATE
-- ============================================================

INSERT INTO public.project_roles (id, label, category, sort_order, active) VALUES
  -- Internos
  ('bid_manager',  'Bid Manager',       'internal', 1,  true),
  ('director',     'Director',          'internal', 2,  true),
  ('manager',      'Gerente',           'internal', 3,  true),
  ('engineer',     'Ingeniero',         'internal', 4,  true),
  ('procurement',  'Compras',           'internal', 5,  true),
  ('cost',         'Control de Costos', 'internal', 6,  true),
  ('pmo',          'PMO',               'internal', 7,  true),
  -- Limitados
  ('consultant',   'Consultor',         'limited',  8,  true),
  ('guest',        'Invitado',          'limited',  9,  true),
  -- Externos
  ('client',       'Cliente',           'external', 10, true),
  ('manufacturer', 'Fabricante',        'external', 11, true),
  ('distributor',  'Distribuidor',      'external', 12, true),
  ('supplier',     'Proveedor',         'external', 13, true),
  ('subcontract',  'Subcontrato',       'external', 14, true)
ON CONFLICT (id) DO UPDATE SET
  label      = EXCLUDED.label,
  category   = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  active     = EXCLUDED.active;


-- ============================================================
-- BLOQUE 2 — MIGRAR project_members.role: enum → text
--
-- Dependencia identificada en Fase 0:
--   policy project_members_select usa cast ::project_role → se dropea
--   y se recrea sin cast.
-- has_project_permission y is_project_member NO dependen del enum.
--
-- NOTA: El enum project_role NO se dropea aquí.
--       Ver cleanup futuro en MIGRATION-0003-REPORT.md
-- ============================================================

-- Dropear policy dependiente del enum ANTES de alterar la columna
DROP POLICY IF EXISTS project_members_select ON public.project_members;

-- Alterar columna role: enum → text
ALTER TABLE public.project_members
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.project_members
  ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE public.project_members
  ALTER COLUMN role SET DEFAULT 'guest';

-- FK a project_roles (requiere que el Bloque 1 ya haya corrido)
ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS fk_project_members_role;

ALTER TABLE public.project_members
  ADD CONSTRAINT fk_project_members_role
  FOREIGN KEY (role) REFERENCES public.project_roles(id);

-- Recrear policy sin cast al enum
-- Antes: pm2.role = ANY (ARRAY['bid_manager'::project_role, 'pmo'::project_role])
-- Ahora: pm2.role = ANY (ARRAY['bid_manager', 'pmo'])
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
        AND pm2.role       = ANY (ARRAY['bid_manager', 'pmo'])
    )
  );


-- ============================================================
-- BLOQUE 3 — COLUMNA is_superadmin EN profiles
-- Separado del Bloque 4 para permitir el UPDATE posterior
-- cuando el usuario haga su primer login.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

-- Seed backward-compatible.
-- NOTA: Si profiles está vacía (primer deploy), este UPDATE afecta 0 filas.
-- Ejecutar manualmente después del primer login del superadmin:
--   UPDATE public.profiles SET is_superadmin = true
--   WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';
UPDATE public.profiles
  SET is_superadmin = true
  WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';


-- ============================================================
-- BLOQUE 4 — FUNCIONES HELPER
-- ============================================================

-- Helper superadmin: usa el flag en profiles, nunca UUID hardcodeado
CREATE OR REPLACE FUNCTION public.is_superadmin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_superadmin = true
  );
$$;

-- Helper delete roles: roles elevados con permiso de borrado en proyecto
CREATE OR REPLACE FUNCTION public.has_delete_role(p_project_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id    = auth.uid()
      AND role       = ANY (ARRAY['bid_manager', 'pmo', 'director', 'manager'])
  );
$$;


-- ============================================================
-- BLOQUE 5 — REEMPLAZAR POLICIES superadmin_* (UUID → is_superadmin)
--
-- Nombres exactos verificados en Fase 0:
--   bom_lines         → superadmin_bom
--   compliance_matrix → superadmin_compliance
--   documents         → superadmin_documents
--   project_members   → superadmin_members
--   projects          → superadmin_bypass   ← nombre especial
--   requirements      → superadmin_requirements
--   rfqs              → superadmin_rfqs
--   risks             → superadmin_risks
-- ============================================================

DROP POLICY IF EXISTS superadmin_bom          ON public.bom_lines;
DROP POLICY IF EXISTS superadmin_compliance   ON public.compliance_matrix;
DROP POLICY IF EXISTS superadmin_documents    ON public.documents;
DROP POLICY IF EXISTS superadmin_members      ON public.project_members;
DROP POLICY IF EXISTS superadmin_bypass       ON public.projects;
DROP POLICY IF EXISTS superadmin_requirements ON public.requirements;
DROP POLICY IF EXISTS superadmin_rfqs         ON public.rfqs;
DROP POLICY IF EXISTS superadmin_risks        ON public.risks;

CREATE POLICY superadmin_bom          ON public.bom_lines         FOR ALL USING (public.is_superadmin());
CREATE POLICY superadmin_compliance   ON public.compliance_matrix FOR ALL USING (public.is_superadmin());
CREATE POLICY superadmin_documents    ON public.documents         FOR ALL USING (public.is_superadmin());
CREATE POLICY superadmin_members      ON public.project_members   FOR ALL USING (public.is_superadmin());
CREATE POLICY superadmin_bypass       ON public.projects          FOR ALL USING (public.is_superadmin());
CREATE POLICY superadmin_requirements ON public.requirements      FOR ALL USING (public.is_superadmin());
CREATE POLICY superadmin_rfqs         ON public.rfqs              FOR ALL USING (public.is_superadmin());
CREATE POLICY superadmin_risks        ON public.risks             FOR ALL USING (public.is_superadmin());


-- ============================================================
-- BLOQUE 6 — POLICIES DE DELETE POR ARQUETIPO (22 policies)
--
-- Arquetipo A — Transaccionales (scoped a proyecto):
--   superadmin OR rol elevado en el proyecto
--   Roles con permiso delete: bid_manager, pmo, director, manager
--
-- Arquetipo B — Conocimiento inmutable:
--   solo superadmin (preservar conocimiento organizacional)
--
-- Arquetipo C — Config / nivel superior:
--   solo superadmin
-- ============================================================

-- ── ARQUETIPO A ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS bom_lines_delete         ON public.bom_lines;
DROP POLICY IF EXISTS requirements_delete      ON public.requirements;
DROP POLICY IF EXISTS compliance_matrix_delete ON public.compliance_matrix;
DROP POLICY IF EXISTS rfqs_delete              ON public.rfqs;
DROP POLICY IF EXISTS risks_delete             ON public.risks;
DROP POLICY IF EXISTS systems_delete           ON public.systems;
DROP POLICY IF EXISTS circulars_delete         ON public.circulars;
DROP POLICY IF EXISTS project_queries_delete   ON public.project_queries;
DROP POLICY IF EXISTS documents_delete         ON public.documents;

CREATE POLICY bom_lines_delete         ON public.bom_lines        FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));
CREATE POLICY requirements_delete      ON public.requirements      FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));
CREATE POLICY compliance_matrix_delete ON public.compliance_matrix FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));
CREATE POLICY rfqs_delete              ON public.rfqs              FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));
CREATE POLICY risks_delete             ON public.risks             FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));
CREATE POLICY systems_delete           ON public.systems           FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));
CREATE POLICY circulars_delete         ON public.circulars         FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));
CREATE POLICY project_queries_delete   ON public.project_queries   FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));
CREATE POLICY documents_delete         ON public.documents         FOR DELETE USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ── ARQUETIPO B ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS decisions_delete       ON public.decisions;
DROP POLICY IF EXISTS lessons_learned_delete ON public.lessons_learned;
DROP POLICY IF EXISTS entity_versions_delete ON public.entity_versions;
DROP POLICY IF EXISTS entity_links_delete    ON public.entity_links;

CREATE POLICY decisions_delete       ON public.decisions       FOR DELETE USING (public.is_superadmin());
CREATE POLICY lessons_learned_delete ON public.lessons_learned FOR DELETE USING (public.is_superadmin());
CREATE POLICY entity_versions_delete ON public.entity_versions FOR DELETE USING (public.is_superadmin());
CREATE POLICY entity_links_delete    ON public.entity_links    FOR DELETE USING (public.is_superadmin());

-- ── ARQUETIPO C ───────────────────────────────────────────────────────────────
-- NOTA FK CASCADE: project_members tiene FK project_id → projects(id) ON DELETE CASCADE.
-- Si se borra un proyecto (superadmin), sus members se borran vía CASCADE.
-- La policy DELETE en project_members cubre el borrado directo de miembros.

DROP POLICY IF EXISTS projects_delete        ON public.projects;
DROP POLICY IF EXISTS project_members_delete ON public.project_members;
DROP POLICY IF EXISTS organizations_delete   ON public.organizations;
DROP POLICY IF EXISTS workspaces_delete      ON public.workspaces;
DROP POLICY IF EXISTS profiles_delete        ON public.profiles;
DROP POLICY IF EXISTS manufacturers_delete   ON public.manufacturers;
DROP POLICY IF EXISTS products_delete        ON public.products;
DROP POLICY IF EXISTS quotes_delete          ON public.quotes;
DROP POLICY IF EXISTS rfq_lines_delete       ON public.rfq_lines;

CREATE POLICY projects_delete        ON public.projects        FOR DELETE USING (public.is_superadmin());
CREATE POLICY project_members_delete ON public.project_members FOR DELETE USING (public.is_superadmin());
CREATE POLICY organizations_delete   ON public.organizations   FOR DELETE USING (public.is_superadmin());
CREATE POLICY workspaces_delete      ON public.workspaces      FOR DELETE USING (public.is_superadmin());
CREATE POLICY profiles_delete        ON public.profiles        FOR DELETE USING (public.is_superadmin());
CREATE POLICY manufacturers_delete   ON public.manufacturers   FOR DELETE USING (public.is_superadmin());
CREATE POLICY products_delete        ON public.products        FOR DELETE USING (public.is_superadmin());
CREATE POLICY quotes_delete          ON public.quotes          FOR DELETE USING (public.is_superadmin());
CREATE POLICY rfq_lines_delete       ON public.rfq_lines       FOR DELETE USING (public.is_superadmin());

-- ============================================================
-- FIN DE MIGRACIÓN 0003
-- Estado: aplicada y verificada 2026-06-27
-- ============================================================
