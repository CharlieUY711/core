// src/credentials/resolveMetaCredentials.ts
//
// Punto único por el que core-meta pide credenciales: delega en la
// implementación externa de `MetaCredentialProvider` (Market, api_vault,
// o cualquier otra) y valida el resultado antes de devolverlo. core-meta
// no almacena ni administra secretos — solo los consume una vez resueltos.

import { MetaModuleError } from '../errors/MetaModuleError'
import type { MetaAccountRef, MetaAdsCredentials } from '../types/credentials.types'
import type { MetaCredentialProvider } from './MetaCredentialProvider'
import { validateMetaAdsCredentials } from './validateMetaAdsCredentials'

/**
 * Resuelve las credenciales de Meta Ads para `ref` usando `provider`, y
 * valida que estén completas y con formato válido antes de devolverlas.
 *
 * - Si `provider.getCredentials` rechaza con un `MetaModuleError`, se
 *   re-lanza tal cual (ya viene categorizado por el provider).
 * - Si rechaza con cualquier otro error, se envuelve en un
 *   `MetaModuleError` de categoría `credentials`. El error original se
 *   conserva en `cause` para diagnóstico, pero nunca se interpola en el
 *   mensaje (podría contener secretos capturados por el provider externo).
 * - Si el resultado no pasa `validateMetaAdsCredentials`, esa función es
 *   la que lanza.
 */
export async function resolveMetaCredentials(
  provider: MetaCredentialProvider,
  ref: MetaAccountRef
): Promise<MetaAdsCredentials> {
  let credentials: MetaAdsCredentials
  try {
    credentials = await provider.getCredentials(ref)
  } catch (err) {
    if (err instanceof MetaModuleError) {
      throw err
    }
    throw new MetaModuleError(
      'credentials',
      'No se pudieron resolver las credenciales de Meta Ads para la cuenta solicitada.',
      err
    )
  }

  validateMetaAdsCredentials(credentials)
  return credentials
}
