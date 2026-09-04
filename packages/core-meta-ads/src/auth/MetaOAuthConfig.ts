// src/auth/MetaOAuthConfig.ts
//
// Configuración centralizada para el flujo OAuth de Meta. Todo lo que hoy
// está disperso conceptualmente (URL de autorización, endpoint de token,
// versión de API, TTL de `state`) vive en un único lugar para que no haya
// strings de configuración repetidos por distintos archivos.
//
// `appId`/`appSecret` son las credenciales de la App de Meta (no las de
// una cuenta publicitaria puntual, ver ../types/credentials.types.ts).
// Quien construya este objeto es responsable de nunca exponer `appSecret`
// a un cliente browser ni de loguearlo.

export interface MetaOAuthConfig {
  /** App ID de la aplicación de Meta registrada. */
  appId: string
  /** App Secret de la aplicación de Meta. Nunca debe llegar al navegador
   *  ni aparecer en logs. */
  appSecret: string
  /** Versión de Graph API / Marketing API a usar, p. ej. "v21.0". */
  apiVersion: string
  /** Redirect URI registrada en la app de Meta. Es fija por proveedor:
   *  Meta exige que sea idéntica en el paso de autorización y en el
   *  intercambio de código por token, así que se centraliza acá en vez
   *  de re-derivarla por request. */
  redirectUri: string
  /** Base URL del dialog de autorización. Sobrescribible para testing.
   *  Default: "https://www.facebook.com". */
  authBaseUrl?: string
  /** Base URL de Graph API para el endpoint de token. Sobrescribible para
   *  testing. Default: "https://graph.facebook.com". */
  tokenBaseUrl?: string
  /** Tiempo de vida, en ms, de un `state` firmado antes de considerarse
   *  expirado. Default: 10 minutos. */
  stateTtlMs?: number
}

export const META_OAUTH_DEFAULT_AUTH_BASE_URL = 'https://www.facebook.com'
export const META_OAUTH_DEFAULT_TOKEN_BASE_URL = 'https://graph.facebook.com'
export const META_OAUTH_DEFAULT_STATE_TTL_MS = 10 * 60 * 1000
