// src/app/admin/meta-social/services/whatsappService.ts
//
// Servicio para la WhatsApp Cloud API (Meta).

import type { WhatsAppCredentials, MetaApiResult } from '../types/meta.types'
import type {
  WhatsAppPhoneNumber,
  WhatsAppMessageTemplate,
  WhatsAppSendTemplateParams,
} from '../types/whatsapp.types'

const WA_BASE = 'https://graph.facebook.com/v21.0'

async function parseError(res: Response): Promise<{ message: string; code?: number }> {
  try {
    const body = await res.json()
    return { message: body.error?.message ?? `HTTP ${res.status}`, code: body.error?.code }
  } catch {
    return { message: `HTTP ${res.status}` }
  }
}

export const whatsappService = {

  async verifyConnection(
    creds: WhatsAppCredentials
  ): Promise<MetaApiResult<{ id: string; display_phone_number: string }>> {
    if (!creds.accessToken || !creds.phoneNumberId) {
      return { ok: false, error: 'Faltan credenciales de WhatsApp en el API Vault.' }
    }
    try {
      const qs  = new URLSearchParams({ fields: 'id,display_phone_number', access_token: creds.accessToken.trim() })
      const res = await fetch(`${WA_BASE}/${creds.phoneNumberId}?${qs}`)
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      return { ok: true, data: await res.json() }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },

  async getPhoneNumber(
    creds: WhatsAppCredentials
  ): Promise<MetaApiResult<WhatsAppPhoneNumber>> {
    if (!creds.accessToken || !creds.phoneNumberId) {
      return { ok: false, error: 'Faltan credenciales de WhatsApp.' }
    }
    try {
      const fields = 'id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,throughput'
      const qs     = new URLSearchParams({ fields, access_token: creds.accessToken.trim() })
      const res    = await fetch(`${WA_BASE}/${creds.phoneNumberId}?${qs}`)
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      return { ok: true, data: await res.json() }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },

  async getTemplates(
    creds: WhatsAppCredentials
  ): Promise<MetaApiResult<{ data: WhatsAppMessageTemplate[] }>> {
    if (!creds.accessToken || !creds.wabaId) {
      return { ok: false, error: 'Falta WABA ID en el API Vault.' }
    }
    try {
      const qs  = new URLSearchParams({
        fields: 'id,name,status,category,language,components',
        access_token: creds.accessToken.trim(),
        limit: '20',
      })
      const res = await fetch(`${WA_BASE}/${creds.wabaId}/message_templates?${qs}`)
      if (!res.ok) {
        const err = await parseError(res)
        return { ok: false, error: err.message, code: err.code }
      }
      return { ok: true, data: await res.json() }
    } catch (e: any) {
      return { ok: false, error: e.message ?? 'Error de red' }
    }
  },

  // Enviar template (Etapa 2)
  async sendTemplate(
    creds:  WhatsAppCredentials,
    params: WhatsAppSendTemplateParams
  ): Promise<MetaApiResult<{ messages: { id: string }[] }>> {
    if (!creds.accessToken || !creds.phoneNumberId) {
      return { ok: false, error: 'Faltan credenciales de WhatsApp.' }
    }
    try {
      const body = {
        messaging_product: 'whatsapp',
        to:                params.to,
        type:              'template',
        template: {
          name:     params.templateName,
          language: { code: params.languageCode },
          ...(params.components ? { components: params.components } : {}),
        },
      }
      const res = await fetch(`${WA_BASE}/${creds.phoneNumberId}/messages`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${creds.accessToken.trim()}`,
        },
        body: JSON.stringify(body),
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
