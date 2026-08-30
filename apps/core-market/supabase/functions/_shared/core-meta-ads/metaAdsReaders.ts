// supabase/functions/_shared/core-meta-ads/metaAdsReaders.ts
//
// WIRING SERVER-SIDE (F8C): core-meta-ads -> Meta Marketing API REAL.
//
// Complemento de ./metaAdsCredentialProvider.ts (F8B, el binding con el
// Vault). Aca no hay logica de negocio nueva: solo se instancian el
// `HttpMetaClient` existente y los cinco Readers READ ya implementados en
// packages/core-meta-ads/src/ads/. Cero WRITE: `MetaCampaignOperations` y
// `ads/operations.ts` no estan vendorizados en este directorio.
//
// ---------------------------------------------------------------------
// SOLO SERVER-SIDE. Los Readers reciben `MetaAdsCredentials` completas
// (incluye `accessToken` y `appSecret`). Ese objeto NUNCA debe salir de
// una Edge Function: no va en una respuesta HTTP, ni en un log, ni en un
// mensaje de error. Este modulo no loguea nada, deliberadamente.
//
// Nota: `HttpMetaClient` manda el `access_token` en la query string (es el
// comportamiento estandar de Graph API). Esa URL se construye y se
// consume dentro del cliente; no se loguea ni se incluye en ningun error.
// ---------------------------------------------------------------------

import { HttpMetaClient } from "./client/HttpMetaClient.ts";
import type { MetaClient, MetaClientConfig } from "./client/MetaClient.ts";
import { HttpMetaAdAccountsReader } from "./ads/HttpMetaAdAccountsReader.ts";
import { HttpMetaCampaignsReader } from "./ads/HttpMetaCampaignsReader.ts";
import { HttpMetaAdSetsReader } from "./ads/HttpMetaAdSetsReader.ts";
import { HttpMetaAdsReader } from "./ads/HttpMetaAdsReader.ts";
import { HttpMetaInsightsReader } from "./ads/HttpMetaInsightsReader.ts";
import type { MetaAdAccountsReader } from "./ads/accounts.ts";
import type { MetaCampaignsReader } from "./ads/campaigns.ts";
import type { MetaAdSetsReader } from "./ads/adsets.ts";
import type { MetaAdsReader } from "./ads/ads.ts";
import type { MetaInsightsReader } from "./ads/insights.ts";

/**
 * Version de Graph API / Marketing API. Overrideable por env siguiendo el
 * mismo patron que `EXTRACT_MODEL` en extract-catalog. `MetaClientConfig`
 * la exige y no trae default propio, asi que el default vive aca — que es
 * donde vive la configuracion de despliegue, no dentro del modulo.
 */
export const DEFAULT_META_API_VERSION = "v21.0";

export function metaApiVersion(): string {
  return Deno.env.get("META_API_VERSION") ?? DEFAULT_META_API_VERSION;
}

/** Los cinco Readers READ que expone core-meta-ads, ya instanciados. */
export interface MetaAdsReaders {
  accounts: MetaAdAccountsReader;
  campaigns: MetaCampaignsReader;
  adSets: MetaAdSetsReader;
  ads: MetaAdsReader;
  insights: MetaInsightsReader;
}

export function createMetaClient(config?: Partial<MetaClientConfig>): MetaClient {
  return new HttpMetaClient({
    apiVersion: config?.apiVersion ?? metaApiVersion(),
    ...(config?.baseUrl !== undefined ? { baseUrl: config.baseUrl } : {}),
  });
}

/**
 * Construye los Readers READ sobre un `MetaClient`. Si no se pasa ninguno,
 * se crea un `HttpMetaClient` contra la Marketing API real.
 */
export function createMetaAdsReaders(client: MetaClient = createMetaClient()): MetaAdsReaders {
  return {
    accounts: new HttpMetaAdAccountsReader(client),
    campaigns: new HttpMetaCampaignsReader(client),
    adSets: new HttpMetaAdSetsReader(client),
    ads: new HttpMetaAdsReader(client),
    insights: new HttpMetaInsightsReader(client),
  };
}
