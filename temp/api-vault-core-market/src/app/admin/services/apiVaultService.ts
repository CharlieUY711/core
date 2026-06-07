// src/app/admin/services/apiVaultService.ts
// Servicio de acceso a Supabase para el módulo API Vault.
// Usa el cliente de Supabase del proyecto (ajustar la ruta si es distinta).

import { createClient } from '@supabase/supabase-js'
import type {
  ApiVaultEntry,
  ApiVaultInsert,
  ApiVaultUpdate,
  ApiVaultResult,
} from './apiVaultTypes'

// ─── Cliente Supabase ──────────────────────────────────────────────────────────
// Reutiliza las variables de entorno ya existentes en core-market
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)

const TABLE = 'api_vault'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function handleError(error: unknown): ApiVaultResult {
  const msg = error instanceof Error ? error.message : String(error)
  console.error('[ApiVault]', msg)
  return { ok: false, error: msg }
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function fetchVaultEntries(): Promise<ApiVaultResult<ApiVaultEntry[]>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return handleError(error)
  return { ok: true, data: data as ApiVaultEntry[] }
}

export async function createVaultEntry(
  entry: ApiVaultInsert
): Promise<ApiVaultResult<ApiVaultEntry>> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(entry)
    .select()
    .single()

  if (error) return handleError(error)
  return { ok: true, data: data as ApiVaultEntry }
}

export async function updateVaultEntry(
  id: string,
  updates: ApiVaultUpdate
): Promise<ApiVaultResult<ApiVaultEntry>> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return handleError(error)
  return { ok: true, data: data as ApiVaultEntry }
}

export async function deleteVaultEntry(id: string): Promise<ApiVaultResult> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) return handleError(error)
  return { ok: true }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Devuelve true si el token vence en los próximos `days` días */
export function isExpiringSoon(expiresAt: string | null, days = 30): boolean {
  if (!expiresAt) return false
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff < days * 86_400_000
}

/** Devuelve true si el token ya venció */
export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}
