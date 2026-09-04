// src/auth/MetaOAuthProvider.ts
//
// Interfaces necesarias para que una fase futura implemente OAuth con
// Meta. Nada acá hace una llamada HTTP real ni conoce Market.

export interface MetaAuthorizeParams {
  /** Redirect URI registrada en la app de Meta. */
  redirectUri: string
  /** Valor opaco de state, generado y validado por el consumidor. */
  state: string
  /** Scopes de permisos solicitados (p. ej. "ads_management"). */
  scopes: string[]
}

export interface MetaAuthorizeResult {
  authorizationUrl: string
}

export interface MetaOAuthCallbackParams {
  code: string
  state: string
}

export interface MetaOAuthCallbackResult {
  accessToken: string
  /** Segundos hasta expiración, si Meta lo informa. */
  expiresIn?: number
  tokenType?: string
}

export interface MetaRefreshResult {
  accessToken: string
  expiresIn?: number
}

export interface MetaDisconnectParams {
  adAccountId: string
  tenantId?: string | null
}

/**
 * Contrato de un proveedor OAuth para Meta. La implementación concreta
 * (Fase futura) es la única pieza que sabe hablar con los endpoints reales
 * de autorización/token de Meta.
 */
export interface MetaOAuthProvider {
  getAuthorizationUrl(params: MetaAuthorizeParams): MetaAuthorizeResult
  handleCallback(params: MetaOAuthCallbackParams): Promise<MetaOAuthCallbackResult>
  refresh(currentAccessToken: string): Promise<MetaRefreshResult>
  disconnect(params: MetaDisconnectParams): Promise<void>
}
