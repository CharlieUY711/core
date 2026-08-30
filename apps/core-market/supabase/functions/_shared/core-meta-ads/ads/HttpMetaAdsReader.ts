// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/HttpMetaAdsReader.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/HttpMetaAdsReader.ts
//
// Implementación concreta de `MetaAdsReader` (ver ./ads.ts) contra Meta
// Marketing API, usando `MetaClient` para el transporte. No resuelve
// credenciales ni sabe de dónde vienen: recibe `MetaAdsCredentials` ya
// resueltas, tal como define el contrato de Fase 2. No hace `fetch()`
// directo — toda llamada HTTP pasa por `MetaClient`.

import type { MetaClient } from '../client/MetaClient.ts'
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaAd } from '../types/ads.types.ts'
import type { MetaApiResult, MetaPage } from '../types/api.types.ts'
import type { MetaAdsListParams, MetaAdsReader } from './ads.ts'
import { normalizeEntityStatus } from './internal/normalize.ts'

const AD_FIELDS = 'id,adset_id,name,status'

/** Shape crudo de un ad tal como lo devuelve Marketing API para los campos
 *  solicitados en `AD_FIELDS`. */
interface RawMetaAd {
  id: string
  adset_id?: string
  name?: string
  status?: string
}

function toMetaAd(raw: RawMetaAd, fallbackAdSetId: string): MetaAd {
  return {
    id: raw.id,
    adSetId: raw.adset_id ?? fallbackAdSetId,
    name: raw.name ?? '',
    status: normalizeEntityStatus(raw.status),
  }
}

/**
 * Implementación de `MetaAdsReader` respaldada por un `MetaClient`
 * (típicamente `HttpMetaClient`). `listAds` lee el edge `/ads` del ad set
 * indicado; `getAd` lee un recurso puntual por id.
 */
export class HttpMetaAdsReader implements MetaAdsReader {
  constructor(private readonly client: MetaClient) {}

  async listAds(
    credentials: MetaAdsCredentials,
    adSetId: string,
    params?: MetaAdsListParams
  ): Promise<MetaApiResult<MetaPage<MetaAd>>> {
    const result = await this.client.getPage<RawMetaAd>({
      path: `${adSetId}/ads`,
      params: {
        fields: AD_FIELDS,
        ...(params?.limit !== undefined ? { limit: params.limit } : {}),
        ...(params?.after !== undefined ? { after: params.after } : {}),
      },
      accessToken: credentials.accessToken,
    })

    if (!result.ok || !result.data) {
      return { ok: false, error: result.error }
    }

    const page: MetaPage<MetaAd> = {
      data: result.data.data.map((raw) => toMetaAd(raw, adSetId)),
      nextCursor: result.data.nextCursor,
      previousCursor: result.data.previousCursor,
    }

    return { ok: true, data: page }
  }

  async getAd(credentials: MetaAdsCredentials, adId: string): Promise<MetaApiResult<MetaAd>> {
    const result = await this.client.get<RawMetaAd>({
      path: adId,
      params: { fields: AD_FIELDS },
      accessToken: credentials.accessToken,
    })

    if (!result.ok || !result.data) {
      return { ok: false, error: result.error }
    }

    return { ok: true, data: toMetaAd(result.data, result.data.adset_id ?? '') }
  }
}
