-- ============================================================
-- MIGRACIÓN: 0003_governance_security.sql
-- Repo:      C:\CORE\apps\BEP
-- Destino:   apps/core-bep/supabase/migrations/
-- Autor:     generado por Claude (Fase 1) — revisar antes de aplicar
-- Fecha:     2026-06-27
--
-- CAMBIOS:
--   1. Seed de project_roles (14 roles)
--   2. Migrar project_members.role de enum project_role → text + FK
--   3. Reemplazar superadmin hardcodeado (UUID) → flag is_superadmin en profiles
--   4. Policies de DELETE por arquetipo
--
-- GUARDRAILS:
--   - Una sola transacción. Si algo falla → rollback total.
--   - Idempotente: re-ejecutar no rompe nada.
--   - No destructivo: cero borrado de filas.
--   - NO aplicar a producción sin aprobación humana explícita.
--   - Probar primero en branch/shadow: supabase db reset --local
-- ============================================================

BEGIN;

-- ============================================================
-- CAMBIO 1 — SEED DE project_roles (14 roles)
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
-- CAMBIO 2 — MIGRAR project_members.role: enum → text + FK
--
-- Dependencias identificadas en Fase 0:
--   - Policy: project_members_select  → usa cast ::project_role  ← HAY QUE RECREAR
--   - Función: has_project_permission → usa permissions text[]   ← NO depende del enum, OK
--   - Función: is_project_member      → no toca role             ← OK
--
-- NOTA: El enum project_role NO se dropea aquí (puede tener otras
-- dependencias fuera del scope). Marcado como cleanup futuro.
-- ============================================================

-- 2.1 Dropear policy que depende del enum ANTES de alterar la columna
DROP POLICY IF EXISTS project_members_select ON public.project_members;

-- 2.2 Alterar la columna role: enum → text
ALTER TABLE public.project_members
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.project_members
  ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE public.project_members
  ALTER COLUMN role SET DEFAULT 'guest';

-- 2.3 Agregar FK a project_roles (idempotente: drop si existe primero)
ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS fk_project_members_role;

ALTER TABLE public.project_members
  ADD CONSTRAINT fk_project_members_role
  FOREIGN KEY (role) REFERENCES public.project_roles(id);

-- 2.4 Recrear la policy project_members_select sin cast ::project_role
--     Original: pm2.role = ANY (ARRAY['bid_manager'::project_role, 'pmo'::project_role])
--     Nueva:    pm2.role = ANY (ARRAY['bid_manager', 'pmo'])  — texto puro
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
-- CAMBIO 3 — REEMPLAZAR SUPERADMIN HARDCODEADO
--
-- Estrategia:
--   a. Agregar columna profiles.is_superadmin (si no existe)
--   b. Seed backward-compatible: el usuario 5e12ace0-... recibe el flag
--   c. Crear helper is_superadmin()
--   d. Para las 8 tablas con policy ALL por UUID:
--      DROP policy existente → CREATE equivalente con is_superadmin()
--
-- Tablas y nombres exactos de policies (verificados en Fase 0):
--   bom_lines         → superadmin_bom
--   compliance_matrix → superadmin_compliance
--   documents         → superadmin_documents
--   project_members   → superadmin_members
--   projects          → superadmin_bypass   ← nombre especial, verificado
--   requirements      → superadmin_requirements
--   rfqs              → superadmin_rfqs
--   risks             → superadmin_risks
-- ============================================================

-- 3.1 Agregar columna is_superadmin a profiles (idempotente)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

-- 3.2 Seed backward-compatible: preservar acceso del superadmin actual
UPDATE public.profiles
  SET is_superadmin = true
  WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';

-- 3.3 Crear helper is_superadmin()
--     SECURITY DEFINER + search_path fijo para evitar hijacking
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

-- 3.4 Reemplazar las 8 policies superadmin_* (DROP + CREATE, mismos nombres)

-- bom_lines
DROP POLICY IF EXISTS superadmin_bom ON public.bom_lines;
CREATE POLICY superadmin_bom
  ON public.bom_lines
  FOR ALL
  USING (public.is_superadmin());

-- compliance_matrix
DROP POLICY IF EXISTS superadmin_compliance ON public.compliance_matrix;
CREATE POLICY superadmin_compliance
  ON public.compliance_matrix
  FOR ALL
  USING (public.is_superadmin());

-- documents
DROP POLICY IF EXISTS superadmin_documents ON public.documents;
CREATE POLICY superadmin_documents
  ON public.documents
  FOR ALL
  USING (public.is_superadmin());

-- project_members
DROP POLICY IF EXISTS superadmin_members ON public.project_members;
CREATE POLICY superadmin_members
  ON public.project_members
  FOR ALL
  USING (public.is_superadmin());

-- projects (nombre verificado en Fase 0: superadmin_bypass)
DROP POLICY IF EXISTS superadmin_bypass ON public.projects;
CREATE POLICY superadmin_bypass
  ON public.projects
  FOR ALL
  USING (public.is_superadmin());

-- requirements
DROP POLICY IF EXISTS superadmin_requirements ON public.requirements;
CREATE POLICY superadmin_requirements
  ON public.requirements
  FOR ALL
  USING (public.is_superadmin());

