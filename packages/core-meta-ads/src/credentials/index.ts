// src/credentials/index.ts
export type { MetaCredentialProvider } from './MetaCredentialProvider'
export type { MetaAccountRef, MetaAdsCredentials } from '../types/credentials.types'
export { validateMetaAdsCredentials } from './validateMetaAdsCredentials'
export { resolveMetaCredentials } from './resolveMetaCredentials'
export {
  ApiVaultMetaCredentialAdapter,
  META_ADS_VAULT_PLATFORM,
} from './ApiVaultMetaCredentialAdapter'
export type {
  ApiVaultMetaCredentialAdapterOptions,
  MetaVaultValue,
} from './ApiVaultMetaCredentialAdapter'
// Espejo del contrato real de API Vault (DEC-011). Ver apiVaultContract.ts.
export type {
  VaultResolve,
  VaultResolveInput,
  ResolvedVaultCredential,
  VaultCredentialStatus,
  VaultReport,
  VaultReportInput,
} from './apiVaultContract'
