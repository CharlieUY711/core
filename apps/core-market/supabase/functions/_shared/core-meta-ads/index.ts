// supabase/functions/_shared/core-meta-ads/index.ts
//
// Superficie server-side de core-meta-ads disponible hoy en Edge
// Functions: credenciales (F8B) + READ contra Marketing API (F8C).
//
// NO se vendoriza `ads/operations.ts` (contrato WRITE) ni `auth/` (OAuth):
// no hay una sola linea de WRITE ni de OAuth en este directorio.
//
// Fuente de verdad del codigo vendorizado: packages/core-meta-ads/src.

// -- Credenciales (F8B) -----------------------------------------------------
export { createMetaAdsCredentialProvider, META_ADS_VAULT_PLATFORM } from "./metaAdsCredentialProvider.ts";
export type { CreateMetaAdsCredentialProviderOptions } from "./metaAdsCredentialProvider.ts";

export { resolveMetaCredentials } from "./credentials/resolveMetaCredentials.ts";
export { validateMetaAdsCredentials } from "./credentials/validateMetaAdsCredentials.ts";
export { ApiVaultMetaCredentialAdapter } from "./credentials/ApiVaultMetaCredentialAdapter.ts";
export type { MetaCredentialProvider } from "./credentials/MetaCredentialProvider.ts";
export type { MetaAccountRef, MetaAdsCredentials } from "./types/credentials.types.ts";
// Espejo del contrato real de API Vault (DEC-011): RESOLVE + REPORT/HEALTH
// (F8E). Ver credentials/apiVaultContract.ts.
export type { VaultCredentialStatus } from "./credentials/apiVaultContract.ts";

// -- READ (F8C) -------------------------------------------------------------
export {
  createMetaAdsReaders,
  createMetaClient,
  metaApiVersion,
  DEFAULT_META_API_VERSION,
} from "./metaAdsReaders.ts";
export type { MetaAdsReaders } from "./metaAdsReaders.ts";

export type { MetaAdAccountsReader } from "./ads/accounts.ts";
export type { MetaCampaignsReader, MetaCampaignsListParams } from "./ads/campaigns.ts";
export type { MetaAdSetsReader, MetaAdSetsListParams } from "./ads/adsets.ts";
export type { MetaAdsReader, MetaAdsListParams } from "./ads/ads.ts";
export type {
  MetaInsightsReader,
  MetaInsightsRef,
  MetaInsightsDateRange,
} from "./ads/insights.ts";

export type {
  MetaAdAccount,
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaInsight,
  MetaInsightEntityType,
  MetaEntityStatus,
} from "./types/ads.types.ts";
export type { MetaApiError, MetaApiResult, MetaPage } from "./types/api.types.ts";

// -- Errores ----------------------------------------------------------------
export { MetaModuleError } from "./errors/MetaModuleError.ts";
export type { MetaModuleErrorCategory } from "./errors/MetaModuleError.ts";
