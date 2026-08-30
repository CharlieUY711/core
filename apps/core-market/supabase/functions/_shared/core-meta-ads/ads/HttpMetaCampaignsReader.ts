// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/HttpMetaCampaignsReader.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/HttpMetaCampaignsReader.ts
//
// Implementación concreta de `MetaCampaignsReader` (ver ./campaigns.ts)
// contra Meta Marketing API, usando `MetaClient` para el transporte. No
// resuelve credenciales ni sabe de dónde vienen: recibe `MetaAdsCredentials`
// ya resueltas, tal como define el contrato de Fase 2. No hace `fetch()`
// directo — toda llamada HTTP pasa por `MetaClient`.

import type { MetaClient } from '../client/MetaClient.ts'
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaCampaign } from '../types/ads.types.ts'
import type { MetaApiResult, MetaPage } from '../types/api.types.ts'
import type { MetaCampaignsListParams, MetaCampaignsReader } from './campaigns.ts'
import { normalizeEntityStatus, toNullableNumber } from './internal/normalize.ts'

const CAMPAIGN_FIELDS =
  'id,account_id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time'

/** Shape crudo de una campaign tal como la devuelve Marketing API para los
 *  campos solicitados en `CAMPAIGN_FIELDS`. */
interface RawMetaCampaign {
  id: string
  account_id?: string
  name?: string
  status?: string
  objective?: string
  daily_budget?: string
  lifetime_budget?: string
  created_time?: string
  updated_time?: string
}

function toMetaCampaign(raw: RawMetaCampaign, fallbackAccountId: string): MetaCampaign {
  return {
    id: raw.id,
    accountId: raw.account_id ?? fallbackAccountId,
    name: raw.name ?? '',
    status: normalizeEntityStatus(raw.status),
    objective: raw.objective ?? '',
    dailyBudget: toNullableNumber(raw.daily_budget),
    lifetimeBudget: toNullableNumber(raw.lifetime_budget),
    createdAt: raw.created_time ?? '',
    updatedAt: raw.updated_time ?? '',
  }
}

/**
 * Implementación de `MetaCampaignsReader` respaldada por un `MetaClient`
 * (típicamente `HttpMetaClient`). `listCampaigns` lee desde la cuenta de
 * `credentials.adAccountId`; `getCampaign` lee un recurso puntual por id.
 */
export class HttpMetaCampaignsReader implements MetaCampaignsReader {
  constructor(private readonly client: MetaClient) {}

  async listCampaigns(
    credentials: MetaAdsCredentials,
    params?: MetaCampaignsListParams
  ): Promise<MetaApiResult<MetaPage<MetaCampaign>>> {
    const result = await this.client.getPage<RawMetaCampaign>({
      path: `${credentials.adAccountId}/campaigns`,
      params: {
        fields: CAMPAIGN_FIELDS,
        ...(params?.limit !== undefined ? { limit: params.limit } : {}),
        ...(params?.after !== undefined ? { after: params.after } : {}),
      },
      accessToken: credentials.accessToken,
    })

    if (!result.ok || !result.data) {
      return { ok: false, error: result.error }
    }

    const page: MetaPage<MetaCampaign> = {
      data: result.data.data.map((raw) => toMetaCampaign(raw, credentials.adAccountId)),
      nextCursor: result.data.nextCursor,
      previousCursor: result.data.previousCursor,
    }

    return { ok: true, data: page }
  }

  async getCampaign(
    credentials: MetaAdsCredentials,
    campaignId: string
  ): Promise<MetaApiResult<MetaCampaign>> {
    const result = await this.client.get<RawMetaCampaign>({
      path: campaignId,
      params: { fields: CAMPAIGN_FIELDS },
      accessToken: credentials.accessToken,
    })

    if (!result.ok || !result.data) {
      return { ok: false, error: result.error }
    }

    return { ok: true, data: toMetaCampaign(result.data, credentials.adAccountId) }
  }
}
