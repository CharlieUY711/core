// src/auth/index.ts
export type {
  MetaOAuthProvider,
  MetaAuthorizeParams,
  MetaAuthorizeResult,
  MetaOAuthCallbackParams,
  MetaOAuthCallbackResult,
  MetaRefreshResult,
  MetaDisconnectParams,
} from './MetaOAuthProvider'

// Configuración centralizada del flujo OAuth (Fase 6): URLs base, versión
// de API, TTL de `state`. Ver ./MetaOAuthConfig.ts.
export type { MetaOAuthConfig } from './MetaOAuthConfig'
export {
  META_OAUTH_DEFAULT_AUTH_BASE_URL,
  META_OAUTH_DEFAULT_TOKEN_BASE_URL,
  META_OAUTH_DEFAULT_STATE_TTL_MS,
} from './MetaOAuthConfig'

// Generación/validación de `state` firmado y autoverificable, sin
// persistencia (Fase 6). Ver ./oauthState.ts.
export { createOAuthState, verifyOAuthState } from './oauthState'

// Abstracción HTTP mínima para OAuth, independiente de `MetaClient`
// (Fase 6). Ver ./oauthHttp.ts.
export type { MetaOAuthHttpClient, MetaOAuthHttpResponse } from './oauthHttp'
export { FetchMetaOAuthHttpClient } from './oauthHttp'
export type { FetchMetaOAuthHttpClientOptions } from './oauthHttp'

// Implementación concreta del contrato `MetaOAuthProvider` (Fase 6). Ver
// ./HttpMetaOAuthProvider.ts.
export { HttpMetaOAuthProvider } from './HttpMetaOAuthProvider'
