// src/auth/HttpMetaOAuthProvider.ts
//
// Implementación concreta del contrato `MetaOAuthProvider` (ver
// ./MetaOAuthProvider.ts, definido en Fase 2). Es la única pieza de
// core-meta que sabe hablar con los endpoints de autorización/token de
// Meta. Deliberadamente NO sabe nada de:
// - Dónde/cómo se persisten las credenciales resultantes (ver
//   ../credentials) — devuelve el resultado crudo para que una capa
//   externa lo guarde vía `MetaCredentialProvider`.
// - Ningún consumidor (Market, apps/, Supabase, UI, React).
//
// Seguridad: `appSecret` vive solo en memoria del proceso que instancia
// este provider (server-side). Nunca se incluye en la Authorization URL
// (que es pública/redirigida al browser), nunca se loguea, y ningún
// mensaje de error generado acá interpola valores de `appSecret` ni de
// tokens — ver `sanitizeMetaOAuthError`.

import { MetaModuleError } from '../errors/MetaModuleError'
import type {
  MetaAuthorizeParams,
  MetaAuthorizeResult,
  MetaDisconnectParams,
  MetaOAuthCallbackParams,
  MetaOAuthCallbackResult,
  MetaOAuthProvider,
  MetaRefreshResult,
} from './MetaOAuthProvider'
import type { MetaOAuthConfig } from './MetaOAuthConfig'
import {
  META_OAUTH_DEFAULT_AUTH_BASE_URL,
  META_OAUTH_DEFAULT_STATE_TTL_MS,
  META_OAUTH_DEFAULT_TOKEN_BASE_URL,
} from './MetaOAuthConfig'
import { createOAuthState, verifyOAuthState } from './oauthState'
import type { MetaOAuthHttpClient } from './oauthHttp'
import { FetchMetaOAuthHttpClient } from './oauthHttp'

/** Shape crudo de un error de Graph API en el endpoint de OAuth. */
interface RawMetaOAuthErrorBody {
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

/** Shape crudo de una respuesta exitosa del endpoint de token de Meta. */
interface RawMetaTokenResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
}

/** Error saneado: solo campos que Meta documenta públicamente en su
 *  respuesta de error, nunca el request original (que sí puede contener
 *  `appSecret`/`code`/tokens). Usarlo como única fuente posible de `cause`
 *  evita que un secreto termine en un log o en un error no manejado. */
interface SanitizedMetaOAuthError {
  message: string
  type?: string
  code?: number
}

function extractMetaOAuthError(json: unknown): SanitizedMetaOAuthError | undefined {
  if (!json || typeof json !== 'object') {
    return undefined
  }
  const body = json as RawMetaOAuthErrorBody
  if (!body.error || typeof body.error.message !== 'string') {
    return undefined
  }
  return { message: body.error.message, type: body.error.type, code: body.error.code }
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}

/**
 * Implementación de `MetaOAuthProvider` respaldada por los endpoints
 * reales de OAuth de Meta (`/dialog/oauth` y `/oauth/access_token`).
 */
export class HttpMetaOAuthProvider implements MetaOAuthProvider {
  private readonly config: MetaOAuthConfig
  private readonly authBaseUrl: string
  private readonly tokenBaseUrl: string
  private readonly stateTtlMs: number
  private readonly http: MetaOAuthHttpClient

  constructor(config: MetaOAuthConfig, http?: MetaOAuthHttpClient) {
    if (!config.appId) {
      throw new MetaModuleError('configuration', 'MetaOAuthConfig.appId es requerido.')
    }
    if (!config.appSecret) {
      throw new MetaModuleError('configuration', 'MetaOAuthConfig.appSecret es requerido.')
    }
    if (!config.apiVersion) {
      throw new MetaModuleError('configuration', 'MetaOAuthConfig.apiVersion es requerido.')
    }
    if (!config.redirectUri) {
      throw new MetaModuleError('configuration', 'MetaOAuthConfig.redirectUri es requerido.')
    }

    this.config = config
    this.authBaseUrl = (config.authBaseUrl ?? META_OAUTH_DEFAULT_AUTH_BASE_URL).replace(/\/+$/, '')
    this.tokenBaseUrl = (config.tokenBaseUrl ?? META_OAUTH_DEFAULT_TOKEN_BASE_URL).replace(/\/+$/, '')
    this.stateTtlMs = config.stateTtlMs ?? META_OAUTH_DEFAULT_STATE_TTL_MS
    this.http = http ?? new FetchMetaOAuthHttpClient()
  }

  /**
   * Genera un `state` opaco y autoverificable (ver ./oauthState.ts) para
   * usar en `getAuthorizationUrl`. No es parte del contrato
   * `MetaOAuthProvider` (que recibe `state` ya generado, ver
   * ./MetaOAuthProvider.ts) — es el mecanismo que este provider ofrece
   * para generarlo de forma segura sin requerir storage.
   */
  async createState(): Promise<string> {
    return createOAuthState(this.config.appSecret)
  }

