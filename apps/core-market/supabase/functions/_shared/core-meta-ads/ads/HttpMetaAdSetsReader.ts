// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/HttpMetaAdSetsReader.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/HttpMetaAdSetsReader.ts
//
// Implementación concreta de `MetaAdSetsReader` (ver ./adsets.ts) contra
// Meta Marketing API, usando `MetaClient` para el transporte. No resuelve
// credenciales ni sabe de dónde vienen: recibe `MetaAdsCredentials` ya
// resueltas, tal como define el contrato de Fase 2. No hace `fetch()`
// directo — toda llamada HTTP pasa por `MetaClient`.

import type { MetaClient } from '../client/MetaClient.ts'
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaAdSet } from '../types/ads.types.ts'
import type { MetaApiResult, MetaPage } from '../types/api.types.ts'
import type { MetaAdSetsListParams, MetaAdSetsReader } from './adsets.ts'
import { normalizeEntityStatus, toNullableNumber } from './internal/normalize.ts'

const ADSET_FIELDS = 'id,campaign_id,name,status,daily_budget,lifetime_budget'

/** Shape crudo de un ad set tal como lo devuelve Marketing API para los
 *  campos solicitados en `ADSET_FIELDS`. */
interface RawMetaAdSet {
  id: string
  campaign_id?: string
  name?: string
  status?: string
  daily_budget?: string
  lifetime_budget?: string
}

function toMetaAdSet(raw: RawMetaAdSet, fallbackCampaignId: string): MetaAdSet {
  return {
    id: raw.id,
    campaignId: raw.campaign_id ?? fallbackCampaignId,
    name: raw.name ?? '',
    status: normalizeEntityStatus(raw.status),
    dailyBudget: toNullableNumber(raw.daily_budget),
    lifetimeBudget: toNullableNumber(raw.lifetime_budget),
  }
}

/**
 * Implementación de `MetaAdSetsReader` respaldada por un `MetaClient`
 * (típicamente `HttpMetaClient`). `listAdSets` lee el edge `/adsets` de la
 * campaign indicada; `getAdSet` lee un recurso puntual por id.
 */
export class HttpMetaAdSetsReader implements MetaAdSetsReader {
  constructor(private readonly client: MetaClient) {}

  async listAdSets(
    credentials: MetaAdsCredentials,
    campaignId: string,
    params?: MetaAdSetsListParams
  ): Promise<MetaApiResult<MetaPage<MetaAdSet>>> {
    const result = await this.client.getPage<RawMetaAdSet>({
      path: `${campaignId}/adsets`,
      params: {
        fields: ADSET_FIELDS,
        ...(params?.limit !== undefined ? { limit: params.limit } : {}),
        ...(params?.after !== undefined ? { after: params.after } : {}),
      },
      accessToken: credentials.accessToken,
    })

    if (!result.ok || !result.data) {
      return { ok: false, error: result.error }
    }

    const page: MetaPage<MetaAdSet> = {
      data: result.data.data.map((raw) => toMetaAdSet(raw, campaignId)),
      nextCursor: result.data.nextCursor,
      previousCursor: result.data.previousCursor,
    }

    return { ok: true, data: page }
  }

  async getAdSet(
    credentials: MetaAdsCredentials,
    adSetId: string
  ): Promise<MetaApiResult<MetaAdSet>> {
    const result = await this.client.get<RawMetaAdSet>({
      path: adSetId,
      params: { fields: ADSET_FIELDS },
      accessToken: credentials.accessToken,
    })

    if (!result.ok || !result.data) {
      return { ok: false, error: result.error }
    }

    return { ok: true, data: toMetaAdSet(result.data, result.data.campaign_id ?? '') }
  }
}
