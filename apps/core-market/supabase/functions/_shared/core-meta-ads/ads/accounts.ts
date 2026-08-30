// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/accounts.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/accounts.ts
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaAdAccount } from '../types/ads.types.ts'
import type { MetaApiResult } from '../types/api.types.ts'

export interface MetaAdAccountsReader {
  getAdAccount(credentials: MetaAdsCredentials): Promise<MetaApiResult<MetaAdAccount>>
}
