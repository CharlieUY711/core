// supabase/functions/_shared/core-meta-ads/metaAdsCredentialProvider.ts
//
// WIRING SERVER-SIDE (F8B): CredentialProvider REAL -> core-meta-ads.
//
// Este es el UNICO archivo que liga las dos piezas. A un lado importa el
// RESOLVE real de DEC-011 (../api-vault/CredentialProvider.ts); al otro,
// el adaptador de core-meta-ads. No agrega almacenamiento, no crea un
// Vault propio, no define un MetaVaultService, no implementa OAuth y no
// duplica nada de core-apivault: solo hace el binding.
//
// El compilador verifica el contrato: `resolveCredential` es la funcion
// real, y se asigna a `VaultResolve` (el espejo del contrato dentro de
// core-meta-ads). Si el contrato real cambiara, esto deja de compilar.
//
// ---------------------------------------------------------------------
// SOLO SERVER-SIDE. Este modulo vive en supabase/functions/_shared/, se
// ejecuta unicamente dentro de Edge Functions y necesita un cliente
// Supabase con service_role (las RLS de api_vault son auth.uid() =
// user_id, que no aplican a service_role). NUNCA debe importarse desde
// src/ del frontend ni exponerse a un cliente browser/anon.
//
// Las credenciales que devuelve (`appId`, `appSecret`, `accessToken`) son
// secretos: quien las consuma debe usarlas para hablar con Meta y jamas
// incluirlas en una respuesta HTTP, en un log, en un mensaje de error ni
// en una URL. Este modulo no loguea nada, deliberadamente.
// ---------------------------------------------------------------------

import {
  reportCredentialOutcome,
  resolveCredential,
  type SupabaseLike,
} from "../api-vault/CredentialProvider.ts";
import { ApiVaultMetaCredentialAdapter } from "./credentials/ApiVaultMetaCredentialAdapter.ts";
import type { VaultReport, VaultResolve } from "./credentials/apiVaultContract.ts";
import type { MetaCredentialProvider } from "./credentials/MetaCredentialProvider.ts";

export { META_ADS_VAULT_PLATFORM } from "./credentials/ApiVaultMetaCredentialAdapter.ts";

export interface CreateMetaAdsCredentialProviderOptions {
  /** Override de `api_vault.platform`. Default: `meta_ads`. */
  platform?: string;
  /** Override de `api_vault.type`. Default: `oauth`. */
  type?: string;
  /** Filtro `api_vault.env`. Sin default: el RESOLVE real no filtra por
   *  entorno salvo que se lo pidan. */
  env?: string;
}

/**
 * Construye el `MetaCredentialProvider` de core-meta-ads respaldado por el
 * RESOLVE real de API Vault.
 *
 * A partir de F8E también liga REPORT (`reportCredentialOutcome` real): el
 * `MetaCredentialProvider` devuelto puede reportar HEALTH ademas de
 * resolver credenciales. Mismo binding, misma idea que RESOLVE — este
 * archivo sigue siendo el único que liga las dos piezas.
 *
 * @param supabase Cliente Supabase con service_role. El binding se hace
 *   aca porque core-meta-ads no puede conocer Supabase (modulo agnostico):
 *   recibe RESOLVE y REPORT ya ligados a su cliente.
 *
 * ```ts
 * const admin = createClient(
 *   Deno.env.get("SUPABASE_URL")!,
 *   Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
 * );
 * const credenciales = createMetaAdsCredentialProvider(admin);
 * const creds = await resolveMetaCredentials(credenciales, {
 *   adAccountId: "act_123",
 *   tenantId: storeId,
 * });
 * // ... usar `creds` para operar contra Meta ...
 * await credenciales.reportCredentialOutcome?.(
 *   { adAccountId: "act_123", tenantId: storeId },
 *   "active",
 * );
 * ```
 */
export function createMetaAdsCredentialProvider(
  supabase: SupabaseLike,
  options: CreateMetaAdsCredentialProviderOptions = {},
): MetaCredentialProvider {
  // El contrato real toma (supabase, input); core-meta-ads espera la forma
  // ya ligada. Estas dos lineas son todo el wiring (RESOLVE y REPORT).
  const resolve: VaultResolve = (input) => resolveCredential(supabase, input);
  const report: VaultReport = (input) => reportCredentialOutcome(supabase, input);

  return new ApiVaultMetaCredentialAdapter(resolve, options, report);
}
