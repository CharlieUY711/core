// @charlieuy711/api-vault — service
// Recibe el cliente Supabase como parametro para ser agnóstico a Next.js, Vite, etc.

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ApiVaultEntry,
  ApiVaultInsert,
  ApiVaultUpdate,
  ApiVaultResult,
} from './apiVaultTypes'

const TABLE = 'api_vault'

function handleError(error: unknown): ApiVaultResult<never> {
  const msg = error instanceof Error ? error.message : String(error)
  console.error('[ApiVault]', msg)
  return { ok: false, error: msg }
}

export async function fetchVaultEntries(
  supabase: SupabaseClient
): Promise<ApiVaultResult<ApiVaultEntry[]>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return handleError(error)
  return { ok: true, data: data as ApiVaultEntry[] }
}

export async function createVaultEntry(
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
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

export async function deleteVaultEntry(
  supabase: SupabaseClient,
  id: string
): Promise<ApiVaultResult> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) return handleError(error)
  return { ok: true }
}

export function isExpiringSoon(expiresAt: string | null, days = 30): boolean {
  if (!expiresAt) return false
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff < days * 86_400_000
}

export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}