-- rfqs
DROP POLICY IF EXISTS superadmin_rfqs ON public.rfqs;
CREATE POLICY superadmin_rfqs
  ON public.rfqs
  FOR ALL
  USING (public.is_superadmin());

-- risks
DROP POLICY IF EXISTS superadmin_risks ON public.risks;
CREATE POLICY superadmin_risks
  ON public.risks
  FOR ALL
  USING (public.is_superadmin());

-- ============================================================
-- CAMBIO 4 — POLICIES DE DELETE POR ARQUETIPO
--
-- Decisión de Fase 0: has_project_permission chequea permissions text[].
-- El permiso 'delete' NO está en ningún row actualmente.
-- → Se gatean los DELETE por roles elevados: bid_manager, pmo,
--   director, manager (consistente con el prompt cuando 'delete'
--   no es viable vía has_project_permission).
--
-- Helper local (no persiste, solo para legibilidad):
--   has_delete_role(project_id) → true si el usuario tiene rol elevado
--
-- Arquetipos:
--   A) Transaccionales (scoped a proyecto): superadmin OR rol elevado
--   B) Conocimiento inmutable: solo superadmin
--   C) Config / nivel superior: solo superadmin
-- ============================================================

-- Helper inline reutilizable como función
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

-- ── ARQUETIPO A: Transaccionales / scoped a proyecto ──────────────────────────
-- DELETE permitido a superadmin O a roles elevados del proyecto

-- bom_lines
DROP POLICY IF EXISTS bom_lines_delete ON public.bom_lines;
CREATE POLICY bom_lines_delete
  ON public.bom_lines
  FOR DELETE
  USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- requirements
DROP POLICY IF EXISTS requirements_delete ON public.requirements;
CREATE POLICY requirements_delete
  ON public.requirements
  FOR DELETE
  USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- compliance_matrix
DROP POLICY IF EXISTS compliance_matrix_delete ON public.compliance_matrix;
CREATE POLICY compliance_matrix_delete
  ON public.compliance_matrix
  FOR DELETE
  USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- rfqs
DROP POLICY IF EXISTS rfqs_delete ON public.rfqs;
CREATE POLICY rfqs_delete
  ON public.rfqs
  FOR DELETE
  USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- risks
DROP POLICY IF EXISTS risks_delete ON public.risks;
CREATE POLICY risks_delete
  ON public.risks
  FOR DELETE
  USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- systems
DROP POLICY IF EXISTS systems_delete ON public.systems;
CREATE POLICY systems_delete
  ON public.systems
  FOR DELETE
  USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- circulars
DROP POLICY IF EXISTS circulars_delete ON public.circulars;
CREATE POLICY circulars_delete
  ON public.circulars
  FOR DELETE
  USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- project_queries
DROP POLICY IF EXISTS project_queries_delete ON public.project_queries;
CREATE POLICY project_queries_delete
  ON public.project_queries
  FOR DELETE
  USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- documents
DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete
  ON public.documents
  FOR DELETE
  USING (public.is_superadmin() OR public.has_delete_role(project_id));

-- ── ARQUETIPO B: Conocimiento inmutable — solo superadmin ─────────────────────
-- decisions, lessons_learned, entity_versions, entity_links

DROP POLICY IF EXISTS decisions_delete ON public.decisions;
CREATE POLICY decisions_delete
  ON public.decisions
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS lessons_learned_delete ON public.lessons_learned;
CREATE POLICY lessons_learned_delete
  ON public.lessons_learned
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS entity_versions_delete ON public.entity_versions;
CREATE POLICY entity_versions_delete
  ON public.entity_versions
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS entity_links_delete ON public.entity_links;
CREATE POLICY entity_links_delete
  ON public.entity_links
  FOR DELETE
  USING (public.is_superadmin());

-- ── ARQUETIPO C: Config / nivel superior — solo superadmin ────────────────────
-- projects, project_members, organizations, workspaces, profiles,
-- manufacturers, products, quotes, rfq_lines
--
-- NOTA sobre FK CASCADE:
--   project_members tiene FK project_id → projects(id) ON DELETE CASCADE.
--   Si se borra un proyecto (superadmin), sus members se borran vía CASCADE.
--   La policy DELETE en project_members es para borrado directo de miembros.

DROP POLICY IF EXISTS projects_delete ON public.projects;
CREATE POLICY projects_delete
  ON public.projects
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS project_members_delete ON public.project_members;
CREATE POLICY project_members_delete
  ON public.project_members
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS organizations_delete ON public.organizations;
CREATE POLICY organizations_delete
  ON public.organizations
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS workspaces_delete ON public.workspaces;
CREATE POLICY workspaces_delete
  ON public.workspaces
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_delete
  ON public.profiles
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS manufacturers_delete ON public.manufacturers;
CREATE POLICY manufacturers_delete
  ON public.manufacturers
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS products_delete ON public.products;
CREATE POLICY products_delete
  ON public.products
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS quotes_delete ON public.quotes;
CREATE POLICY quotes_delete
  ON public.quotes
  FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS rfq_lines_delete ON public.rfq_lines;
CREATE POLICY rfq_lines_delete
  ON public.rfq_lines
  FOR DELETE
  USING (public.is_superadmin());

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================

COMMIT;
