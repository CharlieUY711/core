// src/ads/operations.ts
//
// Únicas operaciones WRITE previstas para esta etapa del módulo:
// pausar, reactivar y modificar presupuesto de una campaña. Deliberadamente
// no incluye creación, eliminación ni ninguna operación fuera de ese
// alcance (ver restricciones de Fase 1).

import type { MetaAdsCredentials } from '../types/credentials.types'
import type { MetaEntityStatus } from '../types/ads.types'
import type { MetaApiResult } from '../types/api.types'

export interface MetaBudgetUpdate {
  dailyBudget?: number
  lifetimeBudget?: number
}

export interface MetaOperationResult {
  id: string
  status: MetaEntityStatus
}

export interface MetaCampaignOperations {
  pauseCampaign(
    credentials: MetaAdsCredentials,
    campaignId: string
  ): Promise<MetaApiResult<MetaOperationResult>>

  resumeCampaign(
    credentials: MetaAdsCredentials,
    campaignId: string
  ): Promise<MetaApiResult<MetaOperationResult>>

  updateBudget(
    credentials: MetaAdsCredentials,
    campaignId: string,
    budget: MetaBudgetUpdate
  ): Promise<MetaApiResult<MetaOperationResult>>
}
