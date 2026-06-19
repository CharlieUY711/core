// =============================================================================
// apps/core-market/supabase/functions/ml-sync/index.ts
//
// Sincronización batch desde MercadoLibre hacia catalog_*.
// Procesa catalog_listings con channel='mercadolibre' en estado
// pending/error/syncing (según body) y actualiza precio, stock y status.
//
// Flujo por listing:
//   1. GET /items/{external_id} a la API de ML
//   2. Compara precio y stock con lo que hay en catalog_*
//   3. Si hay diferencia → PUT /items/{id} con los valores locales
//      (el sistema local es fuente de verdad: ML se alinea a nosotros)
//   4. Registra resultado en catalog_sync_log
//
// Body esperado:
//   {
//     storeId?: string,           // opcional si viene en JWT
//     statuses?: string[],        // default: ['pending','error']
//     limit?: number,             // default: 50
//     priceContext?: {            // contexto para resolve_price
//       priceList?: string,
//       country?: string,
//       campaign?: string,
//       currency?: string,        // default: 'ARS'
//     }
//   }
//
// Diseñado para correr como cron (pg_cron o Supabase scheduled functions)
// o manualmente desde el dashboard.
//
// Imports por ruta relativa (Deno Edge no resuelve workspace:*)
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMLToken } from "../_shared/core-mlmp/TokenManager.ts";
import { MLModuleError } from "../_shared/core-mlmp/MLModuleError.ts";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface SyncBody {
  storeId?: string;
  statuses?: string[];
  limit?: number;
  priceContext?: {
    priceList?: string;
    country?: string;
    campaign?: string;
    currency?: string;
  };
}

interface ListingRow {
  id: string;
  external_id: string;
  channel_attrs: Record<string, unknown>;
  variant_id: string;
  sku: string;
  weight_g: number | null;
  item_title: string;
  item_description: string | null;
  tenant_id: string;
}

interface MLItem {
  id: string;
  price: number;
  available_quantity: number;
  status: string;
  [key: string]: unknown;
}

interface SyncResult {
  listingId: string;
  variantId: string;
  externalId: string;
  action: "refresh_price" | "refresh_stock" | "update" | "skipped";
  result: "success" | "error" | "skipped";
  detail?: string;
}

// ---------------------------------------------------------------------------
const ML_API = "https://api.mercadolibre.com";
const CHANNEL = "mercadolibre";

// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return json(null, 204);
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // -- Auth -----------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: SyncBody = {};
  try {
    body = await req.json();
  } catch { /* body vacío: usa defaults */ }

  const jwtClaim = user.user_metadata?.store_id ?? null;
  const storeId: string = jwtClaim ?? body.storeId ?? "";
  if (!storeId) return json({ error: "Cannot determine storeId" }, 400);

  const statuses = body.statuses ?? ["pending", "error"];
  const limit    = Math.min(body.limit ?? 50, 200); // techo de seguridad
  const ctx      = body.priceContext ?? {};
  const currency = ctx.currency ?? "ARS";

  // -- Token ML -------------------------------------------------------------
  let mlToken: string;
  try {
    mlToken = await getMLToken(storeId);
  } catch (e) {
    const code = e instanceof MLModuleError ? e.code : "UNKNOWN";
    return json({ error: "ML token error", code }, 502);
  }

  // -- Leer listings activos en el canal ------------------------------------
  // Join manual porque v_catalog_variants_full no expone listing data
  const { data: listings, error: listErr } = await supabase
    .from("catalog_listings")
    .select(`
      id,
      external_id,
      channel_attrs,
      variant_id,
      catalog_variants!inner (
        sku,
        weight_g,
        catalog_items!inner (
          title,
          description,
          tenant_id
        )
      )
    `)
    .eq("channel", CHANNEL)
    .in("status", statuses)
    .not("external_id", "is", null)
    .limit(limit);

  if (listErr) {
    return json({ error: "Failed to fetch listings", detail: listErr.message }, 500);
  }

  if (!listings || listings.length === 0) {
    return json({ ok: true, processed: 0, results: [] });
  }

  // Aplanar el join anidado de Supabase
  const rows: ListingRow[] = (listings as unknown[]).map((l: unknown) => {
    const row = l as Record<string, unknown>;
    const variant = row["catalog_variants"] as Record<string, unknown>;
    const item = variant["catalog_items"] as Record<string, unknown>;
    return {
      id:               row["id"] as string,
      external_id:      row["external_id"] as string,
      channel_attrs:    (row["channel_attrs"] ?? {}) as Record<string, unknown>,
      variant_id:       row["variant_id"] as string,
      sku:              variant["sku"] as string,
      weight_g:         variant["weight_g"] as number | null,
      item_title:       item["title"] as string,
      item_description: item["description"] as string | null,
      tenant_id:        item["tenant_id"] as string,
    };
  });

  // -- Procesar listings en paralelo (con límite de concurrencia) -----------
  const results: SyncResult[] = [];
  const CONCURRENCY = 5;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((row) => syncListing(supabase, row, mlToken, currency, ctx))
    );
    results.push(...batchResults);
  }

  const summary = {
    ok:        true,
    processed: results.length,
    success:   results.filter((r) => r.result === "success").length,
    error:     results.filter((r) => r.result === "error").length,
    skipped:   results.filter((r) => r.result === "skipped").length,
    results,
  };

  return json(summary);
});

