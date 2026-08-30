// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/types/api.types.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/types/api.types.ts
//
// Formas genéricas para envolver respuestas de Graph API / Marketing API.
// `MetaApiError` refleja el shape de error que Meta devuelve; es distinto
// de `MetaModuleError` (../errors), que es el error interno del módulo.

export interface MetaApiError {
  message: string
  type?: string
  code?: number
  errorSubcode?: number
  fbtraceId?: string
}

export interface MetaApiResult<T> {
  ok: boolean
  data?: T
  error?: MetaApiError
}

/** Página de resultados de un listado paginado de Graph API (cursor-based). */
export interface MetaPage<T> {
  data: T[]
  nextCursor?: string | null
  previousCursor?: string | null
}
