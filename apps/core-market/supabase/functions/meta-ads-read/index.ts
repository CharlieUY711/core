// meta-ads-read — lectura de Meta Marketing API para la tienda del caller.
//
// Flujo completo (F8C):
//   CORE Market Edge Function
//     -> CredentialProvider REAL (api_vault, DEC-011)
//     -> core-meta-ads
//     -> Meta Marketing API
//
// Es READ-ONLY: cuenta publicitaria, campanias, ad sets, anuncios e
// insights. No hay una sola operacion de escritura, ni OAuth, ni
// almacenamiento propio. Las cinco operaciones son las que ya implementan
// los Readers de core-meta-ads; esta funcion solo rutea y valida input.
//
// -- Secretos ---------------------------------------------------------------
// `appSecret` y `accessToken` se resuelven aca dentro y se pasan a los
// Readers. NUNCA salen: no se loguean, no se serializan en la respuesta y
// no se incluyen en ningun mensaje de error. `credenciales` no se pasa por
// `console.*` en ningun punto y esta funcion no imprime nada.
//
// -- Autorizacion -----------------------------------------------------------
// Tres controles, en orden:
//
// 1. JWT valido (obligatorio).
// 2. Rol admin, via el RPC `is_admin()` que ya existe en el schema
//    (profiles.role in ('admin','superadmin'), SECURITY DEFINER, con GRANT a
//    `authenticated`). No se inventa una politica nueva: es el mismo
//    primitivo que usan admin_fix_stock, admin_pause_product,
//    admin_update_product y la policy "admin only access". Hace falta porque
//    handle_new_user da rol 'buyer' por default: sin este control, cualquier
//    comprador con claim de la tienda leeria el gasto publicitario de esa
//    tienda. Se llama con el cliente del usuario, no con el admin: is_admin()
//    resuelve por auth.uid(), que con service_role es null.
// 3. Tienda: claim de raiz `store_id` del JWT (mismo mecanismo que
//    ml-sync/publicar-en-ml, emitido por el custom access token hook), con
//    fallback a `user_metadata.store_id`. A diferencia de esas funciones, aca
//    NO se acepta un `storeId` por body: este endpoint entrega datos
//    derivados de una credencial del Vault, y permitir que el caller elija el
//    tenant abriria acceso cruzado entre tiendas.
//
// -- Request ----------------------------------------------------------------
//   POST { operacion, adAccountId, ...params }
//     operacion: "cuenta" | "campanias" | "adsets" | "anuncios" | "insights"
//     adAccountId: "act_<id>"  (requerido siempre)
//     campanias:   { limit?, after? }
//     adsets:      { campaignId, limit?, after? }
//     anuncios:    { adSetId, limit?, after? }
//     insights:    { entityId, entityType, since, until }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createMetaAdsCredentialProvider,
  createMetaAdsReaders,
  MetaModuleError,
  resolveMetaCredentials,
} from "../_shared/core-meta-ads/index.ts";
import type {
  MetaAccountRef,
  MetaAdsCredentials,
  MetaApiError,
  MetaApiResult,
  MetaCredentialProvider,
  MetaInsightEntityType,
} from "../_shared/core-meta-ads/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPERACIONES = ["cuenta", "campanias", "adsets", "anuncios", "insights"] as const;
type Operacion = (typeof OPERACIONES)[number];

const ENTITY_TYPES: readonly MetaInsightEntityType[] = ["account", "campaign", "adset", "ad"];

/** Techo de paginacion, mismo criterio que el `limit` de ml-sync. */
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

const AD_ACCOUNT_ID_PATTERN = /^act_\d+$/;
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface Body {
  operacion?: string;
  adAccountId?: string;
  campaignId?: string;
  adSetId?: string;
  entityId?: string;
  entityType?: string;
  since?: string;
  until?: string;
  limit?: number;
  after?: string;
}

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Lee un claim de la raiz del JWT. El custom access token hook emite
 * `store_id` ahi, no dentro de user_metadata (ver ml-sync/index.ts, mismo
 * helper y mismo motivo).
 */
