// src/ads/ads.ts
import type { MetaAdsCredentials } from '../types/credentials.types'
import type { MetaAd } from '../types/ads.types'
import type { MetaApiResult, MetaPage } from '../types/api.types'

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
