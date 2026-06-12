// src/app/admin/meta-social/services/facebookService.ts
//
// Servicio para la Graph API de Facebook (v21.0).

import type { FacebookCredentials, MetaApiResult } from '../types/meta.types'
import type {
  FacebookPage,
  FacebookPostsPage,
  FacebookCreatePostParams,
} from '../types/facebook.types'

const FB_BASE = 'https://graph.facebook.com/v21.0'

function fbUrl(path: string, params: Record<string, string>, token: string): string {
  const qs = new URLSearchParams({ ...params, access_token: token.trim() })
  return `${FB_BASE}/${path}?${qs}`
}

async function parseError(res: Response): Promise<{ message: string; code?: number }> {
  try {
    const body = await res.json()
    return { message: body.error?.message ?? `HTTP ${res.status}`, code: body.error?.code }
  } catch {
    return { message: `HTTP ${res.status}` }
  }
}

export const facebookService = {

  async verifyConnection(
    creds: FacebookCredentials
  ): Promise<MetaApiResult<{ id: string; name: string }>> {
    if (!creds.pageAccessToken || !creds.pageId) {
      return { ok: false, error: 'Faltan credenciales de Facebook en el API Vault.' }
    }
    try {
      const url = fbUrl(creds.pageId, { fields: 'id,name' }, creds.pageAccessToken)
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

  async getPage(creds: FacebookCredentials): Promise<MetaApiResult<FacebookPage>> {
    if (!creds.pageAccessToken || !creds.pageId) {
      return { ok: false, error: 'Faltan credenciales de Facebook.' }
    }
    try {
      const fields = 'id,name,category,fan_count,picture{url},link,about,website,verification_status'
      const url    = fbUrl(creds.pageId, { fields }, creds.pageAccessToken)
      const res    = await fetch(url)
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      return { ok: true, data: await res.json() }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },

  async getPosts(
    creds: FacebookCredentials,
    limit = 10
  ): Promise<MetaApiResult<FacebookPostsPage>> {
    if (!creds.pageAccessToken || !creds.pageId) {
      return { ok: false, error: 'Faltan credenciales de Facebook.' }
    }
    try {
      const fields = 'id,message,story,full_picture,created_time,permalink_url,likes.summary(true),comments.summary(true)'
      const url    = fbUrl(
        `${creds.pageId}/posts`,
        { fields, limit: String(limit) },
        creds.pageAccessToken
      )
      const res = await fetch(url)
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      return { ok: true, data: await res.json() }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },

  // Publicar en la página (Etapa 2)
  async createPost(
    creds:  FacebookCredentials,
    params: FacebookCreatePostParams
  ): Promise<MetaApiResult<{ id: string }>> {
    if (!creds.pageAccessToken || !creds.pageId) {
      return { ok: false, error: 'Faltan credenciales de Facebook.' }
    }
    try {
      const body = new URLSearchParams({ message: params.message, access_token: creds.pageAccessToken.trim() })
      if (params.link)    body.set('link', params.link)
      if (params.picture) body.set('picture', params.picture)
      if (params.scheduledAt) {
        body.set('published', 'false')
        body.set('scheduled_publish_time', String(params.scheduledAt))
      }
      const res = await fetch(`${FB_BASE}/${creds.pageId}/feed`, { method: 'POST', body })
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
