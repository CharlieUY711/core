// src/types/orquesta.types.ts
//
// Tipos de dominio (usados por la UI) + tipos de fila de Supabase
// (usados por los hooks / el cliente tipado).
//
// Los tipos de dominio son compatibles con los de src/data.ts para no romper
// los componentes existentes (MotorCard, LeftPanel, tabs, etc).

// ─── Enums compartidos ──────────────────────────────────────────────────────

export type MotorStatus = "active" | "inactive" | "error";
export type SignalPriority = "alta" | "media" | "baja";
export type SignalStatus = "nueva" | "procesada" | "ignorada";
export type EventType =
  | "expansion"
  | "financiero"
  | "talento"
  | "producto"
  | "alianza"
  | "riesgo";
export type CompanyActivity = "high" | "medium" | "low";
export type DocumentType = "perfil" | "reporte" | "brief" | "alerta";

// ─── Tipos de dominio (UI) ──────────────────────────────────────────────────

export interface Motor {
  id: string;
  name: string;
  description: string;
  version: string;
  status: MotorStatus;
  icon: string;
  lastRun: string;
  logs: Array<{ time: string; text: string }>;
  companies: string[];
  interval: number;
  sources: string[];
  detailLevel: string;
  fallback: string;
  credentials: Array<{ name: string; loaded: boolean }>;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  activity: CompanyActivity;
  summary: string;
  verticals: Array<{ label: string; value: string; icon: string; color: string }>;
}

export interface Signal {
  id: string;
  title: string;
  description: string;
  source: string;
  motor: string;
  motorIcon: string;
  priority: SignalPriority;
  status: SignalStatus;
  companyId: string;
  time: string;
}

export interface OrchestratorEvent {
  id: string;
  date: string;
  motorId: string;
  motorName: string;
  motorIcon: string;
  type: EventType;
  description: string;
  companyId: string;
}

export interface OrchestratorDocument {
  id: string;
  companyId: string;
  title: string;
  type: DocumentType;
  content: string;
  pages: number;
  generatedAt: string;
}

// ─── Filas de Supabase (snake_case, tal cual la tabla) ─────────────────────

export interface MotorRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  status: MotorStatus;
  version: string;
  interval_min: number;
  sources: string[];
  detail_level: string;
  fallback: string | null;
  companies: string[];
  last_run_at: string | null;
  logs: Array<{ time: string; text: string }>;
  created_at: string;
  updated_at: string;
}

export interface CompanyRow {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  location: string | null;
  size: string | null;
  activity: CompanyActivity;
  summary: string | null;
  verticals: Array<{ label: string; value: string; icon: string; color: string }>;
  created_at: string;
}

export interface SignalRow {
  id: string;
  company_id: string;
  motor_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  source: string | null;
  priority: SignalPriority;
  status: SignalStatus;
  created_at: string;
}

export interface EventRow {
  id: string;
  company_id: string;
  motor_id: string | null;
  user_id: string;
  type: EventType;
  description: string;
  date: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  type: DocumentType;
  content: string | null;
  pages: number;
  generated_at: string;
}

// ─── Tipo Database para @supabase/supabase-js<Database> ───────────────────

export interface Database {
  public: {
    Tables: {
      orquesta_motors: {
        Row: MotorRow;
        Insert: Partial<MotorRow> & { user_id: string; name: string };
        Update: Partial<MotorRow>;
      };
      orquesta_companies: {
        Row: CompanyRow;
        Insert: Partial<CompanyRow> & { user_id: string; name: string };
        Update: Partial<CompanyRow>;
      };
      orquesta_signals: {
        Row: SignalRow;
        Insert: Partial<SignalRow> & { user_id: string; title: string };
        Update: Partial<SignalRow>;
      };
      orquesta_events: {
        Row: EventRow;
        Insert: Partial<EventRow> & {
          user_id: string;
          type: EventType;
          description: string;
        };
        Update: Partial<EventRow>;
      };
      orquesta_documents: {
        Row: DocumentRow;
        Insert: Partial<DocumentRow> & { user_id: string; title: string };
        Update: Partial<DocumentRow>;
      };
    };
  };
}

// ─── Mappers Row -> Dominio ─────────────────────────────────────────────────

export function motorRowToDomain(row: MotorRow): Motor {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    version: row.version,
    status: row.status,
    icon: row.icon,
    lastRun: row.last_run_at ?? "nunca",
    logs: row.logs ?? [],
    companies: row.companies ?? [],
    interval: row.interval_min,
    sources: row.sources ?? [],
    detailLevel: row.detail_level,
    fallback: row.fallback ?? "",
    credentials: [], // las credenciales viven en api_vault, no en la tabla de motores
  };
}

export function companyRowToDomain(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry ?? "",
    location: row.location ?? "",
    size: row.size ?? "",
    activity: row.activity,
    summary: row.summary ?? "",
    verticals: row.verticals ?? [],
  };
}

export function signalRowToDomain(row: SignalRow, motorName = "", motorIcon = ""): Signal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    source: row.source ?? "",
    motor: motorName,
    motorIcon,
    priority: row.priority,
    status: row.status,
    companyId: row.company_id,
    time: row.created_at,
  };
}

export function eventRowToDomain(
  row: EventRow,
  motorName = "",
  motorIcon = ""
): OrchestratorEvent {
  return {
    id: row.id,
    date: row.date ?? row.created_at,
    motorId: row.motor_id ?? "",
    motorName,
    motorIcon,
    type: row.type,
    description: row.description,
    companyId: row.company_id,
  };
}

export function documentRowToDomain(row: DocumentRow): OrchestratorDocument {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    type: row.type,
    content: row.content ?? "",
    pages: row.pages,
    generatedAt: row.generated_at,
  };
}
