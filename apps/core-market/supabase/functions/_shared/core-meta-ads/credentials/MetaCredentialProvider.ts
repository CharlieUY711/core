// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/credentials/MetaCredentialProvider.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/credentials/MetaCredentialProvider.ts
//
// Contrato que le permite a core-meta pedir credenciales sin saber dónde
// ni cómo se almacenan. core-meta NUNCA implementa esto — lo implementa
// el consumidor (Market, u otro), típicamente delegando a api_vault /
// CredentialProvider genérico del monorepo, o a cualquier otro mecanismo.
//
// Por diseño, esta interfaz no importa Supabase, React ni ningún código
// de Market: cualquier implementación concreta vive fuera de core-meta.

import type { MetaAccountRef, MetaAdsCredentials } from '../types/credentials.types.ts'
import type { VaultCredentialStatus } from './apiVaultContract.ts'

export interface MetaCredentialProvider {
  /**
   * Resuelve las credenciales necesarias para operar sobre la cuenta
   * publicitaria indicada. Debe rechazar (throw) con un `MetaModuleError`
   * de categoría `credentials` si no puede resolverlas.
   */
  getCredentials(ref: MetaAccountRef): Promise<MetaAdsCredentials>

  /**
   * OPCIONAL (F8E) — REPORT/HEALTH (DEC-011). Informa el resultado de
   * haber usado las credenciales que `getCredentials(ref)` devolvió para
   * ese mismo `ref`. Implementaciones respaldadas por API Vault (p. ej.
   * `ApiVaultMetaCredentialAdapter`) la implementan; un provider que no
   * tenga a dónde persistir HEALTH puede omitirla — el consumidor debe
   * tratar la ausencia como "no hay HEALTH disponible", nunca como error.
   *
   * Quien llama decide CUÁNDO reportar: este método no valida que el
   * `outcome` corresponda al estado real de la credencial. No debe
   * invocarse para errores que no reflejen ese estado (rate limiting,
   * validación de input, fallas transitorias de red de Meta, permisos de
   * la operación sobre una cuenta que no son un problema de la credencial
   * en sí).
   */
  reportCredentialOutcome?(
    ref: MetaAccountRef,
    outcome: VaultCredentialStatus,
    error?: string | null
  ): Promise<void>
}
