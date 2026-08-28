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
  /** Solo busca los datos del producto en el catalogo y los devuelve. */
  soloEnriquecer?: boolean;
  /**
   * Titulo a buscar cuando todavia no hay variante.
   *
   * Al dar de alta un articulo no existe nada que consultar por id, y es
   * justo el momento en que estos datos sirven: si llegan despues, la persona
   * ya escribio a mano lo que podiamos traer.
   */
  titulo?: string;
  /** Version elegida entre las que devolvio la busqueda. */
  productoId?: string;
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

/**
 * Igual que `predecirCategoria`, pero además trae el camino completo hasta la
 * categoría (de la raíz a la hoja), con nombres.
 *
 * Sirve para adivinar nuestro propio departamento/categoría/subcategoría: ML
 * no conoce esa taxonomía, pero sus nombres de categoría suelen coincidir o
 * parecerse a los nuestros en algún nivel del camino. Quien llama a esto hace
 * el match por nombre; acá sólo se arma el dato crudo que hace falta para eso.
 */
async function predecirCategoriaConPath(
  titulo: string, token: string,
): Promise<{ id: string; nombre: string; path: string[] } | null> {
  try {
    const url = `${ML_API}/sites/${ML_SITE}/domain_discovery/search?limit=1&q=${encodeURIComponent(titulo)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return null;
    const datos = await resp.json();
    const primero = Array.isArray(datos) ? datos[0] : null;
    const categoryId = primero?.category_id ?? null;
    if (!categoryId) return null;

    const catResp = await fetch(`${ML_API}/categories/${categoryId}`);
    if (!catResp.ok) return { id: categoryId, nombre: primero?.category_name ?? categoryId, path: [] };
    const cat = await catResp.json();
    const path: string[] = Array.isArray(cat?.path_from_root)
      ? cat.path_from_root.map((n: any) => String(n?.name ?? "")).filter(Boolean)
      : [];
    return { id: categoryId, nombre: cat?.name ?? primero?.category_name ?? categoryId, path };
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

  // Para buscar datos alcanza con el titulo: al dar de alta todavia no hay
  // variante, y es justo el momento en que estos datos sirven.
  const buscaPorTitulo = body.soloEnriquecer === true && !body.variantId;

  if (!body.variantId && !buscaPorTitulo) {
    return json({ error: "variantId is required" }, 400);
  }
  if (buscaPorTitulo && !String(body.titulo ?? "").trim() && !body.productoId) {
    return json({ error: "Falta el título o el producto a buscar" }, 400);
  }

  // storeId: claim de raiz del JWT primero, luego user_metadata por
  // compatibilidad, y el body como ultimo recurso (service-role).
  const jwtClaim = claimDeJwt(authHeader, "store_id")
    ?? (user.user_metadata?.store_id as string | undefined)
    ?? null;
  const storeId: string = jwtClaim ?? body.storeId ?? "";
  if (!storeId) return json({ error: "Cannot determine storeId" }, 400);

  if (buscaPorTitulo) {
    let token: string;
    try {
      token = await getMLToken(storeId);
    } catch (e) {
      // Sin cuenta conectada no hay a quien preguntarle, pero tampoco es un
      // error del alta: se responde que no se encontro nada.
      return json({ ok: true, encontrado: false, motivo: (e as Error).message });
    }
    // Las opciones se listan siempre: aunque haya una ficha cargada, quien da
    // de alta tiene que poder ver que hay otras versiones y cambiar.
    const candidatos = body.productoId
      ? []
      : await buscarCandidatos(token, ML_SITE, String(body.titulo ?? ""));

    // Categoría sugerida por ML a partir del título: se busca en paralelo con
    // el resto, no depende de si el producto se encontró en su catálogo —
    // sirve igual para un artículo que ML no tiene ficha propia.
    const categoriaSugerida = await predecirCategoriaConPath(String(body.titulo ?? ""), token);

    const c = await buscarEnCatalogo(token, ML_SITE, String(body.titulo ?? ""), body.productoId);
    if (!c) return json({ ok: true, encontrado: false, candidatos, categoriaSugerida });
    return json({
      ok: true,
      encontrado: true,
      candidatos,
      categoriaSugerida,
      producto: { id: c.id, nombre: c.nombre },
      atributos: [...c.atributos].map(([id, valor]) => ({ id, valor })),
      imagenes: c.imagenes,
      caracteristicas: c.caracteristicas,
      descripcion: c.descripcion,
      precios: c.precios,
      competencia: c.competencia,
      mercadoMotivo: c.mercadoMotivo,
      descripcionSugerida: redactarFicha(c),
      argumentosDeVenta:   argumentosDeFicha(c),
    });
  }

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

  // -- 7b. Datos del fabricante -------------------------------------------
  // Se busca siempre, no solo cuando falta algo: los codigos, las fotos y las
  // caracteristicas son del producto y no de quien lo vende. Si no aparece
  // nada, se sigue igual.
  const delCatalogo = await buscarEnCatalogo(mlToken, ML_SITE, v.item_title ?? "");

  if (body.soloEnriquecer) {
    return json({
      ok: true,
      encontrado: !!delCatalogo,
      producto: delCatalogo ? { id: delCatalogo.id, nombre: delCatalogo.nombre } : null,
      atributos: delCatalogo ? [...delCatalogo.atributos].map(([id, valor]) => ({ id, valor })) : [],
      imagenes: delCatalogo?.imagenes ?? [],
      caracteristicas: delCatalogo?.caracteristicas ?? [],
      descripcion: delCatalogo?.descripcion ?? null,
      precios: delCatalogo?.precios ?? null,
      competencia: delCatalogo?.competencia ?? [],
      mercadoMotivo: delCatalogo?.mercadoMotivo ?? null,
      descripcionSugerida: delCatalogo ? redactarFicha(delCatalogo) : null,
      argumentosDeVenta:   delCatalogo ? argumentosDeFicha(delCatalogo) : [],
    });
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

  // Lo que el catalogo sabe y nosotros no, se completa. Nunca se pisa un valor
  // cargado: si alguien lo escribio, manda lo suyo.
  if (delCatalogo) {
    const yaPuestos = new Set(mlAttrs.map((a) => a.id));
    for (const [id, valor] of delCatalogo.atributos) {
      if (!yaPuestos.has(id)) mlAttrs.push({ id, value_name: valor });
    }
  }
  if (mlAttrs.length > 0) mlPayload.attributes = mlAttrs;

  // Fotos del fabricante, solo si el producto no tiene propias: las suyas
  // muestran la unidad real y valen mas que las de catalogo.
  if (delCatalogo?.imagenes.length && !(mlPayload.pictures as unknown[] | undefined)?.length) {
    mlPayload.pictures = delCatalogo.imagenes.slice(0, 10).map((url) => ({ source: url }));
  }

  // -- 8b. Verificacion previa ---------------------------------------------
  // Conocer los requisitos de Mercado Libre y comprobarlos aca evita que una
  // publicacion incompleta llegue a ML y vuelva como un rechazo en jerga. El
  // texto que se guarda es el mismo que ve quien vende, y no se gasta una
  // llamada a la API para averiguar algo que ya sabiamos.
  const problemas = await verificarAntesDePublicar(mlPayload, mlAttrs, delCatalogo?.atributos ?? null);
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

  /**
   * Convierte un rechazo por atributos en campos editables.
   *
   * Mercado Libre reclama atributos que su propia lista de categoria no marca
   * como obligatorios -los pide recien al publicar, con mensajes como
   * `missing_catalog_required: El campo "Memoria interna" es obligatorio`-.
   * Ahi solo da el nombre visible, no el id que hace falta para guardarlo, asi
   * que se resuelve contra los atributos de la categoria.
   *
   * Sin esto el rechazo llega como un texto que nombra campos que la pantalla
   * no puede ofrecer, y no queda nada que hacer mas que leerlo.
   */
  const problemasDelRechazo = async (b: any): Promise<Problema[]> => {
    const causas = aplanarCausas(b?.cause ?? b?.causes);
    const texto  = [b?.message, ...causas].filter(Boolean).join(" | ");
    if (!/attribute|required/i.test(texto)) return [];

    const req = categoriaId ? await requisitosDeCategoria(categoriaId) : null;
    const todos: any[] = req?.todos ?? [];
    const encontrados = new Map<string, Problema>();

    const agregar = (attr: any, mensaje: string) => {
      if (!attr || encontrados.has(attr.id)) return;
      encontrados.set(attr.id, {
        campo: `attr:${attr.id}`, etiqueta: attr.nombre, mensaje,
        opciones: attr.opciones, tipo: attr.tipo, valor: null,
      });
    };

    for (const causa of causas.length ? causas : [texto]) {
      // Por nombre entre comillas: El campo "Memoria interna" es obligatorio
      for (const m of causa.matchAll(/["“']([^"”']{2,60})["”']/g)) {
        const nombre = m[1].trim().toLowerCase();
        agregar(todos.find((a) => a.nombre.toLowerCase() === nombre), causa);
      }
      // Por id entre corchetes: The attributes [GTIN] are required
      for (const m of causa.matchAll(/\[([A-Z0-9_,\s]{2,80})\]/g)) {
        for (const id of m[1].split(",").map((x) => x.trim()).filter(Boolean)) {
          agregar(todos.find((a) => a.id === id), causa);
        }
      }
    }
    return [...encontrados.values()];
  };

  if (!success) {
    // `resumen` es exactamente el mismo texto que quedo en last_error. Que
    // viaje en la respuesta es lo que garantiza que el aviso del momento y lo
    // que despues muestra la tabla digan lo mismo: una sola fuente.
    return json({
      error:    "ML API error",
      status:   mlResponse.status,
      resumen:  resumenMl(mlBody),
      problemas: await problemasDelRechazo(mlBody),
      detail:   mlBody,
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
      // `required` y `catalog_required` se piden siempre, asi que se exigen
      // antes de publicar.
      //
      // `conditional_required` NO: significa obligatorio SEGUN otros datos, y
      // los de una misma categoria suelen excluirse entre si -en Celulares,
      // "Codigo universal de producto", "Motivo de GTIN vacio" y "Estado del
      // reacondicionado" nunca hacen falta los tres juntos-. Pedirlos todos
      // convierte una publicacion valida en tres campos imposibles de
      // completar a la vez. Si alguno aplica, el canal lo dice al publicar y
      // ahi se pide el que corresponde.
      requeridos:    (Array.isArray(attrs) ? attrs : [])
        .filter((a: any) => a?.tags?.required || a?.tags?.catalog_required)
        .map((a: any) => ({
          id:       String(a.id),
          nombre:   String(a.name ?? a.id),
          opciones: (a.values ?? [])
            .map((v: any) => String(v?.name ?? "")).filter(Boolean).slice(0, 80),
          // Si la categoria define un tipo, sirve para elegir el control.
          tipo:     String(a.value_type ?? "string"),
        })),
      // Todos los atributos, no solo los obligatorios: hacen falta para
      // resolver por nombre los que Mercado Libre reclama recien al publicar.
      todos: (Array.isArray(attrs) ? attrs : []).map((a: any) => ({
        id:       String(a.id),
        nombre:   String(a.name ?? a.id),
        opciones: (a.values ?? []).map((v: any) => String(v?.name ?? "")).filter(Boolean).slice(0, 80),
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

/**
 * Busca el producto en el catalogo de Mercado Libre y trae sus atributos.
 *
 * Codigos como el GTIN, la memoria interna o la RAM no son datos que quien
 * vende tenga a mano: son del producto, no de la publicacion. Pedirselos es
 * trasladarle un trabajo que podemos hacer nosotros, porque Mercado Libre
 * mantiene un catalogo con todo eso cargado.
 *
 * Requiere el token del vendedor: estos endpoints dejaron de responder sin
 * autenticar. Si la busqueda falla o no encuentra nada, no pasa nada: se sigue
 * sin sugerencias. Es una ayuda, no un requisito.
 */
/**
 * Todas las versiones del producto que el canal conoce.
 *
 * "iPhone 17" no es un producto: son varios -256 GB, 512 GB, cada color-. Que
 * elija cual es no lo puede hacer nadie mas que quien lo tiene en la mano, asi
 * que se listan y se le pregunta, en vez de adivinar con el primero.
 */
/**
 * Palabras que no distinguen un producto de otro.
 *
 * "Celular iPhone 17" y "Kit destornilladores para celular iPhone" comparten
 * "celular" y "iphone": lo unico que los separa es el 17. Sin sacar estas del
 * medio, cualquier accesorio parece el producto.
 */
const PALABRAS_VACIAS = new Set([
  "celular","celulares","telefono","teléfono","smartphone","movil","móvil",
  "para","con","sin","de","del","la","el","los","las","y","o","un","una",
  "nuevo","nueva","usado","usada","original","libre","gb","tb","mb",
]);

const tokens = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Cuanto se parece un resultado a lo que se busco.
 *
 * Los numeros mandan: en electronica el modelo casi siempre es un numero, y un
 * resultado que no lo tiene es otro producto -no una variante-. Se exige que
 * esten todos, y ademas al menos una palabra con contenido.
 */
function pareceElMismo(consulta: string[], nombre: string): boolean {
  const n = new Set(tokens(nombre));
  const numeros  = consulta.filter((t) => /^\d+$/.test(t));
  const palabras = consulta.filter((t) => !/^\d+$/.test(t) && !PALABRAS_VACIAS.has(t));

  // Todos los terminos con contenido tienen que estar. Alcanzar con uno hacia
  // que "Celular iPhone 17" trajera cualquier accesorio que dijera "iPhone":
  // lo que se busca es ESE producto, no algo parecido.
  if (numeros.length && !numeros.every((x) => n.has(x))) return false;
  if (palabras.length && !palabras.every((x) => n.has(x))) return false;
  // Sin numeros ni palabras con contenido no hay con que decidir: se acepta y
  // que elija la persona.
  return true;
}

/** Dominio que Mercado Libre le asigna al texto, para no buscar en todo el sitio. */
async function predecirDominio(siteId: string, texto: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.mercadolibre.com/sites/${siteId}/domain_discovery/search`
      + `?limit=1&q=${encodeURIComponent(texto)}`);
    if (!r.ok) return null;
    const d = await r.json();
    return (Array.isArray(d) ? d : [])[0]?.domain_id ?? null;
  } catch (_) {
    return null;
  }
}

