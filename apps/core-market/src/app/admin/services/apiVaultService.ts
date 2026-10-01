// src/app/admin/services/apiVaultService.ts
// Servicio de acceso a Supabase para el módulo API Vault.
// Usa el cliente de Supabase del proyecto (ajustar la ruta si es distinta).

import { supabase } from '../../../utils/supabase/client'
import { requerida } from '../ui/credencialesRequeridas'
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
  // `getSession` devuelve { session }, no { user }: leer `sesion.user` daba
  // siempre undefined y toda alta volvia a fallar por RLS, ahora en silencio.
  const { data: sesion } = await supabase.auth.getSession()
  const userId = sesion?.session?.user?.id
  if (!userId) {
    return { ok: false, error: 'No hay sesión activa. Volvé a iniciar sesión para guardar credenciales.' }
  }

  /*
   * Las que son de servidor NACEN marcadas.
   *
   * Pasó al revés: `META_APP_ID` y `META_APP_SECRET` cargadas con los nombres
   * exactos y sin la marca, así que la función que las lee —que filtra por
   * `solo_servidor`— no las encontró nunca. Nombre correcto, valor correcto, y
   * aun así invisibles para quien las necesita.
   *
   * Y era además un problema de seguridad: sin la marca, la clave secreta de la
   * app la puede leer su dueño desde el panel, o sea que llega al navegador.
   *
   * No se le pregunta a quien carga: está declarado en
   * `ui/credencialesRequeridas.ts`, que es donde se dice qué credencial es cuál.
   */
  const declarada = requerida(entry.platform, entry.name)

  /*
   * LAS DE SERVIDOR NO PASAN POR insert().select().
   *
   * `.select()` agrega RETURNING, y para devolver la fila Postgres exige que
   * la política de LECTURA la deje ver. Las de servidor están excluidas de la
   * lectura a propósito, así que el alta entera se rechazaba con 42501 aunque
   * el INSERT en sí estuviera permitido. Por eso la guía de Meta decía
   * "Se guardaron 0 de 2".
   *
   * Se guardan por una función del servidor que crea o reemplaza y NO devuelve
   * el valor. La política de lectura queda como está.
   */
  if (declarada?.soloServidor) {
    const r = await guardarCredencialDeServidor(entry.platform, entry.name, entry.type, entry.value)
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...entry,
      user_id: userId,
      ...(declarada?.soloServidor ? { solo_servidor: true } : {}),
    })
    .select()
    .single()

  if (error) return handleError(error)
  return { ok: true, data: data as ApiVaultEntry }
}

// ─── Credenciales de servidor ─────────────────────────────────────────────────
// El navegador no puede leerlas, así que tampoco las edita ni las borra con las
// políticas de la tabla. Se hace por dos funciones del servidor que sólo
// escriben o borran: ninguna devuelve el valor.

/** Avisa a la pantalla del Vault que tiene que volver a pedir la lista de servidor. */
export const EVENTO_SERVIDOR = 'vault:servidor-cambio'

function avisarCambioDeServidor() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_SERVIDOR))
}

function errorDeServidor(error: unknown): string {
  const e = error as { code?: string; message?: string } | null
  // PGRST202: la función no existe. Es lo que pasa si falta correr el SQL.
  if (e?.code === 'PGRST202') {
    return 'Falta crear las funciones del Vault en Supabase (archivo 20261001_vault_servidor.sql).'
  }
  return handleError(error).error ?? 'Error desconocido'
}

export async function guardarCredencialDeServidor(
  platform: string, name: string, type: string, value: string
): Promise<ApiVaultResult> {
  const { data: sesion } = await supabase.auth.getSession()
  if (!sesion?.session?.user?.id) {
    return { ok: false, error: 'No hay sesión activa. Volvé a iniciar sesión para guardar credenciales.' }
  }
  const { error } = await supabase.rpc('guardar_credencial_servidor', {
    p_plataforma: platform, p_nombre: name, p_tipo: type, p_valor: value,
  })
  if (error) return { ok: false, error: errorDeServidor(error) }
  avisarCambioDeServidor()
  return { ok: true }
}

/** Devuelve cuántas filas borró: 0 quiere decir que no era de este usuario. */
export async function borrarCredencialDeServidor(
  platform: string, name: string
): Promise<ApiVaultResult<number>> {
  const { data, error } = await supabase.rpc('borrar_credencial_servidor', {
    p_plataforma: platform, p_nombre: name,
  })
  if (error) return { ok: false, error: errorDeServidor(error) }
  avisarCambioDeServidor()
  return { ok: true, data: Number(data ?? 0) }
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
