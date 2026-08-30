// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/client/HttpMetaClient.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/client/HttpMetaClient.ts
//
// Implementación concreta del contrato `MetaClient` (ver ./MetaClient.ts)
// usando `fetch` global. Es la única pieza de core-meta que sabe hablar
// HTTP con Graph API / Marketing API: versión de API, serialización de
// query/body, timeout, normalización de errores y detección básica de
// rate limiting.
//
// Deliberadamente NO sabe nada de:
// - OAuth (ver ../auth) — recibe el `accessToken` ya resuelto por request.
// - Credenciales / almacenamiento (ver ../credentials) — no las resuelve
//   ni las persiste, solo las usa cuando el caller se las pasa.
// - Ningún consumidor (Market, apps/, Supabase, UI).

import { MetaModuleError } from '../errors/MetaModuleError.ts'
import type { MetaApiError, MetaApiResult, MetaPage } from '../types/api.types.ts'
import type {
  MetaClient,
  MetaClientConfig,
  MetaHttpMethod,
  MetaRequestOptions,
} from './MetaClient.ts'

const DEFAULT_BASE_URL = 'https://graph.facebook.com'
const DEFAULT_TIMEOUT_MS = 30_000

/** Códigos de error de Graph API que representan rate limiting.
 *  Ver: https://developers.facebook.com/docs/graph-api/guides/error-handling
 *  4     = Application request limit reached
 *  17    = User request limit reached
 *  32    = Page request limit reached
 *  613   = Custom rate limit (Marketing API) */
const RATE_LIMIT_ERROR_CODES = new Set([4, 17, 32, 613])
const HTTP_RATE_LIMIT_STATUS = 429

/** Shape crudo del error que devuelve Graph API dentro del body. */
interface RawMetaApiErrorBody {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

/** Shape crudo de un listado paginado (cursor-based) de Graph API. */
interface RawMetaPageBody<T> {
  data?: T[]
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
    next?: string
    previous?: string
  }
}

export interface HttpMetaClientOptions {
  /** Timeout por request, en ms. Default: 30000. */
  timeoutMs?: number
  /** Implementación de `fetch` a usar; sobrescribible para testing. Default:
   *  `fetch` global del entorno. */
  fetchImpl?: typeof fetch
}

/**
 * Cliente HTTP real hacia Graph API / Marketing API. Implementa el
 * contrato `MetaClient` definido en Fase 2.
 */
export class HttpMetaClient implements MetaClient {
  private readonly baseUrl: string
  private readonly apiVersion: string
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch

  constructor(config: MetaClientConfig, options?: HttpMetaClientOptions) {
    if (!config.apiVersion) {
      throw new MetaModuleError('configuration', 'MetaClientConfig.apiVersion es requerido.')
    }

    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.apiVersion = config.apiVersion.replace(/^\/+|\/+$/g, '')
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

    const resolvedFetch = options?.fetchImpl ?? globalThis.fetch
    if (!resolvedFetch) {
      throw new MetaModuleError(
        'configuration',
        'No hay una implementación de fetch disponible. Proveé HttpMetaClientOptions.fetchImpl.'
      )
    }
    this.fetchImpl = resolvedFetch
  }

  async get<T>(options: Omit<MetaRequestOptions, 'method'>): Promise<MetaApiResult<T>> {
    return this.request<T>({ ...options, method: 'GET' })
  }

  async post<T>(options: Omit<MetaRequestOptions, 'method'>): Promise<MetaApiResult<T>> {
    return this.request<T>({ ...options, method: 'POST' })
  }

  async delete<T>(options: Omit<MetaRequestOptions, 'method'>): Promise<MetaApiResult<T>> {
    return this.request<T>({ ...options, method: 'DELETE' })
  }

  async getPage<T>(
    options: Omit<MetaRequestOptions, 'method'>
  ): Promise<MetaApiResult<MetaPage<T>>> {
    const result = await this.request<RawMetaPageBody<T>>({ ...options, method: 'GET' })

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    const raw = result.data
    const page: MetaPage<T> = {
      data: raw?.data ?? [],
      nextCursor: raw?.paging?.cursors?.after ?? null,
      previousCursor: raw?.paging?.cursors?.before ?? null,
    }

    return { ok: true, data: page }
  }

