// =============================================================================
// apps/core-market/supabase/functions/publicar-en-ml/index.ts
//
// Publica o actualiza una variante en MercadoLibre.
// Lee de: catalog_items, catalog_variants, catalog_listings, catalog_prices
// Escribe en: catalog_listings (external_id, status, channel_attrs, synced_at)
//             catalog_sync_log
//
// Runtime: Deno / Supabase Edge Functions
// Imports por ruta relativa — NO usar workspace:* (no resuelven en Deno)
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TokenManager } from '../../../../../packages/core-mlmp/src/TokenManager.ts'
import { MLVaultService } from '../../../../../packages/core-mlmp/src/MLVaultService.ts'
import { MLModuleError } from '../../../../../packages/core-mlmp/src/MLModuleError.ts'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PublicarPayload {
  listing_id: string       // catalog_listings.id — la fila ya debe existir con status pending
  currency: string         // 'ARS' | 'UYU' | 'USD' — obligatorio para resolve_price
  country?: string         // 'AR' | 'UY' — para resolve_price, default 'AR'
  price_list?: string      // lista de precios a usar, default null (general)
  campaign?: string        // campaña activa, default null
}

interface VariantRow {
  variant_id: string
  sku: string
  barcode: string | null
  variant_attrs: Record<string, unknown>
  item_id: string
  item_title: string
  item_description: string | null
  item_status: string
  tags: string[]
  total_available: number
  channel_attrs: Record<string, unknown>  // de catalog_listings
  external_id: string | null
  listing_status: string
}

// ─── ML API helpers ──────────────────────────────────────────────────────────

const ML_API = 'https://api.mercadolibre.com'

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

