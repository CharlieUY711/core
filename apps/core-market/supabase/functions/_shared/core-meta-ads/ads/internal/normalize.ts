// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/internal/normalize.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/internal/normalize.ts
//
// Helpers internos de normalización, usados únicamente por los Readers
// HTTP de ./ads. No se exportan desde ningún index del paquete: son un
// detalle de implementación del transporte, no parte del contrato público.
//
// Traducen formas "crudas" de Marketing API (status en mayúsculas, montos
// como string, códigos numéricos de cuenta) a los tipos de dominio ya
// definidos en ../../types/ads.types. No agregan campos nuevos al dominio.

import type { MetaEntityStatus } from '../../types/ads.types.ts'

const ENTITY_STATUS_MAP: Record<string, MetaEntityStatus> = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DELETED: 'deleted',
  ARCHIVED: 'archived',
}

/**
 * Normaliza el campo `status` de campaign/adset/ad (ACTIVE/PAUSED/DELETED/
 * ARCHIVED, tal como lo devuelve Marketing API) al `MetaEntityStatus`
 * reducido de core-meta. Cualquier valor no reconocido cae en 'unknown' en
 * vez de propagar el string crudo de Meta.
 */
export function normalizeEntityStatus(raw: string | undefined | null): MetaEntityStatus {
  if (!raw) return 'unknown'
  return ENTITY_STATUS_MAP[raw] ?? 'unknown'
}

/**
 * Ad accounts no usan `status`, usan `account_status` (entero). Solo se
 * mapean los códigos con equivalente directo en `MetaEntityStatus`; el
 * resto cae en 'unknown' — no vale la pena modelar cada código de Meta
 * (PENDING_RISK_REVIEW, IN_GRACE_PERIOD, etc.) en un dominio reducido.
 * Ver: https://developers.facebook.com/docs/marketing-api/reference/ad-account#fields
 */
const ACCOUNT_STATUS_MAP: Record<number, MetaEntityStatus> = {
  1: 'active', // ACTIVE
  101: 'deleted', // CLOSED
}

export function normalizeAccountStatus(raw: number | undefined | null): MetaEntityStatus {
  if (raw === undefined || raw === null) return 'unknown'
  return ACCOUNT_STATUS_MAP[raw] ?? 'unknown'
}

/**
 * Marketing API devuelve montos monetarios (daily_budget, lifetime_budget,
 * spend, etc.) como string. Convierte a number preservando el valor tal
 * como lo entrega Meta (sin asumir unidad); valores ausentes o no
 * numéricos devuelven `null` en vez de propagar `NaN`.
 */
export function toNullableNumber(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/** Igual que `toNullableNumber` pero para campos que siempre deberían estar
 *  presentes (p. ej. métricas de insights): ausencia/valor no numérico
 *  colapsa a 0 en vez de `null`, para no romper el tipo `number` del
 *  dominio (`MetaInsight.spend`, `.impressions`, `.reach`). */
export function toNumberOrZero(raw: string | number | undefined | null): number {
  return toNullableNumber(raw) ?? 0
}
