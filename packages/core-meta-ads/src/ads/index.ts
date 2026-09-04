// src/ads/index.ts
export type { MetaAdAccountsReader } from './accounts'
export type { MetaCampaignsReader, MetaCampaignsListParams } from './campaigns'
export type { MetaAdSetsReader, MetaAdSetsListParams } from './adsets'
export type { MetaAdsReader, MetaAdsListParams } from './ads'
export type { MetaInsightsReader, MetaInsightsRef, MetaInsightsDateRange } from './insights'
export type {
  MetaCampaignOperations,
  MetaBudgetUpdate,
  MetaOperationResult,
} from './operations'

// Implementaciones READ (Fase 5) de los contratos de arriba, respaldadas
// por `MetaClient`. Reciben `MetaAdsCredentials` ya resueltas — la
// resolución vía `MetaCredentialProvider` es responsabilidad del caller
// (ver ../credentials/resolveMetaCredentials.ts).
export { HttpMetaAdAccountsReader } from './HttpMetaAdAccountsReader'
export { HttpMetaCampaignsReader } from './HttpMetaCampaignsReader'
export { HttpMetaAdSetsReader } from './HttpMetaAdSetsReader'
export { HttpMetaAdsReader } from './HttpMetaAdsReader'
export { HttpMetaInsightsReader } from './HttpMetaInsightsReader'
