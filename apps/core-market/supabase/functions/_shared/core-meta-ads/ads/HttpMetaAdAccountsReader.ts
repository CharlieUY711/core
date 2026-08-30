// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/HttpMetaAdAccountsReader.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/HttpMetaAdAccountsReader.ts
//
// Implementación concreta de `MetaAdAccountsReader` (ver ./accounts.ts)
// contra Meta Marketing API, usando `MetaClient` para el transporte. No
// resuelve credenciales ni sabe de dónde vienen: recibe `MetaAdsCredentials`
// ya resueltas, tal como define el contrato de Fase 2. No hace `fetch()`
// directo — toda llamada HTTP pasa por `MetaClient`.

import type { MetaClient } from '../client/MetaClient.ts'
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaAdAccount } from '../types/ads.types.ts'
import type { MetaApiResult } from '../types/api.types.ts'
import type { MetaAdAccountsReader } from './accounts.ts'
import { normalizeAccountStatus } from './internal/normalize.ts'

const AD_ACCOUNT_FIELDS = 'id,name,currency,account_status'

/** Shape crudo de un ad account tal como lo devuelve Marketing API para
 *  los campos solicitados en `AD_ACCOUNT_FIELDS`. */
interface RawMetaAdAccount {
  id: string
  name?: string
  currency?: string
  account_status?: number
}

function toMetaAdAccount(raw: RawMetaAdAccount): MetaAdAccount {
  return {
    id: raw.id,
    name: raw.name ?? '',
    currency: raw.currency ?? '',
    status: normalizeAccountStatus(raw.account_status),
  }
}

/**
 * Implementación de `MetaAdAccountsReader` respaldada por un `MetaClient`
 * (típicamente `HttpMetaClient`). Solo lee la cuenta indicada por
 * `credentials.adAccountId` — no lista cuentas ni administra credenciales.
 */
export class HttpMetaAdAccountsReader implements MetaAdAccountsReader {
  constructor(private readonly client: MetaClient) {}

  async getAdAccount(credentials: MetaAdsCredentials): Promise<MetaApiResult<MetaAdAccount>> {
    const result = await this.client.get<RawMetaAdAccount>({
      path: credentials.adAccountId,
      params: { fields: AD_ACCOUNT_FIELDS },
      accessToken: credentials.accessToken,
    })

    if (!result.ok || !result.data) {
      return { ok: false, error: result.error }
    }

    return { ok: true, data: toMetaAdAccount(result.data) }
  }
}
