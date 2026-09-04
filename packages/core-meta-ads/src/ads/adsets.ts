// src/ads/adsets.ts
import type { MetaAdsCredentials } from '../types/credentials.types'
import type { MetaAdSet } from '../types/ads.types'
import type { MetaApiResult, MetaPage } from '../types/api.types'

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
