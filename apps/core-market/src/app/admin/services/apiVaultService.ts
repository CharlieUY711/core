// src/app/admin/services/apiVaultService.ts
// Servicio de acceso a Supabase para el módulo API Vault.
// Usa el cliente de Supabase del proyecto (ajustar la ruta si es distinta).

import { supabase } from '../../../utils/supabase/client'
import type {
  ApiVaultEntry,
  ApiVaultInsert,
  ApiVaultUpdate,
  ApiVaultResult,
} from './apiVaultTypes'

// Se usa el cliente compartido de la app. Antes este modulo creaba el suyo
// propio con las mismas credenciales: dos instancias de GoTrue sobre el mismo
// almacenamiento se pisan al refrescar la sesion, y no hay ninguna razon para
// tener dos.

const TABLE = 'api_vault'

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Los errores de Supabase son objetos planos -{ message, details, hint, code }-,
 * no instancias de Error. `String(error)` sobre eso da "[object Object]", que
 * fue literalmente lo que aparecio en pantalla al intentar guardar una
 * credencial. Aca se arma un mensaje con lo que el objeto si trae.
 */
function handleError<T = never>(error: unknown): ApiVaultResult<T> {
  let msg: string

  if (error instanceof Error) {
    msg = error.message
  } else if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    const partes = [e.message, e.details, e.hint]
      .filter((x) => typeof x === 'string' && x.trim())
      .map(String)
    // El codigo va entre parentesis: no explica nada por si solo pero es lo
    // que permite buscar el caso concreto.
    msg = partes.join(' — ') || JSON.stringify(error)
    if (e.code) msg += ` (${e.code})`
  } else {
    msg = String(error)
  }

  console.error('[ApiVault]', msg, error)
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
  // La politica de insert exige auth.uid() = user_id y el formulario no lo
  // mandaba, asi que toda alta era rechazada por RLS. Se toma de la sesion, no
  // del formulario: que el cliente pueda elegir de quien es una credencial
  // seria justamente lo que la politica trata de impedir.
  const { data: sesion } = await supabase.auth.getUser()
  const userId = sesion?.user?.id
  if (!userId) {
    return { ok: false, error: 'No hay sesión activa. Volvé a iniciar sesión para guardar credenciales.' }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...entry, user_id: userId })
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
