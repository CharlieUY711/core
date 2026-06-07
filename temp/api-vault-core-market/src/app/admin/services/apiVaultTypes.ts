// src/app/admin/services/apiVaultTypes.ts

export type VaultEnv = 'production' | 'staging' | 'development' | 'testing'
export type VaultType = 'api_key' | 'token' | 'oauth' | 'secret' | 'webhook' | 'connection'

export interface ApiVaultEntry {
  id: string
  user_id: string
  name: string
  platform: string
  type: VaultType
  value: string
  env: VaultEnv
  tags: string[]
  notes: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type ApiVaultInsert = Omit<ApiVaultEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type ApiVaultUpdate = Partial<ApiVaultInsert>

export interface ApiVaultResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export const VAULT_TYPE_LABELS: Record<VaultType, string> = {
  api_key: 'API Key',
  token: 'Token',
  oauth: 'OAuth Token',
  secret: 'Secret',
  webhook: 'Webhook URL',
  connection: 'Connection String',
}

export const VAULT_ENV_LABELS: Record<VaultEnv, string> = {
  production: 'Production',
  staging: 'Staging',
  development: 'Development',
  testing: 'Testing',
}

export const VAULT_PLATFORMS = [
  'OpenAI', 'Anthropic', 'Google Cloud', 'AWS', 'Azure',
  'GitHub', 'Stripe', 'Twilio', 'SendGrid', 'HubSpot',
  'Salesforce', 'Slack', 'Discord', 'Firebase', 'Supabase',
  'Vercel', 'Netlify', 'DataDog', 'MercadoPago', 'PayPal',
  'Mapbox', 'Google Maps', 'Otro',
] as const

export const PLATFORM_ICONS: Record<string, string> = {
  'OpenAI': '🤖', 'Anthropic': '🧠', 'Google Cloud': '☁️', 'AWS': '🟠',
  'Azure': '🔷', 'GitHub': '🐙', 'Stripe': '💳', 'Twilio': '📱',
  'SendGrid': '✉️', 'HubSpot': '🟠', 'Salesforce': '☁️', 'Slack': '💬',
  'Discord': '🎮', 'Firebase': '🔥', 'Supabase': '⚡', 'Vercel': '▲',
  'Netlify': '🌐', 'DataDog': '🐕', 'MercadoPago': '💙', 'PayPal': '🔵',
  'Mapbox': '🗺️', 'Google Maps': '📍', 'Otro': '🔑',
}
