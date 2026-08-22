// =============================================================================
// apps/core-market/supabase/functions/publicar-en-ml/index.ts
//
// Publica o actualiza una variante en MercadoLibre.
// Lee datos desde catalog_items + catalog_variants + catalog_listings +
// catalog_prices (vía resolve_price) + catalog_media.
//
// Flujo:
//   1. Valida JWT y extrae storeId
//   2. Lee variant + item + listing existente (si hay)
//   3. Resuelve precio vía resolve_price() para canal 'mercadolibre'
//   4. Si listing existe con external_id → PUT /items/{id} (update)
//      Si no → POST /items (create)
//   5. Actualiza catalog_listings con nuevo status + external_id
//   6. Inserta fila en catalog_sync_log
//
// Body esperado:
//   { variantId: string, storeId?: string }
//   (storeId es redundante si viene en el JWT, pero útil para service-role)
//
// Imports por ruta relativa (Deno Edge no resuelve workspace:*)
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMLToken } from "../_shared/core-mlmp/TokenManager.ts";
import { MLModuleError } from "../_shared/core-mlmp/MLModuleError.ts";

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------
interface PublicarBody {
  variantId: string;
  storeId?: string;
  /** Contexto de precio — todos opcionales, se usan como filtros en resolve_price */
  priceContext?: {
    priceList?: string;
    country?: string;
    campaign?: string;
    currency?: string; // default 'UYU' (cuenta MLU)
  };
}

interface ResolvedVariant {
  id: string;
  sku: string;
  barcode: string | null;
  attributes: Record<string, unknown>;
  weight_g: number | null;
  item_id: string;
  item_title: string;
  item_description: string | null;
  tags: string[];
  item_status: string;
  variant_status: string;
  tenant_id: string;
}

interface ResolvedListing {
  id: string;
  external_id: string | null;
  status: string;
  channel_attrs: Record<string, unknown>;
}

interface ResolvedPrice {
  amount: number;
  currency: string;
}

