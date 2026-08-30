// COPIA VENDORIZADA PARA DENO / EDGE FUNCTIONS — NO EDITAR ACA.
// Fuente de verdad: packages/core-meta-ads/ads/HttpMetaInsightsReader.ts
// Unica diferencia permitida respecto del original: los imports
// relativos llevan extension ".ts" (requisito de Deno). Mismo patron de
// vendorizado que _shared/core-mlmp/. Si cambia el paquete, re-copiar.
//
// src/ads/HttpMetaInsightsReader.ts
//
// Implementación concreta de `MetaInsightsReader` (ver ./insights.ts)
// contra Meta Marketing API, usando `MetaClient` para el transporte. No
// resuelve credenciales ni sabe de dónde vienen: recibe `MetaAdsCredentials`
// ya resueltas, tal como define el contrato de Fase 2. No hace `fetch()`
// directo — toda llamada HTTP pasa por `MetaClient`.
//
// El contrato de `getInsights` devuelve un array plano (no un `MetaPage`),
// pero el edge `/insights` de Marketing API sí pagina. Para no perder datos
// silenciosamente en rangos de fechas amplios, este reader sigue los
// cursores de página internamente y concatena el resultado antes de
// devolverlo — sin exponer paginación en la firma pública, que ya está
// fijada por el contrato de Fase 2.

import type { MetaClient } from '../client/MetaClient.ts'
import type { MetaAdsCredentials } from '../types/credentials.types.ts'
import type { MetaInsight } from '../types/ads.types.ts'
import type { MetaApiResult } from '../types/api.types.ts'
import type { MetaInsightsDateRange, MetaInsightsReader, MetaInsightsRef } from './insights.ts'
import { toNumberOrZero } from './internal/normalize.ts'

const INSIGHTS_FIELDS = 'spend,impressions,reach,account_currency,date_start,date_stop'

/** Tope de páginas a seguir por consulta. Es una salvaguarda defensiva
 *  contra un cursor de paginación mal formado en la respuesta de Meta, no
 *  un límite de negocio: en el uso esperado (un rango acotado de fechas,
 *  sin `time_increment`) el edge de insights devuelve una sola página. */
const MAX_INSIGHT_PAGES = 50

/** Shape crudo de una fila de insights tal como la devuelve Marketing API
 *  para los campos solicitados en `INSIGHTS_FIELDS`. */
interface RawMetaInsightRow {
  spend?: string
  impressions?: string
  reach?: string
  account_currency?: string
  date_start?: string
  date_stop?: string
}

function toMetaInsight(raw: RawMetaInsightRow, ref: MetaInsightsRef, range: MetaInsightsDateRange): MetaInsight {
  return {
    entityId: ref.entityId,
    entityType: ref.entityType,
    dateStart: raw.date_start ?? range.since,
    dateStop: raw.date_stop ?? range.until,
    spend: toNumberOrZero(raw.spend),
    impressions: toNumberOrZero(raw.impressions),
    reach: toNumberOrZero(raw.reach),
    currency: raw.account_currency ?? '',
  }
}

/**
 * Implementación de `MetaInsightsReader` respaldada por un `MetaClient`
 * (típicamente `HttpMetaClient`). Lee el edge `/insights` de la entidad
 * indicada por `ref` (cuenta, campaign, ad set o ad) para el rango de
 * fechas dado.
 */
export class HttpMetaInsightsReader implements MetaInsightsReader {
  constructor(private readonly client: MetaClient) {}

  async getInsights(
    credentials: MetaAdsCredentials,
    ref: MetaInsightsRef,
    range: MetaInsightsDateRange
  ): Promise<MetaApiResult<MetaInsight[]>> {
    const rows: MetaInsight[] = []
    let after: string | undefined
    let pagesFetched = 0

    do {
      const result = await this.client.getPage<RawMetaInsightRow>({
        path: `${ref.entityId}/insights`,
        params: {
          fields: INSIGHTS_FIELDS,
          time_range: JSON.stringify({ since: range.since, until: range.until }),
          ...(after !== undefined ? { after } : {}),
        },
        accessToken: credentials.accessToken,
      })

      if (!result.ok || !result.data) {
        return { ok: false, error: result.error }
      }

      for (const raw of result.data.data) {
        rows.push(toMetaInsight(raw, ref, range))
      }

      after = result.data.nextCursor ?? undefined
      pagesFetched += 1
    } while (after && pagesFetched < MAX_INSIGHT_PAGES)

    return { ok: true, data: rows }
  }
}
