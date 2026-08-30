// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/credentials/ApiVaultMetaCredentialAdapter.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/credentials/ApiVaultMetaCredentialAdapter.ts
//
// Implementación de `MetaCredentialProvider` sobre el Credential Provider
// REAL del monorepo (DEC-011):
//   apps/core-market/supabase/functions/_shared/api-vault/CredentialProvider.ts
//
// El adaptador consume la operación RESOLVE tal cual existe hoy —ver el
// espejo de tipos en `./apiVaultContract`— y traduce el `value` OPACO que
// devuelve el Vault al contrato `MetaAdsCredentials`. No crea un Vault
// propio, no almacena nada, no importa Supabase ni `core-apivault`, y no
// implementa OAuth: el ciclo de vida de la credencial (alta, refresh,
// reauth) sigue siendo del proveedor, exactamente como en DEC-011 §10.
//
// Reparto de responsabilidades (DEC-011 §5): el Vault NO conoce
// `accessToken`, `appSecret` ni ningún campo de Meta; `api_vault.value` es
// un string opaco que el CONSUMIDOR interpreta. La convención vigente en
// el repo para credenciales multi-campo es JSON con claves camelCase
// (ver core-mlmp/MLVaultService.ts: accessToken, refreshToken, expiresAt,
// appId…). Este adaptador aplica esa misma convención para Meta.

import { MetaModuleError } from '../errors/MetaModuleError.ts'
import type { MetaAccountRef, MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaCredentialProvider } from './MetaCredentialProvider.ts'
import type {
  ResolvedVaultCredential,
  VaultCredentialStatus,
  VaultReport,
  VaultResolve,
} from './apiVaultContract.ts'
import { validateMetaAdsCredentials } from './validateMetaAdsCredentials.ts'

/**
 * Forma esperada del JSON guardado en `api_vault.value` para una
 * credencial de Meta Ads. Todos los campos son opcionales acá: la
 * validación de presencia y formato la hace `validateMetaAdsCredentials`,
 * no este parser.
 */
export interface MetaVaultValue {
  appId?: string | null
  appSecret?: string | null
  accessToken?: string | null
  adAccountId?: string | null
  businessId?: string | null
  expiresAt?: string | null
}

/**
 * Identificador canónico de esta integración en `api_vault.platform`.
 * Decidido para F8B: `meta_ads`, sin aliases (`meta`, `facebook`,
 * `instagram`). Comparación exacta — el RESOLVE real no normaliza casing
 * ni conoce alias.
 */
export const META_ADS_VAULT_PLATFORM = 'meta_ads'

export interface ApiVaultMetaCredentialAdapterOptions {
  /**
   * Valor exacto de `api_vault.platform`. Default:
   * `META_ADS_VAULT_PLATFORM` (`'meta_ads'`). Se deja overrideable para no
   * clavar el nombre del catálogo del Vault dentro del módulo, pero no
   * debe usarse otro valor sin una decisión explícita.
   */
  platform?: string
  /** Filtro `api_vault.type`. Default `'oauth'`, el tipo con el que ya se
   *  guardan las credenciales OAuth existentes en el Vault. */
  type?: string
  /** Filtro `api_vault.env`. Sin default: el RESOLVE real no filtra por
   *  entorno salvo que se lo pidan. */
  env?: string
}

/** Clave interna para correlacionar un `MetaAccountRef` con el
 *  `credentialId` que RESOLVE devolvió para él. Misma cuenta + mismo
 *  tenant identifican la misma fila de `api_vault` para una instancia del
 *  adapter (ver nota en `reportCredentialOutcome`). */
function refKey(ref: MetaAccountRef): string {
  return `${ref.adAccountId}::${ref.tenantId ?? ''}`
}

/** Extrae el JSON opaco de `value` sin filtrar nunca su contenido al error. */
function parseMetaVaultValue(value: string): MetaVaultValue {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    // No se interpola `value` (es el secreto) ni el error de JSON.parse
    // (los engines incluyen un fragmento del texto que falló al parsear).
    throw new MetaModuleError(
      'credentials',
      'La credencial de Meta Ads almacenada en el Vault no tiene un formato válido.'
    )
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new MetaModuleError(
      'credentials',
      'La credencial de Meta Ads almacenada en el Vault no tiene un formato válido.'
    )
  }
  return parsed as MetaVaultValue
}

/**
 * `MetaCredentialProvider` respaldado por el RESOLVE real de API Vault.
 *
 * Se construye con la función RESOLVE ya ligada a su cliente Supabase
 * server-side, p. ej.:
 *
 * ```ts
 * const adapter = new ApiVaultMetaCredentialAdapter(
 *   (input) => resolveCredential(admin, input)
 * )
 * ```
 */
export class ApiVaultMetaCredentialAdapter implements MetaCredentialProvider {
  private readonly platform: string
  private readonly type: string
  private readonly env: string | undefined
  /** `ref` -> `credentialId` de la última fila que RESOLVE identificó para
   *  ese `ref`, aunque `getCredentials` haya terminado lanzando (value
   *  malformado, campos faltantes, cuenta incorrecta). Es lo que permite
   *  que `reportCredentialOutcome` sepa CONTRA QUÉ fila reportar sin que
   *  `MetaAdsCredentials` (el objeto público) tenga que cargar el
   *  `credentialId` del Vault. Alcance: por instancia del adapter, que en
   *  el wiring real (`createMetaAdsCredentialProvider`) se crea una vez
   *  por request. */
  private readonly resolvedCredentialIds = new Map<string, string>()

