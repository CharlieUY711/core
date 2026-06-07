// @charlieuy711/api-vault — hook (multi-tenant)

import { create } from 'zustand'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchVaultEntries,
  createVaultEntry,
  updateVaultEntry,
  deleteVaultEntry,
  fetchMyTenants,
  createTenant,
  isExpired,
  isExpiringSoon,
} from '../services/apiVaultService'
import type { ApiVaultEntry, ApiVaultInsert, ApiVaultUpdate } from '../services/apiVaultTypes'
import type { Tenant } from '../services/apiVaultService'

interface VaultState {
  entries:       ApiVaultEntry[]
  tenants:       Tenant[]
  activeTenant:  Tenant | null
  loading:       boolean
  error:         string | null

  // Acciones vault
  load:   (supabase: SupabaseClient, options?: { tenantId?: string; appId?: string }) => Promise<void>
  add:    (supabase: SupabaseClient, entry: ApiVaultInsert) => Promise<boolean>
  edit:   (supabase: SupabaseClient, id: string, updates: ApiVaultUpdate) => Promise<boolean>
  remove: (supabase: SupabaseClient, id: string) => Promise<boolean>

  // Acciones tenant
  loadTenants:    (supabase: SupabaseClient) => Promise<void>
  setTenant:      (tenant: Tenant | null) => void
  addTenant:      (supabase: SupabaseClient, name: string, slug: string) => Promise<boolean>

  // Selectores
  getByPlatform: (platform: string) => ApiVaultEntry[]
  getExpiring:   (days?: number) => ApiVaultEntry[]
  getExpired:    () => ApiVaultEntry[]
  stats: () => { total: number; platforms: number; active: number; expiring: number }
}

export const useApiVault = create<VaultState>((set, get) => ({
  entries:      [],
  tenants:      [],
  activeTenant: null,
  loading:      false,
  error:        null,

  load: async (supabase, options) => {
    set({ loading: true, error: null })
    const result = await fetchVaultEntries(supabase, options)
    if (result.ok) set({ entries: result.data ?? [], loading: false })
    else           set({ error: result.error ?? 'Error al cargar', loading: false })
  },

  add: async (supabase, entry) => {
    const result = await createVaultEntry(supabase, entry)
    if (result.ok && result.data) {
      set((s) => ({ entries: [result.data!, ...s.entries] }))
      return true
    }
    set({ error: result.error }); return false
  },

  edit: async (supabase, id, updates) => {
    const result = await updateVaultEntry(supabase, id, updates)
    if (result.ok && result.data) {
      set((s) => ({ entries: s.entries.map((e) => (e.id === id ? result.data! : e)) }))
      return true
    }
    set({ error: result.error }); return false
  },

  remove: async (supabase, id) => {
    const result = await deleteVaultEntry(supabase, id)
    if (result.ok) {
      set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
      return true
    }
    set({ error: result.error }); return false
  },

  loadTenants: async (supabase) => {
    const result = await fetchMyTenants(supabase)
    if (result.ok) {
      const tenants = result.data ?? []
      set({ tenants, activeTenant: tenants[0] ?? null })
    }
  },

  setTenant: (tenant) => set({ activeTenant: tenant }),

  addTenant: async (supabase, name, slug) => {
    const result = await createTenant(supabase, name, slug)
    if (result.ok && result.data) {
      set((s) => ({ tenants: [...s.tenants, result.data!], activeTenant: result.data! }))
      return true
    }
    set({ error: result.error }); return false
  },

  getByPlatform: (platform) => get().entries.filter((e) => e.platform === platform),
  getExpiring:   (days = 30) => get().entries.filter((e) => isExpiringSoon(e.expires_at, days)),
  getExpired:    ()          => get().entries.filter((e) => isExpired(e.expires_at)),

  stats: () => {
    const entries = get().entries
    const now  = Date.now()
    const soon = now + 30 * 86_400_000
    return {
      total:     entries.length,
      platforms: new Set(entries.map((e) => e.platform)).size,
      active:    entries.filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now).length,
      expiring:  entries.filter((e) => {
        if (!e.expires_at) return false
        const t = new Date(e.expires_at).getTime()
        return t > now && t <= soon
      }).length,
    }
  },
}))
