// ─────────────────────────────────────────────────────────────────────────────
// BEP — Bid Engineering Platform
// Auto-generated types for the Supabase schema.
// Keep in sync with supabase/migrations/*.sql
// ─────────────────────────────────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// ── Enums ────────────────────────────────────────────────────────────────────

export type OrgType =
  | "contractor"
  | "client"
  | "manufacturer"
  | "supplier"
  | "consultant"
  | "other";

export type ProjectStatus =
  | "draft"
  | "active"
  | "on_hold"
  | "submitted"
  | "awarded"
  | "lost"
  | "closed";

export type DocumentStatus =
  | "pending"
  | "processing"
  | "indexed"
  | "error";

export type DocumentType =
  | "pliego"
  | "plano"
  | "anexo"
  | "norma"
  | "contrato"
  | "memoria"
  | "ficha_tecnica"
  | "catalogo"
  | "rfq"
  | "cotizacion"
  | "circular"
  | "consulta"
  | "correo"
  | "otro";

export type RequirementStatus =
  | "pending"
  | "in_review"
  | "compliant"
  | "non_compliant"
  | "exception_requested"
  | "waived";

export type BomLineStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "rfq_sent"
  | "quoted"
  | "ordered"
  | "delivered";

export type RfqStatus =
  | "draft"
  | "sent"
  | "partial"
  | "complete"
  | "closed";

export type QuoteStatus =
  | "received"
  | "under_review"
  | "approved"
  | "rejected";

export type RiskProbability = "low" | "medium" | "high" | "critical";
export type RiskImpact = "low" | "medium" | "high" | "critical";
export type RiskStatus = "open" | "mitigating" | "closed" | "accepted";

export type ProjectRole =
  | "bid_manager"
  | "engineer"
  | "procurement"
  | "cost"
  | "pmo"
  | "client"
  | "manufacturer"
  | "supplier"
  | "consultant"
  | "guest";

export type PermissionAction = "read" | "write" | "approve" | "comment" | "download" | "share";

export type EntityType =
  | "organization"
  | "workspace"
  | "project"
  | "document"
  | "requirement"
  | "bom_line"
  | "system"
  | "discipline"
  | "manufacturer"
  | "product"
  | "rfq"
  | "quote"
  | "comparative"
  | "risk"
  | "circular"
  | "query"
  | "decision"
  | "contract"
  | "lesson_learned";

// ── Row types ────────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  country: string | null;
  currency: string;
  logo_url: string | null;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  currency: string;
  country: string | null;
  deadline: string | null;
  budget: number | null;
  settings: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  permissions: PermissionAction[];
  invited_by: string | null;
  joined_at: string;
}