  constructor(
    private readonly resolve: VaultResolve,
    options: ApiVaultMetaCredentialAdapterOptions = {},
    private readonly report?: VaultReport
  ) {
    const platform = options.platform ?? META_ADS_VAULT_PLATFORM
    if (typeof platform !== 'string' || platform.trim().length === 0) {
      throw new MetaModuleError(
        'configuration',
        'ApiVaultMetaCredentialAdapter: "platform" debe ser el nombre exacto de la plataforma en api_vault.'
      )
    }
    this.platform = platform
    this.type = options.type ?? 'oauth'
    this.env = options.env
  }

  async getCredentials(ref: MetaAccountRef): Promise<MetaAdsCredentials> {
    let resolved: ResolvedVaultCredential | null
    try {
      resolved = await this.resolve({
        platform: this.platform,
        tenantId: ref.tenantId ?? null,
        type: this.type,
        ...(this.env !== undefined ? { env: this.env } : {}),
      })
    } catch (err) {
      // No se interpola `err` en el mensaje: podría contener detalles del
      // Vault (incluyendo, potencialmente, fragmentos de secretos) que no
      // deben terminar en un mensaje de error legible.
      throw new MetaModuleError(
        'credentials',
        'No se pudieron resolver las credenciales de Meta Ads desde el Vault.',
        err
      )
    }

    // El RESOLVE real devuelve null (no lanza) cuando no hay fila ni del
    // tenant ni global.
    if (!resolved) {
      throw new MetaModuleError(
        'credentials',
        'No hay una credencial de Meta Ads cargada en el Vault para la cuenta solicitada.'
      )
    }

    // A partir de acá ya hay una fila real identificada por `credentialId`,
    // aunque el resto de este método termine lanzando (value malformado,
    // campo obligatorio faltante, cuenta incorrecta). Se recuerda ya mismo
    // para que `reportCredentialOutcome(ref, ...)` pueda reportar HEALTH
    // contra esa fila incluso cuando `getCredentials` no llega a devolver
    // nada. Cuando RESOLVE no encuentra ninguna fila (rama de arriba) no
    // hay nada que recordar: no hay `credentialId` que reportar.
    this.resolvedCredentialIds.set(refKey(ref), resolved.credentialId)

    const credentials = this.toMetaAdsCredentials(resolved, ref)
    validateMetaAdsCredentials(credentials)
    return credentials
  }

  /**
   * REPORT/HEALTH (F8E, DEC-011). Reporta el resultado de haber usado las
   * credenciales que `getCredentials(ref)` devolvió (o intentó devolver)
   * para este mismo `ref`.
   *
   * No hace nada (silenciosamente) cuando:
   * - el adapter se construyó sin función `report` (uso solo-lectura), o
   * - nunca se identificó un `credentialId` para este `ref` — p. ej.
   *   RESOLVE no encontró ninguna fila. No hay contra qué reportar.
   *
   * Un fallo al persistir el REPORT (p. ej. el Vault no responde) se
   * atrapa acá y no se propaga: HEALTH es informativo y best-effort, no
   * debe convertir una operación que ya se resolvió (bien o mal) en un
   * error distinto para el llamador.
   */
  async reportCredentialOutcome(
    ref: MetaAccountRef,
    outcome: VaultCredentialStatus,
    error?: string | null
  ): Promise<void> {
    if (!this.report) return

    const credentialId = this.resolvedCredentialIds.get(refKey(ref))
    if (!credentialId) return

    try {
      await this.report({ credentialId, outcome, error: error ?? null })
    } catch {
      // Best-effort: ver doc del método. No se re-lanza ni se loguea (el
      // error del Vault podría, en teoría, traer detalle sensible).
    }
  }

  private toMetaAdsCredentials(
    resolved: ResolvedVaultCredential,
    ref: MetaAccountRef
  ): MetaAdsCredentials {
    const value = parseMetaVaultValue(resolved.value)

    // La cuenta sobre la que se va a operar es la que pidió el llamador.
    // Si la credencial guardada está fijada a otra cuenta, se rechaza en
    // vez de operar contra una cuenta distinta a la solicitada.
    const storedAdAccountId = value.adAccountId ?? null
    if (storedAdAccountId !== null && storedAdAccountId !== ref.adAccountId) {
      throw new MetaModuleError(
        'authorization',
        'La credencial de Meta Ads resuelta corresponde a otra cuenta publicitaria.'
      )
    }

    return {
      appId: value.appId ?? '',
      appSecret: value.appSecret ?? '',
      accessToken: value.accessToken ?? '',
      adAccountId: ref.adAccountId,
      businessId: value.businessId ?? null,
      // `api_vault.expires_at` (columna, expuesta por el contrato real en
      // `metadata.expiresAt`) manda sobre lo que diga el JSON opaco.
      expiresAt: resolved.metadata.expiresAt ?? value.expiresAt ?? null,
    }
  }
}
