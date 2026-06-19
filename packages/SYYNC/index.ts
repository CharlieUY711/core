// =============================================================================
// apps/core-market/supabase/functions/ml-sync/index.ts
//
// Sincronización en lote de listings ML activos.
// Procesa catalog_listings donde channel = 'ML' y status IN ('pending','error')
// para intentar publicar/actualizar, y los listings 'active' para refrescar
// precio y stock si cambiaron.
//
// Invocación:
//   - Cron (pg_cron o Supabase scheduled function) — no requiere body
//   - POST manual con body { listing_ids: string[] } para forzar un subconjunto
//   - POST manual con body { action: 'refresh_price' | 'refresh_stock', listing_ids?: string[] }
//
// Runtime: Deno / Supabase Edge Functions
// Imports por ruta relativa — NO usar workspace:* (no resuelven en Deno)
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TokenManager } from '../../../../../packages/core-mlmp/src/TokenManager.ts'
import { MLVaultService } from '../../../../../packages/core-mlmp/src/MLVaultService.ts'
import { MLModuleError } from '../../../../../packages/core-mlmp/src/MLModuleError.ts'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type SyncAction = 'publish' | 'refresh_price' | 'refresh_stock' | 'full_refresh'

interface SyncRequest {
  action?:      SyncAction
  listing_ids?: string[]
  currency?:    string    // default 'ARS'
  country?:     string    // default 'AR'
  price_list?:  string | null
  campaign?:    string | null
}

interface ListingRow {
  listing_id:      string
  variant_id:      string
  item_id:         string
  sku:             string
  item_title:      string
  item_description: string | null
  item_status:     string
  variant_status:  string
  listing_status:  string
  external_id:     string | null
  channel_attrs:   Record<string, unknown>
  total_available: number
  cost_price:      number | null
}

interface SyncResult {
  listing_id:  string
  external_id: string | null
  action:      string
  result:      'success' | 'error' | 'skipped'
  reason?:     string
  http_status?: number
}

const ML_API = 'https://api.mercadolibre.com'
const BATCH_SIZE = 20   // ML no tiene rate limit duro documentado, pero 20 paralelas es conservador
const DEFAULT_CURRENCY = 'ARS'
const DEFAULT_COUNTRY  = 'AR'

// ─── ML API helper ───────────────────────────────────────────────────────────