export interface BepDocument {
  id: string;
  project_id: string;
  system_id: string | null;
  name: string;
  type: DocumentType;
  mime_type: string;
  storage_path: string;
  size_bytes: number;
  version: number;
  status: DocumentStatus;
  discipline: string | null;
  extracted_text: string | null;
  ai_summary: string | null;
  ai_tags: string[];
  ai_manufacturers: string[];
  ai_norms: string[];
  ai_quantities: Json;
  embedding: string | null; // pgvector stored as string in JS
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface Requirement {
  id: string;
  project_id: string;
  document_id: string | null;
  article_ref: string | null;
  text: string;
  type: string;
  discipline: string | null;
  status: RequirementStatus;
  compliance_status: RequirementStatus | null;
  responsible_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BomLine {
  id: string;
  project_id: string;
  parent_id: string | null;
  level: number;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  system_id: string | null;
  discipline: string | null;
  manufacturer_id: string | null;
  product_id: string | null;
  status: BomLineStatus;
  version: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Manufacturer {
  id: string;
  org_id: string | null;
  name: string;
  country: string | null;
  website: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  manufacturer_id: string;
  code: string;
  name: string;
  description: string | null;
  specs: Json;
  certifications: string[];
  created_at: string;
  updated_at: string;
}

export interface Rfq {
  id: string;
  project_id: string;
  code: string;
  title: string;
  status: RfqStatus;
  sent_at: string | null;
  due_at: string | null;
  version: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RfqLine {
  id: string;
  rfq_id: string;
  bom_line_id: string;
  quantity: number;
  notes: string | null;
}

export interface Quote {
  id: string;
  rfq_id: string;
  supplier_id: string;
  currency: string;
  total: number | null;
  status: QuoteStatus;
  received_at: string | null;
  valid_until: string | null;
  lead_time_days: number | null;
  notes: string | null;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceMatrix {
  id: string;
  project_id: string;
  requirement_id: string;
  document_id: string | null;
  bom_line_id: string | null;
  manufacturer_id: string | null;
  evidence: string | null;
  status: RequirementStatus;
  responsible_id: string | null;
  notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  probability: RiskProbability;
  impact: RiskImpact;
  status: RiskStatus;
  mitigation: string | null;
  owner_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Circular {
  id: string;
  project_id: string;
  ref: string;
  title: string;
  content: string | null;
  source_url: string | null;
  issued_at: string | null;
  affects_bom: boolean;
  affects_compliance: boolean;
  ai_summary: string | null;
  created_at: string;
}

export interface ProjectQuery {
  id: string;
  project_id: string;
  circular_id: string | null;
  question: string;
  answer: string | null;
  status: "open" | "answered" | "closed";
  submitted_by: string;
  answered_at: string | null;
  created_at: string;
}

export interface Decision {
  id: string;
  project_id: string;
  title: string;
  rationale: string;
  decided_by: string;
  decided_at: string;
  linked_entities: Json;
  created_at: string;
}

export interface LessonLearned {
  id: string;
  project_id: string;
  category: string;
  description: string;
  impact: string | null;
  recommendation: string | null;
  created_by: string;
  created_at: string;
}

export interface EntityLink {
  id: string;
  source_type: EntityType;
  source_id: string;
  target_type: EntityType;
  target_id: string;
  relation_type: string;
  metadata: Json;
  created_by: string;
  created_at: string;
}

export interface EntityVersion {
  id: string;
  entity_type: string;
  entity_id: string;
  version: number;
  snapshot: Json;
  diff: Json | null;
  created_by: string;
  created_at: string;
}

// ── Database interface ────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Organization, "id" | "created_at" | "updated_at">>;
      };
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Workspace, "id" | "created_at" | "updated_at">>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Project, "id" | "created_at" | "updated_at">>;
      };
      project_members: {
        Row: ProjectMember;
        Insert: Omit<ProjectMember, "id" | "joined_at">;
        Update: Partial<Omit<ProjectMember, "id">>;
      };
      documents: {
        Row: BepDocument;
        Insert: Omit<BepDocument, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BepDocument, "id" | "created_at" | "updated_at">>;
      };
      requirements: {
        Row: Requirement;
        Insert: Omit<Requirement, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Requirement, "id" | "created_at" | "updated_at">>;
      };
      bom_lines: {
        Row: BomLine;
        Insert: Omit<BomLine, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BomLine, "id" | "created_at" | "updated_at">>;
      };
      manufacturers: {
        Row: Manufacturer;
        Insert: Omit<Manufacturer, "id" | "created_at">;
        Update: Partial<Omit<Manufacturer, "id" | "created_at">>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id" | "created_at" | "updated_at">>;
      };
      rfqs: {
        Row: Rfq;
        Insert: Omit<Rfq, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Rfq, "id" | "created_at" | "updated_at">>;
      };
      rfq_lines: {
        Row: RfqLine;
        Insert: Omit<RfqLine, "id">;
        Update: Partial<Omit<RfqLine, "id">>;
      };
      quotes: {
        Row: Quote;
        Insert: Omit<Quote, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Quote, "id" | "created_at" | "updated_at">>;
      };
      compliance_matrix: {
        Row: ComplianceMatrix;
        Insert: Omit<ComplianceMatrix, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ComplianceMatrix, "id" | "created_at" | "updated_at">>;
      };
      risks: {
        Row: Risk;
        Insert: Omit<Risk, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Risk, "id" | "created_at" | "updated_at">>;
      };
      circulars: {
        Row: Circular;
        Insert: Omit<Circular, "id" | "created_at">;
        Update: Partial<Omit<Circular, "id" | "created_at">>;
      };
      project_queries: {
        Row: ProjectQuery;
        Insert: Omit<ProjectQuery, "id" | "created_at">;
        Update: Partial<Omit<ProjectQuery, "id" | "created_at">>;
      };
      decisions: {
        Row: Decision;
        Insert: Omit<Decision, "id" | "created_at">;
        Update: Partial<Omit<Decision, "id" | "created_at">>;
      };
      lessons_learned: {
        Row: LessonLearned;
        Insert: Omit<LessonLearned, "id" | "created_at">;
        Update: Partial<Omit<LessonLearned, "id" | "created_at">>;
      };
      entity_links: {
        Row: EntityLink;
        Insert: Omit<EntityLink, "id" | "created_at">;
        Update: Partial<Omit<EntityLink, "id" | "created_at">>;
      };
      entity_versions: {
        Row: EntityVersion;
        Insert: Omit<EntityVersion, "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      org_type: OrgType;
      project_status: ProjectStatus;
      document_status: DocumentStatus;
      document_type: DocumentType;
      requirement_status: RequirementStatus;
      bom_line_status: BomLineStatus;
      rfq_status: RfqStatus;
      quote_status: QuoteStatus;
      risk_probability: RiskProbability;
      risk_impact: RiskImpact;
      risk_status: RiskStatus;
      project_role: ProjectRole;
      entity_type: EntityType;
    };
  };
}
