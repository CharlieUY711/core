// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/credentials/apiVaultContract.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/credentials/apiVaultContract.ts
//
// ESPEJO DEL CONTRATO REAL — no es una interfaz nueva.
//
// Fuente de verdad (verificada en este repo, DEC-011):
//   apps/core-market/supabase/functions/_shared/api-vault/CredentialProvider.ts
//
// Ese archivo es el único punto genérico de RESOLVE / DELIVER / REPORT /
// HEALTH sobre `public.api_vault`. Corre en Deno (Edge Functions) con la
// service_role key y se importa por ruta relativa con extensión `.ts`, por
// lo que NO es importable desde un paquete TypeScript/Node como éste;
// además, importarlo acoplaría core-meta a Market, que es exactamente lo
// que el módulo tiene prohibido.
//
// Por eso acá se declaran los MISMOS tipos, con los MISMOS nombres de
// campo y la MISMA semántica, para que la implementación real satisfaga
// este puerto por duck typing sin ninguna capa de traducción. Si el
// contrato real cambia, este archivo debe cambiar con él.
//
// Diferencia deliberada y única respecto del archivo real: la función
// `resolveCredential(supabase, input)` recibe el cliente Supabase como
// primer argumento. core-meta NO puede conocer Supabase (regla de módulo
// agnóstico), así que el puerto de acá es la forma YA LIGADA a su cliente:
//   const resolve: VaultResolve = (input) => resolveCredential(admin, input)
// El binding lo hace el consumidor server-side (F8B), no este paquete.

/** Idéntico a `VaultStatus` del CredentialProvider real. */
export type VaultCredentialStatus =
  | 'active'
  | 'expired'
  | 'invalid'
  | 'revoked'
  | 'requires_reauth'
  | 'error'
  | 'unknown'

/** Idéntico a `ResolveInput` del CredentialProvider real. */
export interface VaultResolveInput {
  /** Valor de `api_vault.platform`. Comparación exacta: el Vault no conoce
   *  alias ni casing por proveedor. */
  platform: string
  /** Tenant/tienda dueña de la credencial. Si no hay fila del tenant, el
   *  Vault hace fallback a la global (`tenant_id IS NULL`). */
  tenantId?: string | null
  /** Filtro opcional por tipo (`api_key` | `token` | `oauth` | ...). */
  type?: string
  /** Filtro opcional por entorno (`production` | `staging` | ...). */
  env?: string
}

/** Idéntico a `ResolvedCredential` del CredentialProvider real. */
export interface ResolvedVaultCredential {
  /** `api_vault.id` — única identidad no ambigua de una credencial. */
  credentialId: string
  /** Valor crudo de `api_vault.value`. OPACO para el Vault: interpretarlo
   *  es responsabilidad del consumidor (ver `parseMetaVaultValue`). */
  value: string
  metadata: {
    platform: string
    tenantId: string | null
    type: string
    env: string
    expiresAt: string | null
    status: VaultCredentialStatus
    /** true si se resolvió la fila global en vez de una del tenant pedido. */
    resolvedAsGlobal: boolean
  }
}

/**
 * RESOLVE del Credential Provider real, ya ligado a su cliente Supabase.
 * Devuelve `null` cuando no existe ninguna credencial (ni de tenant ni
 * global) — el real no lanza en ese caso.
 */
export type VaultResolve = (
  input: VaultResolveInput
) => Promise<ResolvedVaultCredential | null>

/** Idéntico a `ReportInput` del CredentialProvider real (F8E). */
export interface VaultReportInput {
  /** `api_vault.id` de la credencial. Se identifica por id, no por
   *  platform: puede haber más de una credencial por plataforma con
   *  distintos tenants. */
  credentialId: string
  outcome: VaultCredentialStatus
  /** Mensaje de error corto. Nunca debe contener el secreto. */
  error?: string | null
}

/**
 * REPORT del Credential Provider real, ya ligado a su cliente Supabase.
 * Persiste HEALTH (`status`, `last_checked_at`, `last_error`) para la fila
 * `credentialId`. El real lanza si `outcome` no es un `VaultCredentialStatus`
 * válido; ese chequeo vive ahí, no se duplica en este puerto.
 */
export type VaultReport = (input: VaultReportInput) => Promise<void>
