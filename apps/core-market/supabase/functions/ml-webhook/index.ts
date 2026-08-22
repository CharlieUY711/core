// =============================================================================
// apps/core-market/supabase/functions/ml-webhook/index.ts
//
// Recibe notificaciones push de MercadoLibre y las procesa.
//
// Tópicos manejados:
//   orders_v2  → crea orden interna + descuenta stock via catalog_adjust_inventory()
//   items      → detecta cambios de estado/precio en ML y actualiza catalog_listings
//
// Idempotencia: tabla ml_webhook_events deduplicada por event_id.
//
// Fuente de verdad de producto: catalog_listings.external_id = ml_item_id
// Fuente de verdad de stock:    catalog_inventory (via catalog_adjust_inventory RPC)
//
// Token ML: via TokenManager (vault) — NO usa ML_ACCESS_TOKEN en env.
//
// Imports por ruta relativa a _shared (Deno Edge no resuelve workspace:*)
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMLToken } from "../_shared/core-mlmp/TokenManager.ts";
import { MLModuleError } from "../_shared/core-mlmp/MLModuleError.ts";

const ML_API = "https://api.mercadolibre.com";
const CHANNEL = "mercadolibre";

serve(async (req: Request) => {
  // ML envía GET para verificar el endpoint al registrarlo
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  // Siempre responder 200 a ML para evitar reintentos innecesarios.
  // Los errores internos se loguean pero no se propagan como 5xx.
  try {
    const body = await req.json().catch(() => ({}));

    const event_id = String(body.id ?? body.resource ?? "");
    const topic    = body.topic    as string | undefined;
    const resource = body.resource as string | undefined;

    if (!event_id || !topic || !resource) {
      return ok({ status: "ignored_missing_fields" });
    }

    // Service role — webhook no tiene JWT de usuario
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // -- Idempotencia --------------------------------------------------------
    const { data: existing } = await supabase
      .from("ml_webhook_events")
      .select("id")
      .eq("event_id", event_id)
      .maybeSingle();

    if (existing) {
      return ok({ status: "ignored_duplicate" });
    }

    await supabase.from("ml_webhook_events").insert({
      event_id,
      topic,
      resource,
      processed: false,
    });

    // -- Dispatch por tópico -------------------------------------------------
    switch (topic) {
      case "orders_v2":
        await handleOrder(supabase, resource);
        break;
      case "items":
        await handleItem(supabase, resource);
        break;
      default:
        await supabase
          .from("ml_webhook_events")
          .update({ processed: true })
          .eq("event_id", event_id);
        return ok({ status: "ignored_topic", topic });
    }

    // Marcar evento como procesado
    await supabase
      .from("ml_webhook_events")
      .update({ processed: true })
      .eq("event_id", event_id);

    return ok({ status: "processed", topic });

  } catch (err) {
    // Log interno — ML igual recibe 200 para no reintentar
    console.error("[ml-webhook] Unhandled error:", err);
    return ok({ status: "error", message: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// handleOrder — procesa orders_v2
// Crea orden interna y descuenta stock via catalog_adjust_inventory()
// ---------------------------------------------------------------------------
async function handleOrder(
  supabase: ReturnType<typeof createClient>,
  resource: string
): Promise<void> {
  // Resolver storeId desde el external_id del item de la orden
  // Necesitamos el token ML — buscamos el primer storeId disponible
  // que tenga este item publicado en catalog_listings
  const mlOrder = await fetchMLResource(supabase, resource);
  if (!mlOrder) return;

  const orderItems = mlOrder.order_items as Array<{
    item: { id: string };
    quantity: number;
    unit_price: number;
    currency_id: string;
  }>;

  if (!orderItems?.length) return;

  // Procesar cada línea de la orden
  for (const orderItem of orderItems) {
    const mlItemId = orderItem.item.id;

    // Buscar variant local por external_id en catalog_listings
    const { data: listing } = await supabase
      .from("catalog_listings")
      .select(`
        id,
        variant_id,
        catalog_variants!inner (
          id,
          catalog_items!inner (
            tenant_id
          )
        )
      `)
      .eq("channel", CHANNEL)
      .eq("external_id", mlItemId)
      .maybeSingle();

    if (!listing) {
      console.warn(`[ml-webhook] No listing found for ml_item_id=${mlItemId}`);
      continue;
    }

    const variantId = listing.variant_id as string;
    const variant   = (listing as unknown as Record<string, unknown>)["catalog_variants"] as Record<string, unknown>;
    const item      = variant["catalog_items"] as Record<string, unknown>;
    const tenantId  = item["tenant_id"] as string;

    // Crear orden interna
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id:      tenantId,
        total:          orderItem.unit_price * orderItem.quantity,
        currency:       orderItem.currency_id,
        payment_status: "paid",
        source:         CHANNEL,
        meta: {
          ml_order_id: mlOrder.id,
          ml_item_id:  mlItemId,
        },
      })
      .select("id")
      .single();

    if (orderError) {
      console.error(`[ml-webhook] Error creating order:`, orderError);
      continue;
    }

    // Línea de orden
    await supabase.from("order_items").insert({
      order_id:   newOrder.id,
      variant_id: variantId,
      quantity:   orderItem.quantity,
      unit_price: orderItem.unit_price,
      currency:   orderItem.currency_id,
    });

    // Descontar stock en la primera location disponible
    // (en multi-location: elegir location por lógica de fulfillment)
    const { data: invRows } = await supabase
      .from("catalog_inventory")
      .select("location_id, available")
      .eq("variant_id", variantId)
      .order("available", { ascending: false })
      .limit(1);

    if (invRows?.length) {
      const locationId = (invRows[0] as { location_id: string }).location_id;
      const { error: stockError } = await supabase.rpc("catalog_adjust_inventory", {
        p_variant_id:  variantId,
        p_location_id: locationId,
        p_delta:       -orderItem.quantity,
        p_reason:      `ml_order_${mlOrder.id}`,
      });

      if (stockError) {
        console.error(`[ml-webhook] Stock adjustment failed:`, stockError);
        // No lanzar — la orden ya se creó, el stock se puede reconciliar
      }
    }

    // Log en catalog_sync_log
    await supabase.from("catalog_sync_log").insert({
      listing_id:  listing.id,
      action:      "refresh_stock",
      result:      "success",
      payload:     { ml_order_id: mlOrder.id, quantity: orderItem.quantity },
      response:    null,
      http_status: null,
    });
  }
}

// ---------------------------------------------------------------------------
// handleItem — procesa topic 'items'
// Detecta cambios de estado en ML y actualiza catalog_listings
// ---------------------------------------------------------------------------
async function handleItem(
  supabase: ReturnType<typeof createClient>,
  resource: string
): Promise<void> {
  // resource es algo como /items/MLA123456
  const mlItemId = resource.split("/").pop();
  if (!mlItemId) return;

  // Buscar listing local
  const { data: listing } = await supabase
    .from("catalog_listings")
    .select("id, status, variant_id")
    .eq("channel", CHANNEL)
    .eq("external_id", mlItemId)
    .maybeSingle();

  if (!listing) {
    console.warn(`[ml-webhook] No listing for item event ml_item_id=${mlItemId}`);
    return;
  }

  // Obtener estado actual del item en ML
  const mlItem = await fetchMLResource(supabase, resource);
  if (!mlItem) return;

  // Mapear status ML → catalog_listing_status
  const mlStatus = mlItem.status as string;
  const newStatus = mlStatusToListingStatus(mlStatus);

  if (newStatus && newStatus !== listing.status) {
    await supabase
      .from("catalog_listings")
      .update({
        status:    newStatus,
        synced_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    await supabase.from("catalog_sync_log").insert({
      listing_id:  listing.id,
      action:      "update",
      result:      "success",
      payload:     { ml_status: mlStatus },
      response:    null,
      http_status: null,
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch de un recurso de ML usando el token del primer tenant que tenga
 * credencial en el vault. Para webhooks que no llevan storeId en el payload.
 */
async function fetchMLResource(
  supabase: ReturnType<typeof createClient>,
  resource: string
): Promise<Record<string, unknown> | null> {
  // BUG CONFIRMADO (verificado contra supabase/schema/production_schema.sql):
  // esta funcion consultaba api_vault con `.eq("provider", "mercadolibre")`,
  // pero esa columna no existe -- la tabla real usa `platform`, con el
  // nombre capitalizado "MercadoLibre" (no el slug), ver
  // core-mlmp/MLVaultService.ts:nombrePlataforma. PostgREST rechaza un
  // filtro por columna inexistente, asi que `vaultRow` siempre daba
  // undefined y esta funcion SIEMPRE devolvia null para cualquier webhook
  // sin storeId en el payload.
  //
  // Esta query es un DESCUBRIMIENTO ("algun tenant que tenga credencial ML
  // propia"), no una resolucion de un tenant ya conocido -- por eso NO se
  // rutea por resolveCredential()/RESOLVE (DEC-011 SS5): RESOLVE toma
  // platform + tenantId opcional y devuelve esa fila o el fallback global;
  // no tiene un modo "elegime cualquier fila con tenant_id no nulo", y
  // inventarle ese modo ahora seria una abstraccion nueva no prevista por
  // el diseno. El fix minimo y correcto es arreglar el nombre/valor de
  // columna en esta query puntual. MLVaultService/TokenManager (que si
  // hacen tenant -> global correctamente) quedan intactos: son los que
  // entregan el access token via getMLToken() mas abajo.
  const { data: vaultRow, error: vaultErr } = await supabase
    .from("api_vault")
    .select("tenant_id")
    .eq("platform", "MercadoLibre")
    .eq("type", "oauth")
    .not("tenant_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (vaultErr) {
    console.error("[ml-webhook] Vault query error:", vaultErr.message);
    return null;
  }

  const storeId = vaultRow?.tenant_id as string | null;
  if (!storeId) {
    console.error("[ml-webhook] No ML credential found in vault");
    return null;
  }

  let token: string;
  try {
    token = await getMLToken(storeId);
  } catch (e) {
    const code = e instanceof MLModuleError ? e.code : "UNKNOWN";
    console.error(`[ml-webhook] Token error: ${code}`);
    return null;
  }

  const url = resource.startsWith("http") ? resource : `${ML_API}${resource}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    console.error(`[ml-webhook] ML fetch failed: ${resp.status} ${url}`);
    return null;
  }

  return resp.json();
}

function mlStatusToListingStatus(mlStatus: string): string | null {
  const map: Record<string, string> = {
    active:   "active",
    paused:   "paused",
    closed:   "delisted",
    inactive: "paused",
    under_review: "paused",
  };
  return map[mlStatus] ?? null;
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status:  200,
    headers: { "Content-Type": "application/json" },
  });
}
