// src/ads/insights.ts
import type { MetaAdsCredentials } from '../types/credentials.types'
import type { MetaInsight, MetaInsightEntityType } from '../types/ads.types'
import type { MetaApiResult } from '../types/api.types'

export interface MetaInsightsRef {
  entityId: string
  entityType: MetaInsightEntityType
}

export interface MetaInsightsDateRange {
  /** ISO-8601, solo fecha (YYYY-MM-DD). */
  since: string
  until: string
}

export interface MetaInsightsReader {
  getInsights(
    credentials: MetaAdsCredentials,
    ref: MetaInsightsRef,
    range: MetaInsightsDateRange
  ): Promise<MetaApiResult<MetaInsight[]>>
}
