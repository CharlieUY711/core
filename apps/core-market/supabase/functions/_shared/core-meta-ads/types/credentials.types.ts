// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/types/credentials.types.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/types/credentials.types.ts
//
// Forma mínima de credenciales que core-meta necesita para operar contra
// Meta Marketing API. No dice nada sobre cómo se obtuvieron ni dónde se
// guardan — eso es responsabilidad de MetaCredentialProvider (ver
// ../credentials/MetaCredentialProvider.ts).

/**
 * Credenciales resueltas para una cuenta publicitaria de Meta puntual.
 * `appSecret` viaja acá porque algunas operaciones de Marketing API
 * (p. ej. verificación de firma, refresh de token) lo requieren, pero
 * ningún consumidor de core-meta debe exponer este objeto a un cliente
 * browser bajo ninguna circunstancia.
 */
export interface MetaAdsCredentials {
  /** App ID de la aplicación de Meta registrada. */
  appId: string
  /** App Secret de la aplicación de Meta. Nunca debe llegar al navegador. */
  appSecret: string
  /** Token de acceso vigente (usuario o sistema) para llamar a la API. */
  accessToken: string
  /** Cuenta publicitaria objetivo, formato `act_<id>`. */
  adAccountId: string
  /** Business Manager ID, cuando aplica. */
  businessId?: string | null
  /** Expiración del accessToken, ISO-8601. `null`/ausente si no se conoce. */
  expiresAt?: string | null
}

/**
 * Referencia mínima para pedir credenciales sin acoplar core-meta a un
 * modelo de tenant/tienda específico de ningún consumidor.
 */
export interface MetaAccountRef {
  /** Cuenta publicitaria de Meta, formato `act_<id>`. */
  adAccountId: string
  /** Identificador de tenant/tienda del consumidor. Opaco para core-meta:
   *  se reenvía tal cual al proveedor de credenciales concreto. */
  tenantId?: string | null
}
