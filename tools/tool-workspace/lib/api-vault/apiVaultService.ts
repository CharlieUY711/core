// @charlieuy711/api-vault — service (multi-tenant)

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
  supabase: SupabaseClient,
  options?: { tenantId?: string; appId?: string }
): Promise<ApiVaultResult<ApiVaultEntry[]>> {
  let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false })
  if (options?.tenantId) query = query.eq('tenant_id', options.tenantId)
  if (options?.appId)   query = query.contains('tags', [options.appId])
  const { data, error } = await query
  if (error) return handleError(error)
  return { ok: true, data: data as ApiVaultEntry[] }
}

export async function createVaultEntry(
  supabase: SupabaseClient,
  entry: ApiVaultInsert
): Promise<ApiVaultResult<ApiVaultEntry>> {
  const { data, error } = await supabase.from(TABLE).insert(entry).select().single()
  if (error) return handleError(error)
  return { ok: true, data: data as ApiVaultEntry }
}

export async function updateVaultEntry(
  supabase: SupabaseClient,
  id: string,
  updates: ApiVaultUpdate
): Promise<ApiVaultResult<ApiVaultEntry>> {
  const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single()
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

// ── Tenant helpers ─────────────────────────────────────────────────────────────

export interface Tenant {
  id:   string
  name: string
  slug: string
  role: string
}

export async function fetchMyTenants(
  supabase: SupabaseClient
): Promise<ApiVaultResult<Tenant[]>> {
  const { data, error } = await supabase
    .from('tenant_members')
    .select('role, tenants(id, name, slug)')
    .order('created_at')
  if (error) return handleError(error)
  const tenants = (data ?? []).map((row: any) => ({
    ...row.tenants,
    role: row.role,
  }))
  return { ok: true, data: tenants as Tenant[] }
}

export async function createTenant(
  supabase: SupabaseClient,
  name: string,
  slug: string
): Promise<ApiVaultResult<Tenant>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert({ name, slug })
    .select()
    .single()
  if (tErr) return handleError(tErr)

  const { error: mErr } = await supabase
    .from('tenant_members')
    .insert({ tenant_id: tenant.id, user_id: user.id, role: 'owner' })
  if (mErr) return handleError(mErr)

  return { ok: true, data: { ...tenant, role: 'owner' } as Tenant }
}

// ── Utils ──────────────────────────────────────────────────────────────────────

export function isExpiringSoon(expiresAt: string | null, days = 30): boolean {
  if (!expiresAt) return false
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff < days * 86_400_000
}

export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}