// ---------------------------------------------------------------------------
// syncListing — procesa un listing individual
// ---------------------------------------------------------------------------
async function syncListing(
  supabase: ReturnType<typeof createClient>,
  row: ListingRow,
  mlToken: string,
  currency: string,
  ctx: SyncBody["priceContext"]
): Promise<SyncResult> {
  const base: Omit<SyncResult, "action" | "result" | "detail"> = {
    listingId:  row.id,
    variantId:  row.variant_id,
    externalId: row.external_id,
  };

  // 1. Resolver precio local ------------------------------------------------
  const { data: priceRow, error: priceErr } = await supabase.rpc(
    "resolve_price",
    {
      p_variant_id: row.variant_id,
      p_currency:   currency,
      p_channel:    CHANNEL,
      p_price_list: ctx?.priceList ?? null,
      p_country:    ctx?.country   ?? null,
      p_campaign:   ctx?.campaign  ?? null,
    }
  );

  if (priceErr || !priceRow || priceRow.amount == null) {
    await logSync(supabase, {
      listingId:  row.id,
      action:     "refresh_price",
      result:     "error",
      error:      `No price for variant ${row.variant_id} currency=${currency}`,
    });
    return { ...base, action: "refresh_price", result: "error", detail: "No price resolved" };
  }

  const localPrice: number = priceRow.amount;

  // 2. Leer stock local ------------------------------------------------------
  const { data: invRows } = await supabase
    .from("catalog_inventory")
    .select("available")
    .eq("variant_id", row.variant_id);

  const localStock: number = (invRows ?? []).reduce(
    (sum: number, r: { available: number }) => sum + (r.available ?? 0),
    0
  );

  // 3. Leer estado actual en ML ---------------------------------------------
  let mlItem: MLItem;
  try {
    const resp = await fetch(`${ML_API}/items/${row.external_id}`, {
      headers: { Authorization: `Bearer ${mlToken}` },
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      const detail = `ML GET ${row.external_id} → ${resp.status}`;
      await logSync(supabase, {
        listingId:  row.id,
        action:     "update",
        result:     "error",
        httpStatus: resp.status,
        response:   errBody,
        error:      detail,
      });
      await markListingError(supabase, row.id, detail);
      return { ...base, action: "update", result: "error", detail };
    }

    mlItem = await resp.json();
  } catch (e) {
    const detail = `Network error fetching ML item: ${(e as Error).message}`;
    await logSync(supabase, { listingId: row.id, action: "update", result: "error", error: detail });
    await markListingError(supabase, row.id, detail);
    return { ...base, action: "update", result: "error", detail };
  }

  // 4. Comparar y decidir acción -------------------------------------------
  const priceDiff = Math.abs(mlItem.price - localPrice) > 0.01;
  const stockDiff = mlItem.available_quantity !== localStock;

  if (!priceDiff && !stockDiff) {
    // Nada cambió — marcar como active si estaba en otro estado
    await supabase
      .from("catalog_listings")
      .update({ status: "active", last_error: null, synced_at: new Date().toISOString() })
      .eq("id", row.id);

    await logSync(supabase, { listingId: row.id, action: "update", result: "skipped" });
    return { ...base, action: "skipped", result: "skipped" };
  }

  // Determinar acción para el log (puede ser ambas, pero registramos la más relevante)
  const action: SyncResult["action"] = priceDiff && stockDiff
    ? "update"
    : priceDiff ? "refresh_price" : "refresh_stock";

  // 5. PUT /items/{id} con valores locales ----------------------------------
  const putPayload: Record<string, unknown> = {};
  if (priceDiff) putPayload.price = localPrice;
  if (stockDiff) putPayload.available_quantity = localStock;

  let putResp: Response;
  try {
    putResp = await fetch(`${ML_API}/items/${row.external_id}`, {
      method:  "PUT",
      headers: {
        Authorization:  `Bearer ${mlToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putPayload),
    });
  } catch (e) {
    const detail = `Network error updating ML item: ${(e as Error).message}`;
    await logSync(supabase, { listingId: row.id, action, result: "error", error: detail });
    await markListingError(supabase, row.id, detail);
    return { ...base, action, result: "error", detail };
  }

  const putBody = await putResp.json().catch(() => ({}));
  const success = putResp.status >= 200 && putResp.status < 300;

  await logSync(supabase, {
    listingId:  row.id,
    action,
    result:     success ? "success" : "error",
    httpStatus: putResp.status,
    payload:    putPayload,
    response:   putBody,
    error:      success ? null : (putBody.message ?? null),
  });

  if (success) {
    await supabase
      .from("catalog_listings")
      .update({
        status:     "active",
        last_error: null,
        synced_at:  new Date().toISOString(),
      })
      .eq("id", row.id);

    return { ...base, action, result: "success" };
  } else {
    await markListingError(supabase, row.id, putBody.message ?? `ML PUT ${putResp.status}`);
    return {
      ...base,
      action,
      result: "error",
      detail: putBody.message ?? `ML PUT returned ${putResp.status}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function markListingError(
  supabase: ReturnType<typeof createClient>,
  listingId: string,
  error: string
) {
  await supabase
    .from("catalog_listings")
    .update({ status: "error", last_error: error })
    .eq("id", listingId);
}

async function logSync(
  supabase: ReturnType<typeof createClient>,
  opts: {
    listingId:  string;
    action:     string;
    result:     string;
    httpStatus?: number;
    payload?:   unknown;
    response?:  unknown;
    error?:     string | null;
  }
) {
  await supabase.from("catalog_sync_log").insert({
    listing_id:  opts.listingId,
    action:      opts.action,
    result:      opts.result,
    http_status: opts.httpStatus ?? null,
    payload:     opts.payload   ?? null,
    response:    opts.response  ?? null,
    error_code:  opts.error     ?? null,
  });
}
