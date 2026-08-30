// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/campaigns.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/campaigns.ts
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaCampaign } from '../types/ads.types.ts'
import type { MetaApiResult, MetaPage } from '../types/api.types.ts'

export interface MetaCampaignsListParams {
  limit?: number
  after?: string
}

export interface MetaCampaignsReader {
  listCampaigns(
    credentials: MetaAdsCredentials,
    params?: MetaCampaignsListParams
  ): Promise<MetaApiResult<MetaPage<MetaCampaign>>>

  getCampaign(
    credentials: MetaAdsCredentials,
    campaignId: string
  ): Promise<MetaApiResult<MetaCampaign>>
}
