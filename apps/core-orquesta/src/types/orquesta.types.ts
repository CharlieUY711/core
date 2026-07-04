// ─── Motor enchufable ──────────────────────────────────────────────────────────
export type MotorStatus = 'active' | 'inactive' | 'error'
export type DetailLevel = 'Básico' | 'Estándar' | 'Profundo'

export interface Motor {
  id: string
  user_id: string
  name: string
  description: string | null
  icon: string
  status: MotorStatus
  version: string
  interval_min: number
  sources: string[]
  detail_level: DetailLevel
  fallback: string | null
  companies: string[]          // IDs de empresas monitoreadas
  last_run_at: string | null
  logs: MotorLog[]
  created_at: string
  updated_at: string
}

export interface MotorLog {
  ts: string
  level: 'info' | 'warn' | 'error'
  msg: string
}

// ─── Empresa monitoreada ───────────────────────────────────────────────────────
export type ActivityLevel = 'high' | 'medium' | 'low'

export interface Company {
  id: string
  user_id: string
  name: string
  industry: string | null
  location: string | null
  size: string | null
  activity: ActivityLevel
  summary: string | null
  verticals: Vertical[]
  created_at: string
}

export interface Vertical {
  name: string
  score: number   // 0–100
}

// ─── Señal ────────────────────────────────────────────────────────────────────
export type Priority  = 'alta' | 'media' | 'baja'
export type SignalStatus = 'nueva' | 'procesada' | 'ignorada'

export interface Signal {
  id: string
  company_id: string | null
  motor_id: string | null
  user_id: string
  title: string
  description: string | null
  source: string | null
  priority: Priority
  status: SignalStatus
  created_at: string
}

// ─── Evento ───────────────────────────────────────────────────────────────────
export type EventType =
  | 'expansion'
  | 'financiero'
  | 'talento'
  | 'producto'
  | 'alianza'
  | 'riesgo'

export interface OEvent {
  id: string
  company_id: string | null
  motor_id: string | null
  user_id: string
  type: EventType
  description: string
  date: string | null
  created_at: string
}

// ─── Documento generado ───────────────────────────────────────────────────────
export type DocType = 'perfil' | 'reporte' | 'brief' | 'alerta'

export interface ODocument {
  id: string
  company_id: string | null
  user_id: string
  title: string
  type: DocType
  content: string | null
  pages: number
  generated_at: string
}

// ─── UI state ─────────────────────────────────────────────────────────────────
export type RightPanelTab = 'profile' | 'signals' | 'events' | 'documents' | 'relations'
