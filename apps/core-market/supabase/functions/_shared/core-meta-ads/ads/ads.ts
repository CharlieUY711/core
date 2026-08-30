// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/ads.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/ads.ts
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaAd } from '../types/ads.types.ts'
import type { MetaApiResult, MetaPage } from '../types/api.types.ts'

export interface MetaAdsListParams {
  limit?: number
  after?: string
}

export interface MetaAdsReader {
  listAds(
    credentials: MetaAdsCredentials,
    adSetId: string,
    params?: MetaAdsListParams
  ): Promise<MetaApiResult<MetaPage<MetaAd>>>

  getAd(
    credentials: MetaAdsCredentials,
    adId: string
  ): Promise<MetaApiResult<MetaAd>>
}