// Construye el payload para ML a partir de los datos del catálogo.
// Todo lo específico de ML vive en channel_attrs (category_id, listing_type,
// condition, pictures, etc.) — se mezcla con los campos canónicos del catálogo.
function buildMLPayload(
  row: VariantRow,
  price: number,
  stock: number
): Record<string, unknown> {
  const ch = row.channel_attrs as Record<string, unknown>

  if (!ch.category_id) {
    throw new Error('channel_attrs.category_id es obligatorio para publicar en ML')
  }

  return {
    title:        row.item_title,
    category_id:  ch.category_id,
    price,
    currency_id:  ch.currency_id ?? 'ARS',   // ML usa currency_id en su payload
    available_quantity: stock,
    buying_mode:  ch.buying_mode  ?? 'buy_it_now',
    listing_type_id: ch.listing_type_id ?? 'gold_special',
    condition:    ch.condition    ?? 'new',
    description:  row.item_description ? { plain_text: row.item_description } : undefined,
    // Atributos extra (color, talle, etc.) si el canal los definió
    ...(ch.attributes ? { attributes: ch.attributes } : {}),
    // Imágenes: se espera channel_attrs.pictures = [{ source: url }]
    ...(ch.pictures   ? { pictures: ch.pictures }     : {}),
    // Cualquier otro campo ML-específico que venga en channel_attrs pasa directo
    // (excepto los que ya tomamos arriba para evitar duplicados)
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let payload: PublicarPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { listing_id, currency, country = 'AR', price_list = null, campaign = null } = payload

  if (!listing_id || !currency) {
    return new Response(
      JSON.stringify({ error: 'listing_id y currency son obligatorios' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Cargar datos del listing ─────────────────────────────────────────────────
  const { data: row, error: rowError } = await supabase
    .from('v_catalog_listings_priced')
    .select('*')
    .eq('listing_id', listing_id)
    .eq('channel', 'ML')
    .single<VariantRow>()

  if (rowError || !row) {
    return new Response(
      JSON.stringify({ error: 'Listing no encontrado o no pertenece al canal ML', detail: rowError?.message }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (row.item_status !== 'active') {
    return new Response(
      JSON.stringify({ error: `No se puede publicar: item status es '${row.item_status}'` }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Marcar listing como syncing ──────────────────────────────────────────────
  await supabase
    .from('catalog_listings')
    .update({ status: 'syncing', last_error: null })
    .eq('id', listing_id)

  // ── Resolver precio via DB function ─────────────────────────────────────────
  const { data: priceResult, error: priceError } = await supabase
    .rpc('resolve_price', {
      p_variant_id: row.variant_id,
      p_currency:   currency,
      p_channel:    'ML',
      p_country:    country,
      p_campaign:   campaign,
      p_price_list: price_list,
      p_at:         new Date().toISOString(),
    })

  if (priceError || priceResult == null) {
    // Sin precio → no se puede publicar. Revertir a pending + loguear.
    await supabase.from('catalog_listings').update({ status: 'error', last_error: 'Sin precio configurado' }).eq('id', listing_id)
    await supabase.from('catalog_sync_log').insert({
      listing_id,
      action:     'create',
      result:     'error',
      error_code: 'NO_PRICE',
      response:   { detail: priceError?.message ?? 'resolve_price devolvió null' },
    })
    return new Response(
      JSON.stringify({ error: 'No hay precio configurado para esta variante/canal/moneda' }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const resolvedPrice = Number(priceResult)

  // ── Token ML ─────────────────────────────────────────────────────────────────
  // store_id viene del JWT claim (ver TokenManager / MLVaultService)
  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) {
    return new Response(JSON.stringify({ error: 'store_id no encontrado en JWT' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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
    await supabase.from('catalog_listings').update({ status: 'error', last_error: `Token error: ${code}` }).eq('id', listing_id)
    await supabase.from('catalog_sync_log').insert({
      listing_id,
      action:     'create',
      result:     'error',
      error_code: code,
      response:   { message: String(e) },
    })
    return new Response(
      JSON.stringify({ error: 'No se pudo obtener token ML', code }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Llamada a ML API ─────────────────────────────────────────────────────────
  const isUpdate   = Boolean(row.external_id)
  const action     = isUpdate ? 'update' : 'create'
  let   mlPayload: Record<string, unknown>
  let   mlResponse: { ok: boolean; status: number; data: unknown }

  try {
    mlPayload = buildMLPayload(row, resolvedPrice, row.total_available)
  } catch (e) {
    await supabase.from('catalog_listings').update({ status: 'error', last_error: String(e) }).eq('id', listing_id)
    await supabase.from('catalog_sync_log').insert({
      listing_id,
      action,
      result:     'error',
      error_code: 'PAYLOAD_ERROR',
      response:   { message: String(e) },
    })
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (isUpdate) {
    // PUT /items/{id} — solo precio, stock y campos actualizables
    // Para updates parciales ML acepta solo los campos que cambiaron
    const updatePayload = {
      price:              resolvedPrice,
      available_quantity: row.total_available,
      // title y description también se pueden actualizar
      title:              row.item_title,
      ...(row.item_description ? { description: { plain_text: row.item_description } } : {}),
    }
    mlResponse = await mlRequest('PUT', `/items/${row.external_id}`, mlToken, updatePayload)
  } else {
    mlResponse = await mlRequest('POST', '/items', mlToken, mlPayload)
  }

  // ── Persistir resultado ──────────────────────────────────────────────────────
  const syncLogBase = {
    listing_id,
    action,
    http_status: mlResponse.status,
    payload:     mlPayload,
    response:    mlResponse.data as Record<string, unknown>,
  }

  if (mlResponse.ok) {
    const mlData = mlResponse.data as Record<string, unknown>
    const external_id = (mlData.id as string) ?? row.external_id

    // Preservar channel_attrs existentes + agregar/actualizar permalink si viene
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
    }).eq('id', listing_id)

    await supabase.from('catalog_sync_log').insert({
      ...syncLogBase,
      result: 'success',
    })

    return new Response(
      JSON.stringify({ ok: true, listing_id, external_id, price: resolvedPrice }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } else {
    const errBody = mlResponse.data as Record<string, unknown>
    const errMsg  = (errBody?.message as string) ?? `ML HTTP ${mlResponse.status}`

    await supabase.from('catalog_listings').update({
      status:     'error',
      last_error: errMsg,
    }).eq('id', listing_id)

    await supabase.from('catalog_sync_log').insert({
      ...syncLogBase,
      result:     'error',
      error_code: (errBody?.error as string) ?? 'ML_ERROR',
    })

    return new Response(
      JSON.stringify({ error: errMsg, ml_response: errBody }),
      { status: mlResponse.status >= 500 ? 502 : 422, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
