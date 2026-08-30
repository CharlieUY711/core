// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/credentials/validateMetaAdsCredentials.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/credentials/validateMetaAdsCredentials.ts
//
// Validación de `MetaAdsCredentials`: presencia de todos los campos
// requeridos + formato básico esperado por Graph API / Marketing API.
// No resuelve credenciales ni sabe de dónde vienen — solo verifica que lo
// que haya devuelto un `MetaCredentialProvider` sea utilizable.
//
// Regla dura: ningún mensaje de error generado acá incluye el VALOR de un
// campo sensible (appSecret, accessToken). Solo se referencia el nombre
// del campo y, cuando aplica, una descripción del formato esperado.

import { MetaModuleError } from '../errors/MetaModuleError.ts'
import type { MetaAdsCredentials } from '../types/credentials.types.ts'

/** Formato esperado por Graph API para una cuenta publicitaria: `act_<id>`. */
const AD_ACCOUNT_ID_PATTERN = /^act_\d+$/
/** App IDs de Meta son siempre numéricos. */
const APP_ID_PATTERN = /^\d+$/
/** Business Manager IDs son siempre numéricos, cuando están presentes. */
const BUSINESS_ID_PATTERN = /^\d+$/
/** No validamos la forma interna de un access token (varía por tipo:
 *  user token, system user token, etc.), solo un largo mínimo razonable
 *  para descartar valores claramente inválidos (vacíos, placeholders). */
const MIN_ACCESS_TOKEN_LENGTH = 10

function fail(message: string): never {
  throw new MetaModuleError('credentials', message)
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`Credenciales de Meta Ads inválidas: falta "${fieldName}" o está vacío.`)
  }
  return value as string
}

/**
 * Valida que `credentials` tenga todos los campos requeridos y que su
 * formato sea el esperado por Graph API / Marketing API. Lanza
 * `MetaModuleError` de categoría `credentials` en el primer problema que
 * encuentra. No devuelve nada: si no lanza, `credentials` es válido.
 */
export function validateMetaAdsCredentials(credentials: MetaAdsCredentials): void {
  if (!credentials || typeof credentials !== 'object') {
    fail('Credenciales de Meta Ads inválidas: se esperaba un objeto de credenciales.')
  }

  const appId = requireNonEmptyString(credentials.appId, 'appId')
  if (!APP_ID_PATTERN.test(appId)) {
    fail('Credenciales de Meta Ads inválidas: "appId" debe ser numérico.')
  }

  requireNonEmptyString(credentials.appSecret, 'appSecret')
  // Deliberadamente no se valida formato de appSecret más allá de
  // presencia: es un secreto opaco, no vale la pena (ni es seguro)
  // intentar inferir su forma esperada.

  const accessToken = requireNonEmptyString(credentials.accessToken, 'accessToken')
  if (accessToken.length < MIN_ACCESS_TOKEN_LENGTH) {
    fail('Credenciales de Meta Ads inválidas: "accessToken" tiene un formato inválido.')
  }

  const adAccountId = requireNonEmptyString(credentials.adAccountId, 'adAccountId')
  if (!AD_ACCOUNT_ID_PATTERN.test(adAccountId)) {
    fail('Credenciales de Meta Ads inválidas: "adAccountId" debe tener el formato "act_<id>".')
  }

  if (credentials.businessId !== undefined && credentials.businessId !== null) {
    if (typeof credentials.businessId !== 'string' || !BUSINESS_ID_PATTERN.test(credentials.businessId)) {
      fail('Credenciales de Meta Ads inválidas: "businessId" debe ser numérico.')
    }
  }

  if (credentials.expiresAt !== undefined && credentials.expiresAt !== null) {
    if (typeof credentials.expiresAt !== 'string' || Number.isNaN(Date.parse(credentials.expiresAt))) {
      fail('Credenciales de Meta Ads inválidas: "expiresAt" debe ser una fecha ISO-8601 válida.')
    }
  }
}
