// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/insights.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/insights.ts
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaInsight, MetaInsightEntityType } from '../types/ads.types.ts'
import type { MetaApiResult } from '../types/api.types.ts'

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
