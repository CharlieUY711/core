// Thin wrapper — expone el vault ya inicializado con el supabase client de orquesta.
// Los componentes que necesiten keys importan de acá, no construyen su propio cliente.
export { useApiVault, fetchVaultEntries } from '@core/core-apivault'
export { supabase } from './supabase'
