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
  /** Solo comprueba requisitos y responde que falta, sin publicar. */
  soloVerificar?: boolean;
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

  /**
   * Registra el fallo en el listing y responde.
   *
   * Sin esto, todo error anterior a la llamada a Mercado Libre -precio
   * faltante, variante no encontrada, token- se devolvia al navegador pero no
   * quedaba en catalog_listings. La tabla mostraba PENDING con la columna de
   * error vacia, y la persona veia un aviso que se desvanecia sin rastro de
   * que habia pasado.
   */
  const fallar = async (mensaje: string, status: number, extra: Record<string, unknown> = {}) => {
    try {
      await upsertListing(supabase, {
        variant_id:    body.variantId,
        channel:       CHANNEL,
        status:        "error",
        external_id:   null,
        channel_attrs: {},
        last_error:    mensaje,
      });
    } catch (_) {
      // Si ni siquiera se puede registrar el error, igual hay que responderlo.
    }
    return json({ error: mensaje, ...extra }, status);
  };

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
    return await fallar("No se encontro la variante en el catalogo", 404, { detail: varErr?.message });
  }

  const v = variant as unknown as ResolvedVariant;

  if (v.item_status === "archived" || v.item_status === "discontinued") {
    return await fallar(`El producto esta en estado '${v.item_status}' y no se puede publicar`, 422);
  }
  if (v.variant_status !== "active") {
    return await fallar(`La variante esta en estado '${v.variant_status}' y no se puede publicar`, 422);
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
    return await fallar("No se pudo resolver el precio", 500, { detail: priceErr.message });
  }
  if (!priceRow || (priceRow as ResolvedPrice).amount == null) {
    return await fallar(
      `El producto no tiene precio en ${currency} para Mercado Libre`,
      422,
      { detail: `No hay fila en catalog_prices para variant ${body.variantId} channel=${CHANNEL} currency=${currency}` },
    );
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
    return await fallar("No se pudo obtener el token de Mercado Libre", 502, { code });
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
    // title y family_name NO conviven: ver el bloque de abajo.
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

  /**
   * `title` o `family_name`, nunca los dos.
   *
   * Mercado Libre acepta dos formas de crear un item y son excluyentes:
   *
   *   - publicacion suelta: se manda `title`.
   *   - familia de catalogo: se manda `family_name` y `title` queda prohibido,
   *     porque el titulo lo arma Mercado Libre a partir de la familia.
   *
   * Cual corresponde depende de la categoria, y Mercado Libre NO lo publica en
   * los metadatos de la categoria: lo unico que expone es `catalog_domain`, que
   * esta en casi todas y no distingue. Asi que no se puede saber de antemano.
   *
   * Se manda `title`, que es el caso comun, y si Mercado Libre responde que
   * hace falta `family_name` -o que `title` no corresponde- se reintenta una
   * vez con la otra forma y se deja anotado en channel_attrs. A partir de ahi
   * ese producto sale bien al primer intento.
   *
   * Mandar las dos fue el bug: se agrego family_name para resolver
   * "required_fields [family_name]" sin ver que eso vuelve invalido a title, y
   * el rechazo que seguia -"The fields [title] are invalid"- se leia como si el
   * titulo estuviera mal escrito.
   */
  const nombreFamilia = String(attrs["family_name"] ?? v.item_title ?? "").trim().slice(0, 60);
  const aplicarForma = (usaFamilia: boolean) => {
    if (usaFamilia) {
      delete mlPayload.title;
      if (nombreFamilia) mlPayload.family_name = nombreFamilia;
    } else {
      delete mlPayload.family_name;
      mlPayload.title = v.item_title;
    }
  };
  let usaFamilia = attrs["usa_family_name"] === true;
  aplicarForma(usaFamilia);

  // Atributos de variante (talle, color, etc.) → ML attributes array
  const mlAttrs = buildMLAttributes(v.attributes, attrs["extra_attributes"] as unknown[] ?? []);
  if (mlAttrs.length > 0) mlPayload.attributes = mlAttrs;

  // -- 8b. Verificacion previa ---------------------------------------------
  // Conocer los requisitos de Mercado Libre y comprobarlos aca evita que una
  // publicacion incompleta llegue a ML y vuelva como un rechazo en jerga. El
  // texto que se guarda es el mismo que ve quien vende, y no se gasta una
  // llamada a la API para averiguar algo que ya sabiamos.
  const problemas = await verificarAntesDePublicar(mlPayload, mlAttrs);
  if (problemas.length > 0 && body.soloVerificar) {
    // Verificar no es publicar: se informa que falta sin ensuciar el estado
    // del listing con un error que nadie provoco.
    return json({ ok: false, verificado: true, problemas }, 200);
  }
  if (problemas.length > 0) {
    const resumen = problemas.map((p) => p.mensaje).join(" | ");
    await upsertListing(supabase, {
      variant_id:  body.variantId,
      channel:     CHANNEL,
      status:      "error",
      external_id: existingListing?.external_id ?? null,
      last_error:  resumen,
      channel_attrs: existingListing?.channel_attrs ?? {},
    });
    return json({ error: "Faltan datos", status: 422, resumen, problemas }, 422);
  }

  // Modo verificacion: se responde que falta sin publicar ni tocar el listing.
  if (body.soloVerificar) {
    return json({ ok: true, verificado: true, problemas: [] });
  }

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

  let mlBody = await mlResponse.json().catch(() => ({}));
  let success = mlResponse.status >= 200 && mlResponse.status < 300;

  // ¿El rechazo es por haber elegido la forma equivocada? Si es asi se cambia
  // y se reintenta una sola vez. Un segundo rechazo ya no es esto.
  const pideLaOtraForma = (b: any): boolean => {
    const txt = JSON.stringify(b ?? {});
    const pideFamilia  = /required_fields/i.test(txt) && /family_name/i.test(txt);
    const sobraTitulo  = /invalid_fields/i.test(txt) && /\[?"?title"?\]?/i.test(txt);
    const sobraFamilia = /invalid_fields/i.test(txt) && /family_name/i.test(txt);
    return usaFamilia ? sobraFamilia : (pideFamilia || sobraTitulo);
  };

  if (!success && pideLaOtraForma(mlBody)) {
    usaFamilia = !usaFamilia;
    aplicarForma(usaFamilia);
    try {
      const r2 = await fetch(mlUrl, {
        method:  isUpdate ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${mlToken}`, "Content-Type": "application/json" },
        body:    JSON.stringify(mlPayload),
      });
      mlBody  = await r2.json().catch(() => ({}));
      success = r2.status >= 200 && r2.status < 300;
      // Solo se recuerda si funciono: anotar una forma que tampoco anda seria
      // dejar el producto peor de lo que estaba.
      if (success) {
        const attrsNuevos = { ...(existingListing?.channel_attrs ?? {}), usa_family_name: usaFamilia };
        await supabase.from("catalog_listings")
          .update({ channel_attrs: attrsNuevos })
          .eq("variant_id", body.variantId).eq("channel", CHANNEL);
      }
    } catch (_) { /* se responde con el rechazo original */ }
  }

  // `message` de Mercado Libre suele repetir el codigo -"body.required_fields"-
  // y el detalle util vive en `cause`: que campo falta, que atributo exige la
  // categoria. Guardar solo `message` dejaba en last_error un texto que no
  // cambia nunca y no dice nada.
  // `cause` viene en formas distintas segun el error: array de objetos, array
  // de strings, un objeto suelto, o anidado en cause.cause. Cualquiera que no
  // se contemple termina descartando el unico texto que explica el rechazo, y
  // last_error queda en el codigo pelado -"body.invalid_fields"- mientras la
  // respuesta viva si traia el detalle. De ahi salian mensajes distintos para
  // el mismo error segun quien lo leyera.
  const aplanarCausas = (raw: any, prof = 0): string[] => {
    if (raw == null || prof > 3) return [];
    if (typeof raw === "string") return [raw];
    if (Array.isArray(raw)) return raw.flatMap((c) => aplanarCausas(c, prof + 1));
    if (typeof raw === "object") {
      const propio = [raw.code, raw.message ?? raw.description]
        .filter(Boolean).map(String).join(": ");
      const hijos = aplanarCausas(raw.cause ?? raw.causes, prof + 1);
      return [propio, ...hijos].filter(Boolean);
    }
    return [String(raw)];
  };

  const resumenMl = (b: any): string => {
    const codigo = String(b?.error ?? "");
    const msg = b?.message ? String(b.message) : "";
    const partes: string[] = [];
    for (const t of aplanarCausas(b?.cause ?? b?.causes).slice(0, 4)) {
      if (t && !partes.includes(t)) partes.push(t);
    }
    // El mensaje general solo suma si no es el mismo codigo repetido.
    if (msg && msg !== codigo && !partes.includes(msg)) partes.unshift(msg);
    // El codigo va siempre al final: es lo que hace que las reglas del
    // traductor puedan reconocer el error aunque el texto cambie.
    if (codigo && !partes.some((x) => x.includes(codigo))) partes.push(codigo);
    return partes.join(" | ") || `Mercado Libre respondio ${mlResponse.status} sin detalle`;
  };

  // -- 11. Actualizar listing y log -----------------------------------------
  const newExternalId: string | null = success
    ? (mlBody.id ?? existingListing?.external_id ?? null)
    : (existingListing?.external_id ?? null);

  await upsertListing(supabase, {
    variant_id:  body.variantId,
    channel:     CHANNEL,
    external_id: newExternalId,
    status:      success ? "active" : "error",
    last_error:  success ? null : resumenMl(mlBody),
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
    error:       success ? null : resumenMl(mlBody),
  });

  if (!success) {
    // `resumen` es exactamente el mismo texto que quedo en last_error. Que
    // viaje en la respuesta es lo que garantiza que el aviso del momento y lo
    // que despues muestra la tabla digan lo mismo: una sola fuente.
    return json({
      error:   "ML API error",
      status:  mlResponse.status,
      resumen: resumenMl(mlBody),
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

/**
 * Requisitos de Mercado Libre para una categoria.
 *
 * ML los publica y son distintos por categoria: largo maximo del titulo,
 * monedas aceptadas, si admite publicaciones directas, y que atributos exige.
 * Consultarlos antes de publicar es lo que permite decir "falta la marca" en
 * lugar de mandar el pedido y traducir despues un rechazo en jerga.
 *
 * Son datos publicos y estables; se cachean en memoria por invocacion caliente.
 */
const cacheCategoria = new Map<string, any>();

async function requisitosDeCategoria(categoriaId: string): Promise<any | null> {
  if (cacheCategoria.has(categoriaId)) return cacheCategoria.get(categoriaId);
  try {
    const [cat, attrs] = await Promise.all([
      fetch(`https://api.mercadolibre.com/categories/${categoriaId}`).then((r) => r.ok ? r.json() : null),
      fetch(`https://api.mercadolibre.com/categories/${categoriaId}/attributes`).then((r) => r.ok ? r.json() : []),
    ]);
    if (!cat) return null;
    const info = {
      nombre:        cat.name ?? categoriaId,
      esHoja:        (cat.children_categories ?? []).length === 0,
      permitePublicar: cat.settings?.listing_allowed !== false && cat.settings?.status !== "disabled",
      maxTitulo:     Number(cat.settings?.max_title_length ?? 60),
      monedas:       Array.isArray(cat.settings?.currencies) ? cat.settings.currencies : null,
      // Las opciones permitidas viajan con el requisito: quien tenga que
      // completarlo necesita elegir un valor valido, no adivinar el que la
      // categoria acepta. Se acotan para no inflar la respuesta con listas de
      // cientos de entradas que nadie va a leer.
      requeridos:    (Array.isArray(attrs) ? attrs : [])
        .filter((a: any) => a?.tags?.required)
        .map((a: any) => ({
          id:       String(a.id),
          nombre:   String(a.name ?? a.id),
          opciones: (a.values ?? [])
            .map((v: any) => String(v?.name ?? "")).filter(Boolean).slice(0, 80),
          // Si la categoria define un tipo, sirve para elegir el control.
          tipo:     String(a.value_type ?? "string"),
        })),
    };
    cacheCategoria.set(categoriaId, info);
    return info;
  } catch (_) {
    // Sin los requisitos no se bloquea nada: se deja que Mercado Libre
    // decida. Vale mas intentar que impedir por una consulta caida.
    return null;
  }
}

interface Problema {
  campo: string;
  etiqueta: string;
  mensaje: string;
  /** Valores que el canal acepta, si los publica. Vacio = texto libre. */
  opciones?: string[];
  /** Valor cargado hoy, para no pedir de nuevo lo que ya esta. */
  valor?: string | null;
  tipo?: string;
}

/**
 * Verifica la publicacion contra los requisitos de Mercado Libre ANTES de
 * mandarla. Devuelve la lista de lo que falta, ya redactada para quien vende.
 */
async function verificarAntesDePublicar(
  payload: Record<string, unknown>,
  attrsMl: Array<{ id: string; value_name: string }>,
): Promise<Problema[]> {
  const problemas: Problema[] = [];
  const titulo = String(payload.title ?? "").trim();
  const categoriaId = String(payload.category_id ?? "").trim();

  if (!titulo) {
    problemas.push({ campo: "title", etiqueta: "Titulo", mensaje: "El producto no tiene titulo", valor: titulo });
  }
  if (!(Number(payload.price) > 0)) {
    problemas.push({ campo: "price", etiqueta: "Precio", mensaje: "El precio tiene que ser mayor que cero",
                     valor: String(payload.price ?? ""), tipo: "number" });
  }
  if (!(Number(payload.available_quantity) > 0)) {
    problemas.push({ campo: "stock", etiqueta: "Stock", mensaje: "No hay unidades disponibles para vender",
                     valor: String(payload.available_quantity ?? ""), tipo: "number" });
  }
  if (!Array.isArray(payload.pictures) || (payload.pictures as unknown[]).length === 0) {
    problemas.push({ campo: "pictures", etiqueta: "Imagenes", mensaje: "Mercado Libre necesita al menos una imagen" });
  }
  if (!categoriaId) {
    problemas.push({ campo: "category_id", etiqueta: "Categoria", mensaje: "Falta elegir la categoria de Mercado Libre" });
    return problemas; // sin categoria no se puede verificar nada mas
  }

  const req = await requisitosDeCategoria(categoriaId);
  if (!req) return problemas;

  if (!req.esHoja) {
    problemas.push({
      campo: "category_id", etiqueta: "Categoria",
      mensaje: `"${req.nombre}" agrupa otras categorias; hay que elegir una mas especifica`,
    });
  }
  if (!req.permitePublicar) {
    problemas.push({
      campo: "category_id", etiqueta: "Categoria",
      mensaje: `Mercado Libre no admite publicaciones nuevas en "${req.nombre}"`,
    });
  }
  if (titulo.length > req.maxTitulo) {
    problemas.push({
      campo: "title", etiqueta: "Titulo",
      mensaje: `El titulo tiene ${titulo.length} caracteres y esta categoria admite hasta ${req.maxTitulo}`,
    });
  }
  if (req.monedas && !req.monedas.includes(String(payload.currency_id))) {
    problemas.push({
      campo: "price", etiqueta: "Moneda",
      mensaje: `Esta categoria no acepta ${payload.currency_id}; acepta ${req.monedas.join(" o ")}`,
    });
  }

  const puestos = new Set(attrsMl.filter((a) => String(a.value_name ?? "").trim()).map((a) => a.id));
  const valorDe = new Map(attrsMl.map((a) => [a.id, String(a.value_name ?? "")]));
  for (const r of req.requeridos) {
    if (!puestos.has(r.id)) {
      problemas.push({
        campo: `attr:${r.id}`, etiqueta: r.nombre,
        mensaje: `"${req.nombre}" exige ${r.nombre.toLowerCase()}`,
        opciones: r.opciones, valor: valorDe.get(r.id) ?? null, tipo: r.tipo,
      });
    }
  }

  return problemas;
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