async function buscarCandidatos(
  token: string, siteId: string, texto: string,
): Promise<Array<{ id: string; nombre: string; imagen: string | null; rasgos: string[] }>> {
  const q = texto.trim();
  if (q.length < 3) return [];
  try {
    // Acotar al dominio evita que un destornillador "para celular iPhone"
    // compita con el celular.
    const dominio = await predecirDominio(siteId, q);
    const base = `https://api.mercadolibre.com/products/search`
               + `?status=active&site_id=${encodeURIComponent(siteId)}&q=${encodeURIComponent(q)}`;

    let d: any = null;
    if (dominio) {
      const r1 = await fetch(`${base}&domain_id=${encodeURIComponent(dominio)}`,
        { headers: { Authorization: `Bearer ${token}` } });
      if (r1.ok) d = await r1.json();
    }
    // Si el dominio no dio nada -o no se pudo predecir- se busca abierto, pero
    // el filtro de relevancia sigue aplicando.
    if (!d?.results?.length) {
      const r2 = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
      if (!r2.ok) return [];
      d = await r2.json();
    }

    const consulta = tokens(q);
    return (d?.results ?? [])
      .filter((p: any) => pareceElMismo(consulta, String(p?.name ?? "")))
      .slice(0, 10)
      .map((p: any) => ({
      id:     String(p?.id ?? ""),
      nombre: String(p?.name ?? ""),
      imagen: p?.pictures?.[0]?.secure_url ?? p?.pictures?.[0]?.url ?? null,
      // Lo que distingue una version de otra: capacidad, color, modelo.
      rasgos: (p?.attributes ?? [])
        .filter((a: any) => ["INTERNAL_MEMORY","COLOR","MODEL","RAM","CAPACITY"].includes(String(a?.id)))
        .map((a: any) => String(a?.value_name ?? "")).filter(Boolean),
      }))
      .filter((c: any) => c.id && c.nombre);
  } catch (_) {
    return [];
  }
}