  // -- internals -----------------------------------------------------------

  private async request<T>(options: MetaRequestOptions): Promise<MetaApiResult<T>> {
    if (!options.accessToken) {
      throw new MetaModuleError('validation', 'accessToken es requerido para llamar a Meta API.')
    }
    if (!options.path) {
      throw new MetaModuleError('validation', 'path es requerido para llamar a Meta API.')
    }

    const url = this.buildUrl(options.method, options.path, options.accessToken, options.params)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: options.method,
        headers: this.buildHeaders(options.method, options.body),
        body: this.buildBody(options.method, options.body),
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new MetaModuleError(
          'meta_api',
          `La request a Meta API superó el timeout de ${this.timeoutMs}ms.`,
          err
        )
      }
      throw new MetaModuleError('meta_api', 'Error de red llamando a Meta API.', err)
    } finally {
      clearTimeout(timeout)
    }

    const rawText = await response.text()
    let parsed: unknown = undefined
    if (rawText.length > 0) {
      try {
        parsed = JSON.parse(rawText)
      } catch (err) {
        throw new MetaModuleError(
          'meta_api',
          'Meta API devolvió una respuesta que no es JSON válido.',
          err
        )
      }
    }

    const metaError = this.extractMetaApiError(parsed)

    if (metaError || !response.ok) {
      const normalizedError: MetaApiError = metaError ?? {
        message: `Meta API respondió con status HTTP ${response.status}.`,
        code: response.status,
      }

      if (this.isRateLimited(response.status, normalizedError)) {
        throw new MetaModuleError(
          'rate_limit',
          normalizedError.message || 'Rate limit de Meta API alcanzado.',
          normalizedError
        )
      }

      return { ok: false, error: normalizedError }
    }

    return { ok: true, data: parsed as T }
  }

  private buildUrl(
    method: MetaHttpMethod,
    path: string,
    accessToken: string,
    params?: Record<string, string | number | boolean>
  ): string {
    const cleanPath = path.replace(/^\/+/, '')
    const url = new URL(`${this.baseUrl}/${this.apiVersion}/${cleanPath}`)

    // access_token siempre viaja en la query string, incluso para
    // POST/DELETE: es el comportamiento estándar documentado por Graph API.
    url.searchParams.set('access_token', accessToken)

    // Para GET/DELETE los params van en la query string. Para POST viajan
    // en el body (ver buildBody); acá solo agregamos params explícitos si
    // vinieran igual, para no perder información si el caller los pasa.
    if (params && (method === 'GET' || method === 'DELETE')) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }

  private buildHeaders(method: MetaHttpMethod, body?: Record<string, unknown>): HeadersInit {
    if (method === 'POST' && body) {
      return { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
    return {}
  }

  private buildBody(method: MetaHttpMethod, body?: Record<string, unknown>): string | undefined {
    if (method !== 'POST' || !body) {
      return undefined
    }

    const form = new URLSearchParams()
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue
      form.set(key, typeof value === 'string' ? value : JSON.stringify(value))
    }
    return form.toString()
  }

  private extractMetaApiError(parsed: unknown): MetaApiError | undefined {
    if (!parsed || typeof parsed !== 'object') {
      return undefined
    }

    const body = parsed as RawMetaApiErrorBody
    if (!body.error || typeof body.error.message !== 'string') {
      return undefined
    }

    return {
      message: body.error.message,
      type: body.error.type,
      code: body.error.code,
      errorSubcode: body.error.error_subcode,
      fbtraceId: body.error.fbtrace_id,
    }
  }

  private isRateLimited(status: number, error: MetaApiError): boolean {
    if (status === HTTP_RATE_LIMIT_STATUS) return true
    if (typeof error.code === 'number' && RATE_LIMIT_ERROR_CODES.has(error.code)) return true
    return false
  }
}