  getAuthorizationUrl(params: MetaAuthorizeParams): MetaAuthorizeResult {
    if (!params.redirectUri) {
      throw new MetaModuleError('validation', 'redirectUri es requerido para generar la Authorization URL.')
    }
    if (!params.state) {
      throw new MetaModuleError('validation', 'state es requerido para generar la Authorization URL.')
    }
    if (!params.scopes || params.scopes.length === 0) {
      throw new MetaModuleError('validation', 'scopes es requerido para generar la Authorization URL.')
    }
    if (params.redirectUri !== this.config.redirectUri) {
      // Meta exige el mismo redirect_uri en el paso de autorización y en
      // el intercambio de código por token (ver handleCallback, que usa
      // this.config.redirectUri). Si no coinciden, Meta rechazaría el
      // intercambio con un error genérico más adelante; se detecta acá,
      // temprano y con un mensaje claro.
      throw new MetaModuleError(
        'configuration',
        'redirectUri no coincide con el configurado para este proveedor de OAuth de Meta.'
      )
    }

    const url = new URL(`${this.authBaseUrl}/${this.config.apiVersion}/dialog/oauth`)
    url.searchParams.set('client_id', this.config.appId)
    url.searchParams.set('redirect_uri', params.redirectUri)
    url.searchParams.set('state', params.state)
    url.searchParams.set('scope', params.scopes.join(','))
    url.searchParams.set('response_type', 'code')

    return { authorizationUrl: url.toString() }
  }

  async handleCallback(params: MetaOAuthCallbackParams): Promise<MetaOAuthCallbackResult> {
    if (!params.code) {
      throw new MetaModuleError('validation', 'code es requerido para completar el callback de OAuth.')
    }
    if (!params.state) {
      throw new MetaModuleError('validation', 'state es requerido para completar el callback de OAuth.')
    }

    const stateIsValid = await verifyOAuthState(params.state, this.config.appSecret, this.stateTtlMs)
    if (!stateIsValid) {
      throw new MetaModuleError(
        'authentication',
        'El parámetro state es inválido o expiró. Reiniciá el flujo de conexión con Meta.'
      )
    }

    const url = new URL(`${this.tokenBaseUrl}/${this.config.apiVersion}/oauth/access_token`)
    url.searchParams.set('client_id', this.config.appId)
    url.searchParams.set('client_secret', this.config.appSecret)
    url.searchParams.set('redirect_uri', this.config.redirectUri)
    url.searchParams.set('code', params.code)

    const response = await this.http.get(url.toString())
    const metaError = extractMetaOAuthError(response.json)

    if (metaError || !isSuccessStatus(response.status)) {
      throw new MetaModuleError(
        'authentication',
        'No se pudo intercambiar el código de autorización por un access token de Meta.',
        metaError
      )
    }

    const body = response.json as RawMetaTokenResponse
    if (!body?.access_token) {
      throw new MetaModuleError(
        'authentication',
        'Meta no devolvió un access token válido en la respuesta de OAuth.'
      )
    }

    return {
      accessToken: body.access_token,
      expiresIn: body.expires_in,
      tokenType: body.token_type,
    }
  }

  async refresh(currentAccessToken: string): Promise<MetaRefreshResult> {
    if (!currentAccessToken) {
      throw new MetaModuleError('validation', 'currentAccessToken es requerido para refrescar el token.')
    }

    const url = new URL(`${this.tokenBaseUrl}/${this.config.apiVersion}/oauth/access_token`)
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', this.config.appId)
    url.searchParams.set('client_secret', this.config.appSecret)
    url.searchParams.set('fb_exchange_token', currentAccessToken)

    const response = await this.http.get(url.toString())
    const metaError = extractMetaOAuthError(response.json)

    if (metaError || !isSuccessStatus(response.status)) {
      throw new MetaModuleError('authentication', 'No se pudo refrescar el access token de Meta.', metaError)
    }

    const body = response.json as RawMetaTokenResponse
    if (!body?.access_token) {
      throw new MetaModuleError('authentication', 'Meta no devolvió un access token válido al refrescar.')
    }

    return { accessToken: body.access_token, expiresIn: body.expires_in }
  }

  async disconnect(params: MetaDisconnectParams): Promise<void> {
    if (!params.adAccountId) {
      throw new MetaModuleError('validation', 'adAccountId es requerido para desconectar la cuenta.')
    }

    // Desconexión lógica: core-meta no persiste tokens ni credenciales
    // (ver ../credentials), así que no hay nada que este módulo deba
    // borrar o revocar por sí mismo. Este método valida el input y sirve
    // como punto de extensión: una fase futura, al conectar el
    // `MetaCredentialProvider` real, puede invalidar la credencial
    // almacenada y opcionalmente revocar el token contra Meta desde la
    // capa externa que sí tiene el access token vigente (este contrato,
    // ver MetaDisconnectParams, deliberadamente no lo recibe).
  }
}