async function buscarEnCatalogo(
  token: string, siteId: string, titulo: string, productoId?: string,
): Promise<{
  id: string;
  nombre: string;
  atributos: Map<string, string>;
  imagenes: string[];
  caracteristicas: string[];
  descripcion: string | null;
  precios: { min: number; max: number; mediana: number; moneda: string; ofertas: number } | null;
  mercadoMotivo: string | null;
  competencia: Array<{
    precio: number; moneda: string; envioGratis: boolean;
    vendidos: number; condicion: string; ganaLaCompra: boolean;
  }>;
} | null> {
  const q = titulo.trim();
  let primero: any = null;

  // Con un id elegido no se busca: se va derecho a esa version. Volver a
  // buscar por texto podria devolver otra distinta de la que eligieron.
  if (productoId) {
    try {
      const rp = await fetch(`https://api.mercadolibre.com/products/${productoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rp.ok) primero = await rp.json();
    } catch (_) { return null; }
    if (!primero?.id) return null;
  } else {
    if (q.length < 3) return null;
    try {
      const url = `https://api.mercadolibre.com/products/search`
                + `?status=active&site_id=${encodeURIComponent(siteId)}&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      const d = await r.json();
      primero = (d?.results ?? [])[0];
    } catch (_) { return null; }
    if (!primero?.id) return null;
  }

  try {

    // El resultado de la busqueda trae atributos resumidos; la ficha completa
    // trae los que faltan, que suelen ser justamente los codigos.
    let atributos: any[] = primero.attributes ?? [];
    let ficha: any = null;
    try {
      const rf = await fetch(`https://api.mercadolibre.com/products/${primero.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rf.ok) {
        ficha = await rf.json();
        if (Array.isArray(ficha?.attributes) && ficha.attributes.length) atributos = ficha.attributes;
      }
    } catch (_) { /* alcanza con los del resultado */ }

    const mapa = new Map<string, string>();
    for (const a of atributos) {
      const v = String(a?.value_name ?? "").trim();
      if (a?.id && v) mapa.set(String(a.id), v);
    }

    // Del catalogo tambien salen las fotos del fabricante y las
    // caracteristicas principales: enriquecen la publicacion y evitan pedirle
    // a quien vende que fotografie un producto que ya esta fotografiado.
    const fuente = ficha ?? primero;
    const imagenes = (fuente?.pictures ?? [])
      .map((p: any) => String(p?.secure_url ?? p?.url ?? "")).filter(Boolean);
    const caracteristicas = (fuente?.main_features ?? [])
      .map((f: any) => String(f?.text ?? f?.value ?? "")).filter(Boolean);
    const descripcion = fuente?.short_description?.content
      ? String(fuente.short_description.content) : null;

    // A que precio se vende hoy el mismo producto. Sirve para decidir con que
    // numero salir, que es una decision que hoy se toma a ciegas.
    let precios = null as null | { min: number; max: number; mediana: number; moneda: string; ofertas: number };
    // Por que no hay datos de mercado, cuando no los hay. "Sin datos" a secas
    // no deja distinguir un producto que nadie vende de una consulta que
    // fallo, y son cosas distintas.
    let mercadoMotivo: string | null = null;
    let competencia: Array<{
      precio: number; moneda: string; envioGratis: boolean;
      vendidos: number; condicion: string; ganaLaCompra: boolean;
    }> = [];
    try {
      const ri = await fetch(`https://api.mercadolibre.com/products/${primero.id}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!ri.ok) {
        mercadoMotivo = `Mercado Libre respondio ${ri.status} al pedir las ofertas`;
      }
      if (ri.ok) {
        const di = await ri.json();

        // Quien mas lo vende y en que condiciones. No se identifica a nadie:
        // lo que sirve para decidir es el precio, el envio y cuanto vendieron,
        // no quien es. Guardar vendedores ajenos seria juntar datos que no
        // necesitamos.
        const ganador = String(ficha?.buy_box_winner?.item_id ?? "");
        competencia = (di?.results ?? [])
          .map((it: any) => ({
            precio:       Number(it?.price) || 0,
            moneda:       String(it?.currency_id ?? ""),
            envioGratis:  it?.shipping?.free_shipping === true,
            vendidos:     Number(it?.sold_quantity) || 0,
            condicion:    String(it?.condition ?? ""),
            // En este endpoint el identificador es item_id; `id` no existe y
            // comparar contra undefined dejaba el ganador siempre en false.
            ganaLaCompra: String(it?.item_id ?? it?.id ?? "") === ganador,
          }))
          .filter((c: any) => c.precio > 0)
          .sort((a: any, b: any) => a.precio - b.precio)
          .slice(0, 8);

        const valores = (di?.results ?? [])
          .map((it: any) => Number(it?.price))
          .filter((n: number) => Number.isFinite(n) && n > 0)
          .sort((x: number, y: number) => x - y);
        if (valores.length) {
          const medio = Math.floor(valores.length / 2);
          precios = {
            min: valores[0],
            max: valores[valores.length - 1],
            mediana: valores.length % 2 ? valores[medio] : (valores[medio - 1] + valores[medio]) / 2,
            moneda: String((di?.results ?? [])[0]?.currency_id ?? ""),
            ofertas: valores.length,
          };
        }
      }
    } catch (e) {
      mercadoMotivo = "No se pudo consultar las ofertas: " + (e as Error).message;
    }

    // Respaldo: la ficha del producto trae el ganador de la compra y, a veces,
    // el rango de precios. Es menos que la lista completa pero es mejor que
    // nada, y evita mostrar "sin datos" cuando el precio esta a la vista.
    if (!precios) {
      const bbw = ficha?.buy_box_winner ?? primero?.buy_box_winner;
      const rango = ficha?.price_range ?? primero?.price_range;
      const p1 = Number(bbw?.price);
      const rmin = Number(rango?.min_price ?? rango?.min);
      const rmax = Number(rango?.max_price ?? rango?.max);
      const moneda = String(bbw?.currency_id ?? rango?.currency_id ?? "");
      if (Number.isFinite(rmin) && rmin > 0 && Number.isFinite(rmax) && rmax > 0) {
        precios = { min: rmin, max: rmax,
                    mediana: Number.isFinite(p1) && p1 > 0 ? p1 : (rmin + rmax) / 2,
                    moneda, ofertas: 0 };
        mercadoMotivo = null;
      } else if (Number.isFinite(p1) && p1 > 0) {
        precios = { min: p1, max: p1, mediana: p1, moneda, ofertas: 1 };
        mercadoMotivo = null;
      } else if (!mercadoMotivo) {
        mercadoMotivo = "Todavia nadie mas publica este producto";
      }
    }

    return {
      id: String(primero.id), nombre: String(primero.name ?? q),
      atributos: mapa, imagenes, caracteristicas, descripcion, precios, competencia,
      mercadoMotivo,
    };
  } catch (_) {
    return null;
  }
}

/**
 * Arma una descripcion ampliada y los argumentos de venta con lo que el
 * catalogo ya sabe.
 *
 * Una vez que alguien definio QUE producto es, el resto es informacion
 * publica del producto: no tiene sentido hacerselo escribir. Se sugiere, no
 * se impone: se devuelve aparte para que pueda revisarla y cambiarla antes
 * de usarla.
 */
function redactarFicha(c: NonNullable<Awaited<ReturnType<typeof buscarEnCatalogo>>>) {
  const partes: string[] = [];
  if (c.descripcion) partes.push(c.descripcion.trim());

  if (c.caracteristicas.length) {
    partes.push(c.caracteristicas.map((f) => `• ${f}`).join("\n"));
  }

  // Los atributos con nombre legible valen como ficha tecnica; los ids
  // sueltos no le dicen nada a nadie, asi que se omiten.
  const tecnica = [...c.atributos]
    .filter(([id]) => /^[A-Z_]+$/.test(id))
    .slice(0, 12)
    .map(([id, v]) => `${id.replace(/_/g, " ").toLowerCase()}: ${v}`);
  if (tecnica.length) partes.push("Ficha tecnica\n" + tecnica.join("\n"));

  return partes.join("\n\n") || null;
}

function argumentosDeFicha(c: NonNullable<Awaited<ReturnType<typeof buscarEnCatalogo>>>) {
  const puntos: string[] = [...c.caracteristicas];
  if (c.precios && c.precios.ofertas > 1) {
    puntos.push(
      `Hoy hay ${c.precios.ofertas} ofertas del mismo producto, entre ` +
      `${c.precios.moneda} ${c.precios.min} y ${c.precios.moneda} ${c.precios.max}.`,
    );
  }
  return puntos.slice(0, 8);
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
  delCatalogo?: Map<string, string> | null,
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
    if (puestos.has(r.id)) continue;
    // Si el catalogo lo tiene, ya no falta: se completa solo.
    const sugerido = delCatalogo?.get(r.id);
    if (sugerido) continue;
    problemas.push({
      campo: `attr:${r.id}`, etiqueta: r.nombre,
      mensaje: `"${req.nombre}" exige ${r.nombre.toLowerCase()}`,
      opciones: r.opciones, valor: valorDe.get(r.id) ?? null, tipo: r.tipo,
    });
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
