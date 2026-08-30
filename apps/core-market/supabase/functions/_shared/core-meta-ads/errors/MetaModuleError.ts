// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/errors/MetaModuleError.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/errors/MetaModuleError.ts
//
// Error propio de core-meta. Ningún consumidor debe tener que capturar
// errores específicos de Market (ni de ningún otro consumidor) para
// manejar fallas de este módulo — todo pasa por esta clase.

export type MetaModuleErrorCategory =
  | 'authentication' // OAuth/login con Meta falló o no se completó
  | 'authorization'  // la operación no está permitida para esta credencial/cuenta
  | 'credentials'    // faltan credenciales, están incompletas o el provider falló
  | 'meta_api'       // Graph API / Marketing API devolvió un error
  | 'rate_limit'     // límite de tasa de Meta alcanzado
  | 'validation'     // input inválido antes de llamar a Meta
  | 'configuration'  // configuración del módulo o del cliente incorrecta

export class MetaModuleError extends Error {
  readonly category: MetaModuleErrorCategory
  /** Causa original, si la hay (p. ej. el MetaApiError crudo o una excepción
   *  de red). Opcional y deliberadamente no tipado a nada de Meta API para
   *  no acoplar el error interno al shape externo.
   *
   *  Lleva `override` porque `Error.cause` existe en lib ES2022+, que es lo
   *  que usa el runtime real de la copia server-side (Deno / Edge
   *  Functions). Sin esto, `deno check` falla con TS4114. */
  override readonly cause?: unknown

  constructor(category: MetaModuleErrorCategory, message: string, cause?: unknown) {
    super(message)
    this.name = 'MetaModuleError'
    this.category = category
    this.cause = cause
  }
}
