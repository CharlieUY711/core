// src/app/admin/meta-social/types/meta.types.ts
// Tipos base compartidos por los tres servicios Meta.

export type MetaPlatform = 'Instagram' | 'Facebook' | 'WhatsApp'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface MetaConnectionState {
  status:     ConnectionStatus
  error:      string | null
  lastCheck:  string | null   // ISO timestamp
}

// ── Credenciales genéricas que se leen del API Vault ─────────────────────────

export interface MetaCredentials {
  appId:          string | null
  appSecret:      string | null
  longLivedToken: string | null
}

export interface InstagramCredentials {
  accessToken:       string | null
  businessAccountId: string | null
  igUserId:          string | null
}

export interface FacebookCredentials {
  pageAccessToken: string | null
  pageId:          string | null
  catalogId:       string | null
}

export interface WhatsAppCredentials {
  accessToken:   string | null
  phoneNumberId: string | null
  wabaId:        string | null
}

// ── Resultado genérico de llamadas a Graph API ────────────────────────────────

export interface MetaApiResult<T = void> {
  ok:     boolean
  data?:  T
  error?: string
  code?:  number
}