function claimDeJwt(authHeader: string | null, clave: string): string | null {
  try {
    if (!authHeader) return null;
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const parte = token.split(".")[1];
    if (!parte) return null;
    const payload = JSON.parse(atob(parte.replace(/-/g, "+").replace(/_/g, "/")));
    const v = payload?.[clave];
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Traduce la categoria de un MetaModuleError al status HTTP que le toca. */
function statusDeCategoria(categoria: string): number {
  switch (categoria) {
    case "validation":
      return 400;
    case "authorization":
      return 403;
    case "credentials":
    case "authentication":
      return 424; // dependencia (el Vault) no tiene una credencial usable
    case "rate_limit":
      return 429;
    case "configuration":
      return 500;
    default:
      return 502; // meta_api y cualquier otra: falla del upstream
  }
}

/**
 * Clasifica un `MetaApiError` como señal inequívoca de credencial rota.
 * `OAuthException` es la única categoría que Graph API documenta como
 * "el access_token en sí es inválido/vencido/revocado" (ver
 * https://developers.facebook.com/docs/graph-api/guides/error-handling).
 * Deliberadamente NO se intenta distinguir expired/revoked/requires_reauth
 * a partir del subcódigo: Meta no lo garantiza de forma consistente en el
 * shape base del error, y adivinarlo inventaría una taxonomía que DEC-011
 * no define. Toda OAuthException se reporta como `invalid`.
 */
function esErrorDeCredencialInvalida(error: MetaApiError | undefined): boolean {
  return error?.type === "OAuthException";
}

/**
 * REPORT/HEALTH (F8E, DEC-011) — best-effort. Un fallo acá nunca debe
 * alterar la respuesta que ya se le va a dar al caller sobre la operación
 * en sí: por eso esta función no lanza (el adapter ya es best-effort
 * puertas adentro, pero se blinda una vez más acá porque `provider` es un
 * `MetaCredentialProvider` genérico y `reportCredentialOutcome` es
 * opcional en el contrato).
 */
async function reportarSaludDeCredencial(
  provider: MetaCredentialProvider,
  ref: MetaAccountRef,
  resultado: MetaApiResult<unknown>,
): Promise<void> {
  if (!provider.reportCredentialOutcome) return;
  try {
    if (resultado.ok) {
      await provider.reportCredentialOutcome(ref, "active");
    } else if (esErrorDeCredencialInvalida(resultado.error)) {
      await provider.reportCredentialOutcome(ref, "invalid", resultado.error?.message ?? null);
    }
    // Cualquier otro error (meta_api generico, rate limit ya manejado
    // antes como excepcion, etc.) no corresponde al estado de la
    // credencial: no se reporta.
  } catch {
    // best-effort, ver doc de la funcion.
  }
}

/**
 * Normaliza el resultado de un Reader. `MetaApiResult` no lanza en el
 * camino de error: devuelve `ok: false` con el error ya normalizado por
 * `HttpMetaClient`. Se propaga el mensaje de Meta (util para diagnosticar)
 * pero nada mas: ni la URL de la request (que lleva el access_token en la
 * query string), ni el body crudo, ni la credencial.
 */
async function respuestaDeResultado<T>(
  resultado: MetaApiResult<T>,
  provider: MetaCredentialProvider,
  ref: MetaAccountRef,
): Promise<Response> {
  await reportarSaludDeCredencial(provider, ref, resultado);

  if (!resultado.ok || resultado.data === undefined) {
    return json(
      {
        error: resultado.error?.message ?? "Meta API devolvio un error sin detalle.",
        codigo: resultado.error?.code ?? null,
        tipo: resultado.error?.type ?? null,
      },
      502,
    );
  }
  return json({ data: resultado.data }, 200);
}

function limitePaginacion(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

async function ejecutar(
  operacion: Operacion,
  body: Body,
  credenciales: MetaAdsCredentials,
  provider: MetaCredentialProvider,
  ref: MetaAccountRef,
): Promise<Response> {
  const readers = createMetaAdsReaders();
  const limit = limitePaginacion(body.limit);
  const after = typeof body.after === "string" && body.after.length > 0 ? body.after : undefined;
  const paginacion = after !== undefined ? { limit, after } : { limit };

  switch (operacion) {
    case "cuenta":
      return respuestaDeResultado(await readers.accounts.getAdAccount(credenciales), provider, ref);

    case "campanias":
      return respuestaDeResultado(
        await readers.campaigns.listCampaigns(credenciales, paginacion),
        provider,
        ref,
      );

    case "adsets": {
      if (!body.campaignId) return json({ error: "Falta 'campaignId'." }, 400);
      return respuestaDeResultado(
        await readers.adSets.listAdSets(credenciales, body.campaignId, paginacion),
        provider,
        ref,
      );
    }

    case "anuncios": {
      if (!body.adSetId) return json({ error: "Falta 'adSetId'." }, 400);
      return respuestaDeResultado(
        await readers.ads.listAds(credenciales, body.adSetId, paginacion),
        provider,
        ref,
      );
    }

    case "insights": {
      if (!body.entityId) return json({ error: "Falta 'entityId'." }, 400);
      if (!ENTITY_TYPES.includes(body.entityType as MetaInsightEntityType)) {
        return json(
          { error: `'entityType' debe ser uno de: ${ENTITY_TYPES.join(", ")}.` },
          400,
        );
      }
      if (!body.since || !FECHA_PATTERN.test(body.since) || !body.until || !FECHA_PATTERN.test(body.until)) {
        return json({ error: "'since' y 'until' deben tener formato YYYY-MM-DD." }, 400);
      }
      return respuestaDeResultado(
        await readers.insights.getInsights(
          credenciales,
          { entityId: body.entityId, entityType: body.entityType as MetaInsightEntityType },
          { since: body.since, until: body.until },
        ),
        provider,
        ref,
      );
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // -- Auth -----------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "No autorizado" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "No autorizado" }, 401);

  // Rol: mismo primitivo que el resto de las operaciones admin del schema.
  // Falla cerrado — si el RPC no responde, se deniega.
  const { data: esAdmin, error: rolError } = await userClient.rpc("is_admin");
  if (rolError || esAdmin !== true) {
    return json({ error: "Acceso denegado: se requiere rol admin" }, 403);
  }

  // La tienda la fija el JWT, nunca el body: ver nota de autorizacion arriba.
  const storeId = claimDeJwt(authHeader, "store_id")
    ?? (user.user_metadata?.store_id as string | undefined)
    ?? null;
  if (!storeId) return json({ error: "No se pudo determinar la tienda del usuario." }, 403);

  // -- Input ----------------------------------------------------------------
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body invalido: se esperaba JSON." }, 400);
  }

  const operacion = body.operacion as Operacion | undefined;
  if (!operacion || !OPERACIONES.includes(operacion)) {
    return json({ error: `'operacion' debe ser una de: ${OPERACIONES.join(", ")}.` }, 400);
  }
  if (!body.adAccountId || !AD_ACCOUNT_ID_PATTERN.test(body.adAccountId)) {
    return json({ error: "'adAccountId' debe tener el formato 'act_<id>'." }, 400);
  }

  // Misma referencia para RESOLVE y para REPORT: HEALTH debe reportarse
  // contra la credencial de la cuenta+tienda efectivamente usada.
  const ref: MetaAccountRef = { adAccountId: body.adAccountId, tenantId: storeId };
  let provider: MetaCredentialProvider | undefined;

  try {
    // -- Credenciales (F8B): Vault REAL -> core-meta-ads --------------------
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    provider = createMetaAdsCredentialProvider(admin);
    const credenciales = await resolveMetaCredentials(provider, ref);

    // -- READ (F8C): core-meta-ads -> Meta Marketing API -------------------
    // REPORT/HEALTH (F8E) se resuelve adentro, por operacion, en
    // respuestaDeResultado().
    return await ejecutar(operacion, body, credenciales, provider, ref);
  } catch (err) {
    // `MetaModuleError.message` esta construido para no contener secretos
    // (ver core-meta-ads). `cause` puede tener detalle crudo del Vault o de
    // la red: se descarta deliberadamente, no se serializa ni se loguea.
    if (err instanceof MetaModuleError) {
      // REPORT/HEALTH (F8E): solo la categoria "credentials" refleja el
      // estado de la credencial en si (fila rota/incompleta resuelta por
      // el Vault). "authorization" (credencial fijada a otra cuenta),
      // "validation", "rate_limit" y el resto NO son un problema de la
      // credencial y no corresponden a REPORT (ver
      // MetaCredentialProvider.reportCredentialOutcome). Si nunca se
      // identifico un credentialId (p. ej. no habia fila en el Vault), el
      // adapter no tiene contra que reportar y no hace nada.
      if (err.category === "credentials" && provider?.reportCredentialOutcome) {
        try {
          await provider.reportCredentialOutcome(ref, "invalid", err.message);
        } catch {
          // best-effort
        }
      }
      return json({ error: err.message, categoria: err.category }, statusDeCategoria(err.category));
    }
    return json({ error: "Error inesperado procesando la solicitud." }, 500);
  }
});
