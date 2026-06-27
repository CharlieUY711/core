-- ─────────────────────────────────────────────────────────────────────────────
-- BEP — Bid Engineering Platform
-- Migration: 0001_initial_schema
-- Database: zuasvnngkvdywbcebaqf.supabase.co
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for semantic search

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE org_type AS ENUM (
  'contractor', 'client', 'manufacturer', 'supplier', 'consultant', 'other'
);

CREATE TYPE project_status AS ENUM (
  'draft', 'active', 'on_hold', 'submitted', 'awarded', 'lost', 'closed'
);

CREATE TYPE document_status AS ENUM (
  'pending', 'processing', 'indexed', 'error'
);

CREATE TYPE document_type AS ENUM (
  'pliego', 'plano', 'anexo', 'norma', 'contrato', 'memoria',
  'ficha_tecnica', 'catalogo', 'rfq', 'cotizacion', 'circular',
  'consulta', 'correo', 'otro'
);

CREATE TYPE requirement_status AS ENUM (
  'pending', 'in_review', 'compliant', 'non_compliant',
  'exception_requested', 'waived'
);

CREATE TYPE bom_line_status AS ENUM (
  'draft', 'under_review', 'approved', 'rfq_sent', 'quoted', 'ordered', 'delivered'
);

CREATE TYPE rfq_status AS ENUM (
  'draft', 'sent', 'partial', 'complete', 'closed'
);

CREATE TYPE quote_status AS ENUM (
  'received', 'under_review', 'approved', 'rejected'
);

CREATE TYPE risk_probability AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE risk_impact      AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE risk_status      AS ENUM ('open', 'mitigating', 'closed', 'accepted');

CREATE TYPE project_role AS ENUM (
  'bid_manager', 'engineer', 'procurement', 'cost', 'pmo',
  'client', 'manufacturer', 'supplier', 'consultant', 'guest'
);

CREATE TYPE entity_type AS ENUM (
  'organization', 'workspace', 'project', 'document', 'requirement',
  'bom_line', 'system', 'discipline', 'manufacturer', 'product',
  'rfq', 'quote', 'comparative', 'risk', 'circular', 'query',
  'decision', 'contract', 'lesson_learned'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ORGANIZATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        org_type NOT NULL DEFAULT 'contractor',
  country     TEXT,
  currency    TEXT NOT NULL DEFAULT 'USD',
  logo_url    TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: SONDA
INSERT INTO organizations (id, name, type, country, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'SONDA', 'contractor', 'UY', 'USD');

-- ─────────────────────────────────────────────────────────────────────────────
-- WORKSPACES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: ANTEL workspace inside SONDA
INSERT INTO workspaces (id, org_id, name, description)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'ANTEL',
  'Proyectos con ANTEL — Administración Nacional de Telecomunicaciones'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  status        project_status NOT NULL DEFAULT 'draft',
  currency      TEXT NOT NULL DEFAULT 'USD',
  country       TEXT,
  deadline      DATE,
  budget        NUMERIC(18, 2),
  settings      JSONB NOT NULL DEFAULT '{}',
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, code)
);

-- Seed: P109052 — Sala IV — Data Center José Luis Massera
INSERT INTO projects (id, workspace_id, code, name, description, status, currency, country, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000010',
  'P109052',
  'ANTEL – Sala IV – Data Center José Luis Massera',
  'Licitación Pública P109052. Data Center Sala IV en instalaciones José Luis Massera.',
  'active',
  'USD',
  'UY',
  '00000000-0000-0000-0000-000000000001'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECT MEMBERS & PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE project_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         project_role NOT NULL DEFAULT 'guest',
  permissions  TEXT[] NOT NULL DEFAULT '{"read"}',
  invited_by   UUID REFERENCES auth.users(id),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SYSTEMS (physical / logical systems within a project)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE systems (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES systems(id),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  discipline  TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  system_id         UUID REFERENCES systems(id),
  name              TEXT NOT NULL,
  type              document_type NOT NULL DEFAULT 'otro',
  mime_type         TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL DEFAULT 0,
  version           INT NOT NULL DEFAULT 1,
  status            document_status NOT NULL DEFAULT 'pending',
  discipline        TEXT,
  extracted_text    TEXT,
  ai_summary        TEXT,
  ai_tags           TEXT[] NOT NULL DEFAULT '{}',
  ai_manufacturers  TEXT[] NOT NULL DEFAULT '{}',
  ai_norms          TEXT[] NOT NULL DEFAULT '{}',
  ai_quantities     JSONB NOT NULL DEFAULT '{}',
  embedding         VECTOR(1536),   -- OpenAI text-embedding-3-small dimensions
  uploaded_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- REQUIREMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id       UUID REFERENCES documents(id),
  article_ref       TEXT,
  text              TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'technical',
  discipline        TEXT,
  status            requirement_status NOT NULL DEFAULT 'pending',
  compliance_status requirement_status,
  responsible_id    UUID REFERENCES auth.users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- MANUFACTURERS & PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE manufacturers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id),
  name          TEXT NOT NULL,
  country       TEXT,
  website       TEXT,
  contact_email TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  specs           JSONB NOT NULL DEFAULT '{}',
  certifications  TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BOM (Master Bill of Materials)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE bom_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES bom_lines(id),
  level           INT NOT NULL DEFAULT 1,
  code            TEXT NOT NULL,
  description     TEXT NOT NULL,
  quantity        NUMERIC(18, 4) NOT NULL DEFAULT 1,
  unit            TEXT NOT NULL DEFAULT 'unit',
  system_id       UUID REFERENCES systems(id),
  discipline      TEXT,
  manufacturer_id UUID REFERENCES manufacturers(id),
  product_id      UUID REFERENCES products(id),
  status          bom_line_status NOT NULL DEFAULT 'draft',
  version         INT NOT NULL DEFAULT 1,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RFQ (Request for Quotation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE rfqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  title       TEXT NOT NULL,
  status      rfq_status NOT NULL DEFAULT 'draft',
  sent_at     TIMESTAMPTZ,
  due_at      TIMESTAMPTZ,
  version     INT NOT NULL DEFAULT 1,
  notes       TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, code)
);

