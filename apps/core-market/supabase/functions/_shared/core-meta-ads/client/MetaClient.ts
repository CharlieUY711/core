// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/client/MetaClient.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/client/MetaClient.ts
//
// Contrato base para un cliente de Graph API / Marketing API. Esta fase
// define únicamente la forma; no hay ningún `fetch()` real todavía.
// La implementación concreta (Fase futura) es la única pieza que sabe de
// HTTP, versión de API, rate limits, etc.

import type { MetaApiResult, MetaPage } from '../types/api.types.ts'

export interface MetaClientConfig {
  /** Versión de Graph API / Marketing API, p. ej. "v21.0". */
  apiVersion: string
  /** Base URL, sobrescribible para testing. Default esperado:
   *  `https://graph.facebook.com`. */
  baseUrl?: string
}

export type MetaHttpMethod = 'GET' | 'POST' | 'DELETE'

export interface MetaRequestOptions {
  /** Path relativo al recurso, sin incluir versión ni base URL. */
  path: string
  method: MetaHttpMethod
  /** Query params (GET) o parámetros adicionales de la operación. */
  params?: Record<string, string | number | boolean>
  /** Body de la operación (POST). */
  body?: Record<string, unknown>
  /** Token de acceso a usar en esta llamada puntual. */
  accessToken: string
}

/**
 * Contrato mínimo de cliente HTTP hacia Meta. Deliberadamente sin
 * implementación: define qué operaciones debe soportar (get/post/delete +
 * una variante paginada), no cómo se resuelven.
 */
export interface MetaClient {
  get<T>(options: Omit<MetaRequestOptions, 'method'>): Promise<MetaApiResult<T>>
  post<T>(options: Omit<MetaRequestOptions, 'method'>): Promise<MetaApiResult<T>>
  delete<T>(options: Omit<MetaRequestOptions, 'method'>): Promise<MetaApiResult<T>>
  /** Variante de `get` para recursos que devuelven listados paginados. */
  getPage<T>(options: Omit<MetaRequestOptions, 'method'>): Promise<MetaApiResult<MetaPage<T>>>
}
