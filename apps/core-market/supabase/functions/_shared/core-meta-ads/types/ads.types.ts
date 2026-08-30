// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/types/ads.types.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/types/ads.types.ts
//
// Modelos mínimos del dominio Ads. Deliberadamente NO incluyen todos los
// campos que expone Marketing API — solo lo necesario para READ/WRITE de
// Fase 1/2. Se amplían cuando haya un consumidor real que lo necesite.

/** Estado normalizado, común a campaign/adset/ad. Meta usa varios valores
 *  de estado (ACTIVE, PAUSED, DELETED, ARCHIVED, y combinaciones de
 *  effective_status); esto es la versión reducida que core-meta expone. */
export type MetaEntityStatus = 'active' | 'paused' | 'deleted' | 'archived' | 'unknown'

export interface MetaAdAccount {
  /** Formato `act_<id>`. */
  id: string
  name: string
  currency: string
  status: MetaEntityStatus
}

export interface MetaCampaign {
  id: string
  accountId: string
  name: string
  status: MetaEntityStatus
  /** Objetivo de campaña (p. ej. "OUTCOME_TRAFFIC"). String abierto porque
   *  Meta agrega objetivos con el tiempo; no vale la pena mantener un enum. */
  objective: string
  dailyBudget?: number | null
  lifetimeBudget?: number | null
  createdAt: string
  updatedAt: string
}

export interface MetaAdSet {
  id: string
  campaignId: string
  name: string
  status: MetaEntityStatus
  dailyBudget?: number | null
  lifetimeBudget?: number | null
}

export interface MetaAd {
  id: string
  adSetId: string
  name: string
  status: MetaEntityStatus
}

/** Nivel de entidad al que aplica un conjunto de métricas. */
export type MetaInsightEntityType = 'account' | 'campaign' | 'adset' | 'ad'

export interface MetaInsight {
  entityId: string
  entityType: MetaInsightEntityType
  /** Rango de fechas del reporte, ISO-8601 (solo fecha). */
  dateStart: string
  dateStop: string
  spend: number
  impressions: number
  reach: number
  currency: string
}
