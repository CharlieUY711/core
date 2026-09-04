// src/ads/campaigns.ts
import type { MetaAdsCredentials } from '../types/credentials.types'
import type { MetaCampaign } from '../types/ads.types'
import type { MetaApiResult, MetaPage } from '../types/api.types'

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
