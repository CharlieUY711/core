// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/adsets.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/adsets.ts
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaAdSet } from '../types/ads.types.ts'
import type { MetaApiResult, MetaPage } from '../types/api.types.ts'

export interface MetaAdSetsListParams {
  limit?: number
  after?: string
}

export interface MetaAdSetsReader {
  listAdSets(
    credentials: MetaAdsCredentials,
    campaignId: string,
    params?: MetaAdSetsListParams
  ): Promise<MetaApiResult<MetaPage<MetaAdSet>>>

  getAdSet(
    credentials: MetaAdsCredentials,
    adSetId: string
  ): Promise<MetaApiResult<MetaAdSet>>
}