CREATE TABLE rfq_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id      UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  bom_line_id UUID NOT NULL REFERENCES bom_lines(id),
  quantity    NUMERIC(18, 4) NOT NULL DEFAULT 1,
  notes       TEXT
);

CREATE TABLE quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id          UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES organizations(id),
  currency        TEXT NOT NULL DEFAULT 'USD',
  total           NUMERIC(18, 2),
  status          quote_status NOT NULL DEFAULT 'received',
  received_at     TIMESTAMPTZ,
  valid_until     DATE,
  lead_time_days  INT,
  notes           TEXT,
  document_id     UUID REFERENCES documents(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLIANCE MATRIX
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE compliance_matrix (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requirement_id  UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  document_id     UUID REFERENCES documents(id),
  bom_line_id     UUID REFERENCES bom_lines(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  evidence        TEXT,
  status          requirement_status NOT NULL DEFAULT 'pending',
  responsible_id  UUID REFERENCES auth.users(id),
  notes           TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RISKS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE risks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  probability risk_probability NOT NULL DEFAULT 'low',
  impact      risk_impact NOT NULL DEFAULT 'low',
  status      risk_status NOT NULL DEFAULT 'open',
  mitigation  TEXT,
  owner_id    UUID REFERENCES auth.users(id),
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CIRCULARS & QUERIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE circulars (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ref                 TEXT NOT NULL,
  title               TEXT NOT NULL,
  content             TEXT,
  source_url          TEXT,
  issued_at           TIMESTAMPTZ,
  affects_bom         BOOLEAN NOT NULL DEFAULT FALSE,
  affects_compliance  BOOLEAN NOT NULL DEFAULT FALSE,
  ai_summary          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_queries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  circular_id   UUID REFERENCES circulars(id),
  question      TEXT NOT NULL,
  answer        TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  submitted_by  UUID NOT NULL REFERENCES auth.users(id),
  answered_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DECISIONS & LESSONS LEARNED (Knowledge Base)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  rationale       TEXT NOT NULL,
  decided_by      UUID NOT NULL REFERENCES auth.users(id),
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_entities JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lessons_learned (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  impact          TEXT,
  recommendation  TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENTITY LINKS (Universal relationship graph)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE entity_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type   entity_type NOT NULL,
  source_id     UUID NOT NULL,
  target_type   entity_type NOT NULL,
  target_id     UUID NOT NULL,
  relation_type TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_type, source_id, target_type, target_id, relation_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENTITY VERSIONS (Universal versioning)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE entity_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  version     INT NOT NULL,
  snapshot    JSONB NOT NULL,
  diff        JSONB,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, version)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Project lookup
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_projects_status    ON projects(status);

-- Document search
CREATE INDEX idx_documents_project  ON documents(project_id);
CREATE INDEX idx_documents_status   ON documents(status);
CREATE INDEX idx_documents_type     ON documents(type);
CREATE INDEX idx_documents_tags     ON documents USING GIN(ai_tags);
-- Full-text search on extracted content
CREATE INDEX idx_documents_fts ON documents USING GIN(
  to_tsvector('spanish', COALESCE(name, '') || ' ' || COALESCE(extracted_text, '') || ' ' || COALESCE(ai_summary, ''))
);
-- Vector similarity search (cosine)
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Requirements
CREATE INDEX idx_requirements_project ON requirements(project_id);
CREATE INDEX idx_requirements_status  ON requirements(status);
CREATE INDEX idx_requirements_fts ON requirements USING GIN(
  to_tsvector('spanish', COALESCE(article_ref, '') || ' ' || text)
);

-- BOM
CREATE INDEX idx_bom_project    ON bom_lines(project_id);
CREATE INDEX idx_bom_parent     ON bom_lines(parent_id);
CREATE INDEX idx_bom_system     ON bom_lines(system_id);
CREATE INDEX idx_bom_status     ON bom_lines(status);
CREATE INDEX idx_bom_fts ON bom_lines USING GIN(
  to_tsvector('spanish', code || ' ' || description)
);

-- RFQ & Quotes
CREATE INDEX idx_rfqs_project ON rfqs(project_id);
CREATE INDEX idx_quotes_rfq   ON quotes(rfq_id);

-- Compliance
CREATE INDEX idx_compliance_project     ON compliance_matrix(project_id);
CREATE INDEX idx_compliance_requirement ON compliance_matrix(requirement_id);
CREATE INDEX idx_compliance_status      ON compliance_matrix(status);

-- Risks
CREATE INDEX idx_risks_project ON risks(project_id);
CREATE INDEX idx_risks_status  ON risks(status);

-- Entity links (bidirectional lookup)
CREATE INDEX idx_entity_links_source ON entity_links(source_type, source_id);
CREATE INDEX idx_entity_links_target ON entity_links(target_type, target_id);

-- Entity versions
CREATE INDEX idx_entity_versions_lookup ON entity_versions(entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_requirements_updated_at
  BEFORE UPDATE ON requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bom_lines_updated_at
  BEFORE UPDATE ON bom_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rfqs_updated_at
  BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_compliance_updated_at
  BEFORE UPDATE ON compliance_matrix FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_risks_updated_at
  BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE systems          ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_lines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_lines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulars        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_queries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_learned  ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_versions  ENABLE ROW LEVEL SECURITY;

-- Helper: check if authenticated user is a member of a project
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user has a specific permission in a project
CREATE OR REPLACE FUNCTION has_project_permission(p_project_id UUID, p_action TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND p_action = ANY(permissions)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Projects: visible only to members
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (is_project_member(id));

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (has_project_permission(id, 'write'));

-- Generic policy for project-scoped tables
-- (documents, requirements, bom_lines, rfqs, risks, etc.)
-- Pattern: SELECT for members, INSERT/UPDATE for write permission

CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (has_project_permission(project_id, 'write'));
CREATE POLICY "documents_update" ON documents
  FOR UPDATE USING (has_project_permission(project_id, 'write'));

CREATE POLICY "requirements_select" ON requirements
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "requirements_insert" ON requirements
  FOR INSERT WITH CHECK (has_project_permission(project_id, 'write'));
CREATE POLICY "requirements_update" ON requirements
  FOR UPDATE USING (has_project_permission(project_id, 'write'));

CREATE POLICY "bom_lines_select" ON bom_lines
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "bom_lines_insert" ON bom_lines
  FOR INSERT WITH CHECK (has_project_permission(project_id, 'write'));
CREATE POLICY "bom_lines_update" ON bom_lines
  FOR UPDATE USING (has_project_permission(project_id, 'write'));

CREATE POLICY "rfqs_select" ON rfqs
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "rfqs_insert" ON rfqs
  FOR INSERT WITH CHECK (has_project_permission(project_id, 'write'));
CREATE POLICY "rfqs_update" ON rfqs
  FOR UPDATE USING (has_project_permission(project_id, 'write'));

CREATE POLICY "compliance_select" ON compliance_matrix
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "compliance_insert" ON compliance_matrix
  FOR INSERT WITH CHECK (has_project_permission(project_id, 'write'));
CREATE POLICY "compliance_update" ON compliance_matrix
  FOR UPDATE USING (has_project_permission(project_id, 'approve'));

CREATE POLICY "risks_select" ON risks
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "risks_insert" ON risks
  FOR INSERT WITH CHECK (has_project_permission(project_id, 'write'));
CREATE POLICY "risks_update" ON risks
  FOR UPDATE USING (has_project_permission(project_id, 'write'));

CREATE POLICY "circulars_select" ON circulars
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "circulars_insert" ON circulars
  FOR INSERT WITH CHECK (has_project_permission(project_id, 'write'));

CREATE POLICY "project_queries_select" ON project_queries
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "project_queries_insert" ON project_queries
  FOR INSERT WITH CHECK (is_project_member(project_id));

CREATE POLICY "decisions_select" ON decisions
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "decisions_insert" ON decisions
  FOR INSERT WITH CHECK (has_project_permission(project_id, 'write'));

CREATE POLICY "entity_links_select" ON entity_links
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "entity_links_insert" ON entity_links
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "systems_select" ON systems
  FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "systems_insert" ON systems
  FOR INSERT WITH CHECK (has_project_permission(project_id, 'write'));

CREATE POLICY "manufacturers_select" ON manufacturers
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "manufacturers_insert" ON manufacturers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "products_select" ON products
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "project_members_select" ON project_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
        AND pm2.role IN ('bid_manager', 'pmo')
    )
  );

CREATE POLICY "entity_versions_select" ON entity_versions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "entity_versions_insert" ON entity_versions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