interface MediaRow {
  url: string;
  sort_order: number;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const ML_API = "https://api.mercadolibre.com";
const ML_SITE = Deno.env.get("ML_SITE_ID") ?? "MLU";

/**
 * Predictor de categoria de Mercado Libre.
 *
 * Mercado Libre exige category_id y rechaza la publicacion sin el
 * ("body.required_fields"). La categoria manual del listing manda siempre;
 * esto es el respaldo para cuando el articulo todavia no tiene una.
 *
 * Usa domain_discovery, el endpoint que ML expone justamente para esto: sugiere
 * la categoria a partir del titulo. La sugerencia se persiste en channel_attrs
 * para que quede visible y editable, y para no volver a adivinar en cada
 * intento: si la persona la corrige, su valor gana desde entonces.
 */
async function predecirCategoria(titulo: string, token: string): Promise<string | null> {
  try {
    const url = `${ML_API}/sites/${ML_SITE}/domain_discovery/search?limit=1&q=${encodeURIComponent(titulo)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return null;
    const datos = await resp.json();
    const primero = Array.isArray(datos) ? datos[0] : null;
    return primero?.category_id ?? null;
  } catch {
    return null;
  }
}
const CHANNEL = "mercadolibre";

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

/**
 * Lee un claim de la raiz del JWT. El custom access token hook emite `store_id`
 * ahi, no dentro de user_metadata: `supabase.auth.getUser()` devuelve el user,
 * y los claims de raiz no forman parte de ese objeto. Sin esto la funcion
 * respondia "Cannot determine storeId" pese a que el claim viajaba.
 */
function claimDeJwt(authHeader: string | null, clave: string): string | null {
  try {
    if (!authHeader) return null;
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const parte = token.split(".")[1];
    if (!parte) return null;
    const json = atob(parte.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    const v = payload?.[clave];
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // -- 1. Auth --------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: PublicarBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.variantId) {
    return json({ error: "variantId is required" }, 400);
  }

  // storeId: claim de raiz del JWT primero, luego user_metadata por
  // compatibilidad, y el body como ultimo recurso (service-role).
  const jwtClaim = claimDeJwt(authHeader, "store_id")
    ?? (user.user_metadata?.store_id as string | undefined)
    ?? null;
  const storeId: string = jwtClaim ?? body.storeId ?? "";
  if (!storeId) return json({ error: "Cannot determine storeId" }, 400);

  const ctx = body.priceContext ?? {};
  // La cuenta conectada es MLU (Uruguay) y los precios del catalogo estan en
  // UYU. El default anterior era ARS, con lo cual resolve_price no encontraba
  // ninguna fila y toda publicacion moria en "No price found". Si en el futuro
  // se conectan otros sitios, esto debe derivarse del site_id (MLA->ARS,
  // MLB->BRL, MLU->UYU) en vez de un default fijo.
  const currency = ctx.currency ?? "UYU";

  // -- 2. Leer variante + ítem ----------------------------------------------
  const { data: variant, error: varErr } = await supabase
    .from("v_catalog_variants_full")
    .select(`
      id, sku, barcode, attributes, weight_g,
      item_id, item_title, item_description:description, tags,
      item_status, variant_status, tenant_id
    `)
    .eq("id", body.variantId)
    .eq("tenant_id", storeId)
    .single();

  if (varErr || !variant) {
    return json({ error: "Variant not found", detail: varErr?.message }, 404);
  }

  const v = variant as unknown as ResolvedVariant;

  if (v.item_status === "archived" || v.item_status === "discontinued") {
    return json({ error: `Item status '${v.item_status}' cannot be published` }, 422);
  }
  if (v.variant_status !== "active") {
    return json({ error: `Variant status '${v.variant_status}' cannot be published` }, 422);
  }

  // -- 3. Leer listing existente --------------------------------------------
  const { data: listing } = await supabase
    .from("catalog_listings")
    .select("id, external_id, status, channel_attrs")
    .eq("variant_id", body.variantId)
    .eq("channel", CHANNEL)
    .maybeSingle();

  const existingListing = listing as ResolvedListing | null;

  // -- 4. Resolver precio ---------------------------------------------------
  // Llamamos resolve_price() como RPC — es una función SQL STABLE definida
  // en la migración 20260617_catalog_prices.sql.
  const { data: priceRow, error: priceErr } = await supabase.rpc(
    "resolve_price",
    {
      p_variant_id: body.variantId,
      p_currency:   currency,
      p_channel:    CHANNEL,
      p_price_list: ctx.priceList ?? null,
      p_country:    ctx.country ?? null,
      p_campaign:   ctx.campaign ?? null,
    }
  );

  if (priceErr) {
    return json({ error: "Price resolution failed", detail: priceErr.message }, 500);
  }
  if (!priceRow || (priceRow as ResolvedPrice).amount == null) {
    return json({
      error: "No price found",
      detail: `No catalog_prices row for variant ${body.variantId} channel=${CHANNEL} currency=${currency}`,
    }, 422);
  }

  const resolvedPrice = priceRow as ResolvedPrice;

  // -- 5. Leer imágenes -----------------------------------------------------
  const { data: mediaRows } = await supabase
    .from("catalog_media")
    .select("url, sort_order")
    .eq("item_id", v.item_id)
    .eq("type", "image")
    .order("sort_order", { ascending: true })
    .limit(12); // ML acepta hasta 12 fotos

  const pictures = (mediaRows as MediaRow[] ?? []).map((m) => ({ source: m.url }));

  // -- 6. Leer inventario disponible ----------------------------------------
  const { data: invRows } = await supabase
    .from("catalog_inventory")
    .select("available")
    .eq("variant_id", body.variantId);

  const totalAvailable = (invRows ?? []).reduce(
    (sum: number, row: { available: number }) => sum + (row.available ?? 0),
    0
  );

  // -- 7. Obtener token ML --------------------------------------------------
  let mlToken: string;
  try {
    mlToken = await getMLToken(storeId);
  } catch (e) {
    const code = e instanceof MLModuleError ? e.code : "UNKNOWN";
    return json({ error: "ML token error", code }, 502);
  }

  // -- 8. Construir payload ML ----------------------------------------------
  // channel_attrs lleva todo lo específico de ML sin tocar el schema:
  // category_id, listing_type_id, shipping config, etc.
  const attrs = (existingListing?.channel_attrs ?? {}) as Record<string, unknown>;

  // Categoria: la asignada manualmente manda; si no hay, se predice.
  let categoriaId = (attrs["category_id"] as string | undefined) ?? null;
  let categoriaPredicha = false;
  if (!categoriaId) {
    categoriaId = await predecirCategoria(v.item_title, mlToken);
    categoriaPredicha = categoriaId !== null;
  }

  const mlPayload: Record<string, unknown> = {
    title:          v.item_title,
    description:    v.item_description ?? undefined,
    price:          resolvedPrice.amount,
    currency_id:    resolvedPrice.currency,
    available_quantity: totalAvailable,
    buying_mode:    attrs["buying_mode"]    ?? "buy_it_now",
    listing_type_id: attrs["listing_type_id"] ?? "gold_special",
    condition:      attrs["condition"]      ?? "new",
    ...(categoriaId ? { category_id: categoriaId } : {}),
    ...(pictures.length > 0  ? { pictures }                          : {}),
    ...(v.weight_g           ? { shipping: buildShipping(v, attrs) } : {}),
  };

  // Atributos de variante (talle, color, etc.) → ML attributes array
  const mlAttrs = buildMLAttributes(v.attributes, attrs["extra_attributes"] as unknown[] ?? []);
  if (mlAttrs.length > 0) mlPayload.attributes = mlAttrs;

  // -- 9. Marcar listing como syncing --------------------------------------
  const listingUpsert = await upsertListing(supabase, {
    variant_id:  body.variantId,
    channel:     CHANNEL,
    status:      "syncing",
    external_id: existingListing?.external_id ?? null,
    channel_attrs: categoriaPredicha && categoriaId
      ? { ...attrs, category_id: categoriaId, category_id_origen: "prediccion_ml" }
      : (existingListing?.channel_attrs ?? {}),
  });

  if (listingUpsert.error) {
    return json({ error: "Failed to mark listing as syncing", detail: listingUpsert.error.message }, 500);
  }

  const listingId: string = listingUpsert.data!.id;

  // -- 10. Llamar API ML ----------------------------------------------------
  const isUpdate = Boolean(existingListing?.external_id);
  const mlUrl = isUpdate
    ? `${ML_API}/items/${existingListing!.external_id}`
    : `${ML_API}/items`;

  let mlResponse: Response;
  try {
    mlResponse = await fetch(mlUrl, {
      method:  isUpdate ? "PUT" : "POST",
      headers: {
        Authorization:  `Bearer ${mlToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mlPayload),
    });
  } catch (e) {
    await logSync(supabase, {
      listingId,
      action:  isUpdate ? "update" : "create",
      result:  "error",
      payload: mlPayload,
      error:   `Network error: ${(e as Error).message}`,
    });
    return json({ error: "ML API unreachable" }, 502);
  }

  const mlBody = await mlResponse.json().catch(() => ({}));
  const success = mlResponse.status >= 200 && mlResponse.status < 300;

  // -- 11. Actualizar listing y log -----------------------------------------
  const newExternalId: string | null = success
    ? (mlBody.id ?? existingListing?.external_id ?? null)
    : (existingListing?.external_id ?? null);

  await upsertListing(supabase, {
    variant_id:  body.variantId,
    channel:     CHANNEL,
    external_id: newExternalId,
    status:      success ? "active" : "error",
    last_error:  success ? null : (mlBody.message ?? "Unknown ML error"),
    synced_at:   success ? new Date().toISOString() : undefined,
    channel_attrs: existingListing?.channel_attrs ?? {},
  });

  await logSync(supabase, {
    listingId,
    action:      isUpdate ? "update" : "create",
    result:      success ? "success" : "error",
    httpStatus:  mlResponse.status,
    payload:     mlPayload,
    response:    mlBody,
    error:       success ? null : (mlBody.message ?? null),
  });

  if (!success) {
    return json({
      error:   "ML API error",
      status:  mlResponse.status,
      detail:  mlBody,
    }, mlResponse.status >= 500 ? 502 : 422);
  }

  return json({
    ok:         true,
    external_id: newExternalId,
    action:     isUpdate ? "updated" : "created",
    price:      resolvedPrice.amount,
    currency:   resolvedPrice.currency,
    stock:      totalAvailable,
  });
});

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

