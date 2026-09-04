// src/auth/oauthHttp.ts
//
// Abstracción HTTP mínima para el flujo OAuth de Meta (dialog de
// autorización + endpoint de token). Deliberadamente separada de
// `MetaClient`/`HttpMetaClient` (ver ../client): esos contratos asumen
// siempre un `accessToken` de Marketing API, paginación cursor-based, y
// los códigos de error/rate-limit específicos de Graph API para recursos
// de negocio. El endpoint de OAuth (`/oauth/access_token`) no necesita
// nada de eso — solo un GET simple con query params y parseo de JSON — así
// que reusar `HttpMetaClient` tal cual forzaría a simular un accessToken
// inexistente. Esta abstracción es intencionalmente mucho más chica.

import { MetaModuleError } from '../errors/MetaModuleError'

export interface MetaOAuthHttpResponse {
  status: number
  /** Body ya parseado como JSON, o `undefined` si la respuesta vino vacía. */
  json: unknown
}

/**
 * Contrato mínimo de transporte para OAuth. Permite testear
 * `HttpMetaOAuthProvider` sin depender de una implementación HTTP
 * concreta ni de red real.
 */
export interface MetaOAuthHttpClient {
  get(url: string): Promise<MetaOAuthHttpResponse>
}

export interface FetchMetaOAuthHttpClientOptions {
  /** Timeout por request, en ms. Default: 15000. */
  timeoutMs?: number
  /** Implementación de `fetch` a usar; sobrescribible para testing.
   *  Default: `fetch` global del entorno. */
  fetchImpl?: typeof fetch
}

const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Implementación real de `MetaOAuthHttpClient` usando `fetch` global.
 * Única pieza del módulo de auth que hace una llamada HTTP de verdad.
 */
export class FetchMetaOAuthHttpClient implements MetaOAuthHttpClient {
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch

  constructor(options?: FetchMetaOAuthHttpClientOptions) {
    const resolvedFetch = options?.fetchImpl ?? globalThis.fetch
    if (!resolvedFetch) {
      throw new MetaModuleError(
        'configuration',
        'No hay una implementación de fetch disponible para OAuth. Proveé FetchMetaOAuthHttpClientOptions.fetchImpl.'
      )
    }
    this.fetchImpl = resolvedFetch
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async get(url: string): Promise<MetaOAuthHttpResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    let response: Response
    try {
      response = await this.fetchImpl(url, { method: 'GET', signal: controller.signal })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new MetaModuleError(
          'meta_api',
          `La request de OAuth a Meta superó el timeout de ${this.timeoutMs}ms.`,
          err
        )
      }
      throw new MetaModuleError('meta_api', 'Error de red llamando al endpoint de OAuth de Meta.', err)
    } finally {
      clearTimeout(timeout)
    }

    const rawText = await response.text()
    let json: unknown = undefined
    if (rawText.length > 0) {
      try {
        json = JSON.parse(rawText)
      } catch (err) {
        throw new MetaModuleError(
          'meta_api',
          'El endpoint de OAuth de Meta devolvió una respuesta que no es JSON válido.',
          err
        )
      }
    }

    return { status: response.status, json }
  }
}
