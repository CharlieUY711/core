// src/ads/accounts.ts
import type { MetaAdsCredentials } from '../types/credentials.types'
import type { MetaAdAccount } from '../types/ads.types'
import type { MetaApiResult } from '../types/api.types'

export interface MetaAdAccountsReader {
  getAdAccount(credentials: MetaAdsCredentials): Promise<MetaApiResult<MetaAdAccount>>
}