function buildShipping(
  v: ResolvedVariant,
  attrs: Record<string, unknown>
): Record<string, unknown> {
  return {
    mode: attrs["shipping_mode"] ?? "me2",
    local_pick_up: attrs["local_pick_up"] ?? false,
    free_shipping: attrs["free_shipping"] ?? false,
    dimensions: v.weight_g
      ? {
          weight: Math.round(v.weight_g),
          width:  attrs["width_cm"]  ?? null,
          height: attrs["height_cm"] ?? null,
          length: attrs["length_cm"] ?? null,
        }
      : undefined,
  };
}

function buildMLAttributes(
  variantAttrs: Record<string, unknown>,
  extraAttrs: unknown[]
): Array<{ id: string; value_name: string }> {
  // Mapeo convencional: keys de catalog_variants.attributes → ML attribute ids
  // Extendible sin tocar schema: agregar entries al mapping o usar extra_attributes
  const ATTR_MAP: Record<string, string> = {
    color:   "COLOR",
    size:    "SIZE",
    brand:   "BRAND",
    model:   "MODEL",
    gender:  "GENDER",
    material:"MAIN_MATERIAL",
  };

  const result: Array<{ id: string; value_name: string }> = [];

  for (const [key, mlId] of Object.entries(ATTR_MAP)) {
    if (variantAttrs[key] != null) {
      result.push({ id: mlId, value_name: String(variantAttrs[key]) });
    }
  }

  // Atributos extra definidos directamente en channel_attrs.extra_attributes
  for (const attr of extraAttrs) {
    if (
      typeof attr === "object" && attr !== null &&
      "id" in attr && "value_name" in attr
    ) {
      result.push(attr as { id: string; value_name: string });
    }
  }

  return result;
}

// Upsert sobre catalog_listings — siempre por (variant_id, channel)
async function upsertListing(
  supabase: ReturnType<typeof createClient>,
  data: {
    variant_id:   string;
    channel:      string;
    status:       string;
    external_id:  string | null;
    channel_attrs: Record<string, unknown>;
    last_error?:  string | null;
    synced_at?:   string;
  }
) {
  return supabase
    .from("catalog_listings")
    .upsert(
      {
        variant_id:   data.variant_id,
        channel:      data.channel,
        status:       data.status,
        external_id:  data.external_id,
        channel_attrs: data.channel_attrs,
        ...(data.last_error !== undefined ? { last_error: data.last_error } : {}),
        ...(data.synced_at               ? { synced_at: data.synced_at }   : {}),
      },
      { onConflict: "variant_id,channel" }
    )
    .select("id")
    .single();
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