async function mlRequest(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  token: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${ML_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

// ─── Resolver precio ─────────────────────────────────────────────────────────

async function resolvePrice(
  supabase:    SupabaseClient,
  variant_id:  string,
  currency:    string,
  country:     string,
  price_list:  string | null,
  campaign:    string | null
): Promise<number | null> {
  const { data, error } = await supabase.rpc('resolve_price', {
    p_variant_id: variant_id,
    p_currency:   currency,
    p_channel:    'ML',
    p_country:    country,
    p_campaign:   campaign,
    p_price_list: price_list,
    p_at:         new Date().toISOString(),
  })
  if (error || data == null) return null
  return Number(data)
}

// ─── Construir payload ML ────────────────────────────────────────────────────

function buildPublishPayload(
  row:   ListingRow,
  price: number
): Record<string, unknown> {
  const ch = row.channel_attrs

  if (!ch.category_id) {
    throw new Error('channel_attrs.category_id es obligatorio para publicar en ML')
  }

  return {
    title:              row.item_title,
    category_id:        ch.category_id,
    price,
    currency_id:        ch.currency_id ?? DEFAULT_CURRENCY,
    available_quantity: row.total_available,
    buying_mode:        ch.buying_mode        ?? 'buy_it_now',
    listing_type_id:    ch.listing_type_id    ?? 'gold_special',
    condition:          ch.condition          ?? 'new',
    ...(row.item_description ? { description: { plain_text: row.item_description } } : {}),
    ...(ch.attributes   ? { attributes: ch.attributes }   : {}),
    ...(ch.pictures     ? { pictures:   ch.pictures }     : {}),
  }
}

// ─── Procesar un listing ──────────────────────────────────────────────────────

async function processListing(
  supabase:   SupabaseClient,
  row:        ListingRow,
  token:      string,
  action:     SyncAction,
  currency:   string,
  country:    string,
  price_list: string | null,
  campaign:   string | null
): Promise<SyncResult> {
  const base: Omit<SyncResult, 'result' | 'reason' | 'http_status'> = {
    listing_id:  row.listing_id,
    external_id: row.external_id,
    action,
  }

  // Guardia: no sincronizar items inactivos
  if (row.item_status !== 'active' || row.variant_status !== 'active') {
    await supabase.from('catalog_listings').update({ status: 'paused' }).eq('id', row.listing_id)
    return { ...base, result: 'skipped', reason: `item_status=${row.item_status} variant_status=${row.variant_status}` }
  }

  // Marcar syncing
  await supabase.from('catalog_listings')
    .update({ status: 'syncing', last_error: null })
    .eq('id', row.listing_id)

  // ── Acción: publish (nuevo) o update (existente) ─────────────────────────
  if (action === 'publish' || !row.external_id) {
    const price = await resolvePrice(supabase, row.variant_id, currency, country, price_list, campaign)

    if (price == null) {
      await supabase.from('catalog_listings').update({ status: 'error', last_error: 'Sin precio configurado' }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, 'create', 'error', undefined, undefined, undefined, 'NO_PRICE')
      return { ...base, result: 'error', reason: 'NO_PRICE' }
    }

    let mlPayload: Record<string, unknown>
    try {
      mlPayload = buildPublishPayload(row, price)
    } catch (e) {
      await supabase.from('catalog_listings').update({ status: 'error', last_error: String(e) }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, 'create', 'error', undefined, undefined, undefined, 'PAYLOAD_ERROR')
      return { ...base, result: 'error', reason: `PAYLOAD_ERROR: ${e}` }
    }

    const isNew = !row.external_id
    const mlRes = isNew
      ? await mlRequest('POST', '/items', token, mlPayload)
      : await mlRequest('PUT', `/items/${row.external_id}`, token, {
          price,
          available_quantity: row.total_available,
          title:              row.item_title,
          ...(row.item_description ? { description: { plain_text: row.item_description } } : {}),
        })

    const mlData = mlRes.data as Record<string, unknown>

    if (mlRes.ok) {
      const external_id = (mlData.id as string) ?? row.external_id
      const updatedAttrs = {
        ...row.channel_attrs,
        ...(mlData.permalink ? { permalink: mlData.permalink } : {}),
        ...(mlData.thumbnail  ? { thumbnail:  mlData.thumbnail  } : {}),
      }
      await supabase.from('catalog_listings').update({
        external_id,
        status:        'active',
        last_error:    null,
        synced_at:     new Date().toISOString(),
        channel_attrs: updatedAttrs,
      }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, isNew ? 'create' : 'update', 'success', mlRes.status, mlPayload, mlData)
      return { ...base, external_id, result: 'success', http_status: mlRes.status }
    } else {
      const errMsg = (mlData?.message as string) ?? `ML HTTP ${mlRes.status}`
      await supabase.from('catalog_listings').update({ status: 'error', last_error: errMsg }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, isNew ? 'create' : 'update', 'error', mlRes.status, mlPayload, mlData, mlData?.error as string)
      return { ...base, result: 'error', reason: errMsg, http_status: mlRes.status }
    }
  }

  // ── Acción: refresh_price ────────────────────────────────────────────────
  if (action === 'refresh_price') {
    if (!row.external_id) {
      return { ...base, result: 'skipped', reason: 'Sin external_id — usar publish primero' }
    }

    const price = await resolvePrice(supabase, row.variant_id, currency, country, price_list, campaign)
    if (price == null) {
      await supabase.from('catalog_listings').update({ status: 'error', last_error: 'Sin precio configurado' }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, 'refresh_price', 'error', undefined, undefined, undefined, 'NO_PRICE')
      return { ...base, result: 'error', reason: 'NO_PRICE' }
    }

    const mlRes = await mlRequest('PUT', `/items/${row.external_id}`, token, { price })

    if (mlRes.ok) {
      await supabase.from('catalog_listings').update({ status: 'active', last_error: null, synced_at: new Date().toISOString() }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, 'refresh_price', 'success', mlRes.status, { price }, mlRes.data)
      return { ...base, result: 'success', http_status: mlRes.status }
    } else {
      const mlData = mlRes.data as Record<string, unknown>
      const errMsg = (mlData?.message as string) ?? `ML HTTP ${mlRes.status}`
      await supabase.from('catalog_listings').update({ status: 'error', last_error: errMsg }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, 'refresh_price', 'error', mlRes.status, { price }, mlData, mlData?.error as string)
      return { ...base, result: 'error', reason: errMsg, http_status: mlRes.status }
    }
  }

  // ── Acción: refresh_stock ────────────────────────────────────────────────
  if (action === 'refresh_stock') {
    if (!row.external_id) {
      return { ...base, result: 'skipped', reason: 'Sin external_id — usar publish primero' }
    }

    const mlRes = await mlRequest('PUT', `/items/${row.external_id}`, token, {
      available_quantity: row.total_available,
    })

    if (mlRes.ok) {
      await supabase.from('catalog_listings').update({ status: 'active', last_error: null, synced_at: new Date().toISOString() }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, 'refresh_stock', 'success', mlRes.status, { available_quantity: row.total_available }, mlRes.data)
      return { ...base, result: 'success', http_status: mlRes.status }
    } else {
      const mlData = mlRes.data as Record<string, unknown>
      const errMsg = (mlData?.message as string) ?? `ML HTTP ${mlRes.status}`
      await supabase.from('catalog_listings').update({ status: 'error', last_error: errMsg }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, 'refresh_stock', 'error', mlRes.status, { available_quantity: row.total_available }, mlData, mlData?.error as string)
      return { ...base, result: 'error', reason: errMsg, http_status: mlRes.status }
    }
  }

  // ── Acción: full_refresh (precio + stock en un solo PUT) ─────────────────
  if (action === 'full_refresh') {
    if (!row.external_id) {
      return { ...base, result: 'skipped', reason: 'Sin external_id — usar publish primero' }
    }

    const price = await resolvePrice(supabase, row.variant_id, currency, country, price_list, campaign)
    if (price == null) {
      return { ...base, result: 'error', reason: 'NO_PRICE' }
    }

    const updatePayload = {
      price,
      available_quantity: row.total_available,
      title:              row.item_title,
      ...(row.item_description ? { description: { plain_text: row.item_description } } : {}),
    }

    const mlRes = await mlRequest('PUT', `/items/${row.external_id}`, token, updatePayload)

    if (mlRes.ok) {
      await supabase.from('catalog_listings').update({ status: 'active', last_error: null, synced_at: new Date().toISOString() }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, 'update', 'success', mlRes.status, updatePayload, mlRes.data)
      return { ...base, result: 'success', http_status: mlRes.status }
    } else {
      const mlData = mlRes.data as Record<string, unknown>
      const errMsg = (mlData?.message as string) ?? `ML HTTP ${mlRes.status}`
      await supabase.from('catalog_listings').update({ status: 'error', last_error: errMsg }).eq('id', row.listing_id)
      await logSync(supabase, row.listing_id, 'update', 'error', mlRes.status, updatePayload, mlData, mlData?.error as string)
      return { ...base, result: 'error', reason: errMsg, http_status: mlRes.status }
    }
  }

  return { ...base, result: 'skipped', reason: `Acción desconocida: ${action}` }
}

// ─── Log helper ───────────────────────────────────────────────────────────────

async function logSync(
  supabase:    SupabaseClient,
  listing_id:  string,
  action:      string,
  result:      'success' | 'error' | 'skipped',
  http_status?: number,
  payload?:    unknown,
  response?:   unknown,
  error_code?: string
) {
  await supabase.from('catalog_sync_log').insert({
    listing_id,
    action,
    result,
    http_status:  http_status ?? null,
    payload:      payload     ?? null,
    response:     response    ?? null,
    error_code:   error_code  ?? null,
  })
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // ml-sync puede ser invocado por cron (sin auth de usuario) usando service role,
  // o manualmente por un admin con JWT.
  // Se acepta SUPABASE_SERVICE_ROLE_KEY en header X-Service-Token para cron jobs.

  const serviceToken = req.headers.get('X-Service-Token')
  const authHeader   = req.headers.get('Authorization')

  let supabase: SupabaseClient
  let storeId:  string

  if (serviceToken === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    // Cron / sistema — necesita store_id en el body
    supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    // store_id vendrá del body en invocaciones programáticas
    storeId = '' // se resolverá desde body abajo
  } else if (authHeader) {
    supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    storeId = user.app_metadata?.store_id as string
    if (!storeId) {
      return new Response(JSON.stringify({ error: 'store_id no encontrado en JWT' }), { status: 401 })
    }
  } else {
    return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: SyncRequest = {}
  try {
    body = req.method === 'POST' ? await req.json() : {}
  } catch { /* sin body = sync completo */ }

  const action:     SyncAction    = body.action     ?? 'publish'
  const currency:   string        = body.currency   ?? DEFAULT_CURRENCY
  const country:    string        = body.country    ?? DEFAULT_COUNTRY
  const price_list: string | null = body.price_list ?? null
  const campaign:   string | null = body.campaign   ?? null

  // store_id desde body si vino por service token (cron)
  if (!storeId) {
    storeId = (body as Record<string, unknown>).store_id as string
    if (!storeId) {
      return new Response(JSON.stringify({ error: 'store_id requerido en body para invocaciones de servicio' }), { status: 400 })
    }
  }

  // ── Cargar listings a procesar ───────────────────────────────────────────────
  // Usamos v_catalog_listings_priced que ya filtra por tenant via RLS / tenant_id
  let query = supabase
    .from('v_catalog_listings_priced')
    .select('*')
    .eq('channel', 'ML')

  if (body.listing_ids?.length) {
    query = query.in('listing_id', body.listing_ids)
  } else {
    // Sin lista explícita: procesar según la acción
    if (action === 'publish') {
      query = query.in('listing_status', ['pending', 'error'])
    } else {
      // refresh_* y full_refresh: procesar activos
      query = query.eq('listing_status', 'active')
    }
  }

  const { data: rows, error: rowsError } = await query.returns<ListingRow[]>()

  if (rowsError) {
    return new Response(
      JSON.stringify({ error: 'Error al cargar listings', detail: rowsError.message }),
      { status: 500 }
    )
  }

  if (!rows || rows.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, processed: 0, results: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Token ML (una sola vez para toda la sesión) ──────────────────────────────
  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const vault   = new MLVaultService(supabaseService)
  const manager = new TokenManager(vault)

  let mlToken: string
  try {
    mlToken = await manager.getMLToken(storeId)
  } catch (e) {
    const code = e instanceof MLModuleError ? e.code : 'UNKNOWN'
    return new Response(
      JSON.stringify({ error: 'No se pudo obtener token ML', code }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Procesar en batches ──────────────────────────────────────────────────────
  const results: SyncResult[] = []

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map(row =>
        processListing(supabase, row, mlToken, action, currency, country, price_list, campaign)
      )
    )

    for (const settled of batchResults) {
      if (settled.status === 'fulfilled') {
        results.push(settled.value)
      } else {
        // Error no capturado dentro de processListing (no debería pasar)
        results.push({
          listing_id:  'unknown',
          external_id: null,
          action,
          result:      'error',
          reason:      String(settled.reason),
        })
      }
    }
  }

  // ── Resumen ──────────────────────────────────────────────────────────────────
  const summary = {
    processed: results.length,
    success:   results.filter(r => r.result === 'success').length,
    error:     results.filter(r => r.result === 'error').length,
    skipped:   results.filter(r => r.result === 'skipped').length,
  }

  return new Response(
    JSON.stringify({ ok: true, ...summary, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
