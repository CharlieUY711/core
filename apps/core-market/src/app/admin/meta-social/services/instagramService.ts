// src/app/admin/meta-social/services/instagramService.ts
//
// Servicio para la Graph API de Instagram (v21.0).
// Recibe credenciales como parámetro — nunca las almacena.

import type { InstagramCredentials } from '../types/meta.types'
import type {
  InstagramProfile,
  InstagramMediaPage,
  InstagramCreatePostParams,
} from '../types/instagram.types'
import type { MetaApiResult } from '../types/meta.types'

/* `graph.instagram.com` ya no se usa: ver el comentario de abajo. */
const FB_BASE = 'https://graph.facebook.com/v21.0'

/*
 * INSTAGRAM BUSINESS SE CONSULTA POR EL GRAPH DE FACEBOOK.
 *
 * `graph.instagram.com` es la Basic Display API: otra API, otro tipo de token,
 * y no acepta un `businessAccountId`. Una cuenta Business cuelga de una página
 * de Facebook y se consulta por `graph.facebook.com` con el token de esa
 * página.
 *
 * Todas las llamadas de acá usaban `igUrl`. Que `fbUrl` estuviera escrito al
 * lado y sin usar sugiere que quien lo escribió lo sabía y no llegó a
 * cambiarlo.
 *
 * Se cambia ahora y no antes porque ahora hay con qué: `meta-oauth` guarda como
 * `INSTAGRAM_ACCESS_TOKEN` el token de la PÁGINA, así que el host correcto
 * quedó determinado por la credencial que escribimos nosotros.
 */

// ── Helper: construye URL con token ──────────────────────────────────────────

function fbUrl(
  path:   string,
  params: Record<string, string>,
  token:  string
): string {
  const qs = new URLSearchParams({ ...params, access_token: token.trim() })
  return `${FB_BASE}/${path}?${qs}`
}

// ── Helper: parseo de errores Graph API ──────────────────────────────────────

async function parseError(res: Response): Promise<{ message: string; code?: number }> {
  try {
    const body = await res.json()
    return {
      message: body.error?.message ?? `HTTP ${res.status}`,
      code:    body.error?.code,
    }
  } catch {
    return { message: `HTTP ${res.status}` }
  }
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const instagramService = {

  // Verifica que el token y el Business Account ID sean válidos
  async verifyConnection(
    creds: InstagramCredentials
  ): Promise<MetaApiResult<{ id: string; username: string }>> {
    if (!creds.accessToken || !creds.businessAccountId) {
      return { ok: false, error: 'Faltan credenciales de Instagram en el API Vault.' }
    }
    try {
      const url = fbUrl(
        creds.businessAccountId,
        { fields: 'id,username' },
        creds.accessToken
      )
      const res = await fetch(url)
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      const data = await res.json()
      return { ok: true, data }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },

  // Perfil completo con métricas básicas
  async getProfile(
    creds: InstagramCredentials
  ): Promise<MetaApiResult<InstagramProfile>> {
    if (!creds.accessToken || !creds.businessAccountId) {
      return { ok: false, error: 'Faltan credenciales de Instagram.' }
    }
    try {
      const fields = [
        'id', 'username', 'name', 'biography', 'website',
        'followers_count', 'follows_count', 'media_count',
        'profile_picture_url', 'account_type',
      ].join(',')
      const url = fbUrl(creds.businessAccountId, { fields }, creds.accessToken)
      const res  = await fetch(url)
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      return { ok: true, data: await res.json() }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },

  // Galería de publicaciones con paginación
  async getMedia(
    creds:  InstagramCredentials,
    limit = 12,
    after?: string
  ): Promise<MetaApiResult<InstagramMediaPage>> {
    const userId = creds.igUserId ?? creds.businessAccountId
    if (!creds.accessToken || !userId) {
      return { ok: false, error: 'Faltan credenciales de Instagram.' }
    }
    try {
      const fields = [
        'id', 'media_type', 'media_url', 'thumbnail_url',
        'permalink', 'timestamp', 'caption',
        'like_count', 'comments_count',
      ].join(',')
      const params: Record<string, string> = { fields, limit: String(limit) }
      if (after) params.after = after
      const url = fbUrl(`${userId}/media`, params, creds.accessToken)
      const res  = await fetch(url)
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      return { ok: true, data: await res.json() }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },

  // Crear container de imagen (Etapa 2)
  async createMediaContainer(
    creds:  InstagramCredentials,
    params: InstagramCreatePostParams
  ): Promise<MetaApiResult<{ id: string }>> {
    const userId = creds.igUserId ?? creds.businessAccountId
    if (!creds.accessToken || !userId) {
      return { ok: false, error: 'Faltan credenciales de Instagram.' }
    }
    try {
      const body = new URLSearchParams({
        image_url:    params.imageUrl,
        caption:      params.caption ?? '',
        access_token: creds.accessToken.trim(),
      })
      const res = await fetch(`${FB_BASE}/${userId}/media`, {
        method: 'POST',
        body,
      })
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      return { ok: true, data: await res.json() }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },

  // Publicar container creado (Etapa 2)
  async publishMediaContainer(
    creds:       InstagramCredentials,
    containerId: string
  ): Promise<MetaApiResult<{ id: string }>> {
    const userId = creds.igUserId ?? creds.businessAccountId
    if (!creds.accessToken || !userId) {
      return { ok: false, error: 'Faltan credenciales de Instagram.' }
    }
    try {
      const body = new URLSearchParams({
        creation_id:  containerId,
        access_token: creds.accessToken.trim(),
      })
      const res = await fetch(`${FB_BASE}/${userId}/media_publish`, {
        method: 'POST',
        body,
      })
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      return { ok: true, data: await res.json() }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },
}
