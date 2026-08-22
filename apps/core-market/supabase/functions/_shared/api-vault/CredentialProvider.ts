// supabase/functions/_shared/api-vault/CredentialProvider.ts
//
// DEC-011 — API Vault como Credential Provider central.
//
// Este módulo es el ÚNICO punto genérico de RESOLVE / DELIVER / REPORT /
// HEALTH sobre `public.api_vault`. Corre server-side (Edge Functions) con
// la service_role key: las RLS policies de api_vault (auth.uid() = user_id)
// no aplican a service_role, así que este módulo es, en los hechos, el
// gatekeeper — no hay otra capa de autorización entre esto y la tabla.
// Por eso NUNCA debe exponerse tal cual a un cliente browser/anon.
//
// Lo que este módulo NO sabe y NO debe llegar a saber (regla DEC-011 §5):
//   accessToken, sellerId, nickname, endpoints de un proveedor específico,
//   payloads OAuth, nombres de proveedores hardcodeados.
// `value` es opaco: un string (a veces JSON serializado por el consumidor,
// a veces un valor plano) que el CONSUMIDOR interpreta, no el Vault.
//
// Lifecycle (OAuth, refresh, client_secret) sigue siendo responsabilidad de
// cada proveedor (ej. core-mlmp/TokenManager.ts + MLVaultService.ts para
// MercadoLibre/MercadoPago). Este módulo no reemplaza eso: es el punto de
// resolución de la fila, no el dueño del ciclo de vida de la credencial.

// deno-lint-ignore-file no-explicit-any
export type SupabaseLike = any;

export type VaultStatus =
  | "active"
  | "expired"
  | "invalid"
  | "revoked"
  | "requires_reauth"
  | "error"
  | "unknown";

const VALID_STATUSES: readonly VaultStatus[] = [
  "active",
  "expired",
  "invalid",
  "revoked",
  "requires_reauth",
  "error",
  "unknown",
];

export interface ResolveInput {
  /** Valor de `api_vault.platform`. Comparación exacta — el Vault no conoce
   *  alias ni casing por proveedor; esa normalización es responsabilidad del
   *  consumidor (ver ejemplo: MLVaultService.nombrePlataforma). */
  platform: string;
  /** Tenant/tienda dueña de la credencial. Si no hay fila específica del
   *  tenant, se hace fallback a la credencial global (tenant_id IS NULL). */
  tenantId?: string | null;
  /** Filtro opcional por tipo de credencial (api_key | token | oauth | ...). */
  type?: string;
  /** Filtro opcional por entorno (production | staging | ...). Default: no
   *  filtra — el llamador decide si le importa. */
  env?: string;
}

export interface ResolvedCredential {
  credentialId: string;
  /** Valor crudo tal cual está en `api_vault.value`. Opaco para el Vault. */
  value: string;
  metadata: {
    platform: string;
    tenantId: string | null;
    type: string;
    env: string;
    expiresAt: string | null;
    status: VaultStatus;
    /** true si la fila resuelta fue la global (tenant_id IS NULL) y no una
     *  específica del tenant pedido — útil para decidir si loggear el
     *  fallback. */
    resolvedAsGlobal: boolean;
  };
}

export interface ReportInput {
  credentialId: string;
  outcome: VaultStatus;
  /** Mensaje de error corto. Nunca debe contener el secreto (`value`). */
  error?: string | null;
}

function normalizeError(msg: string | null | undefined): string | null {
  if (!msg) return null;
  // No confiar en que el llamador nunca va a pegar el secreto en el error
  // por accidente (ej. un throw que interpola el token). Recorte defensivo
  // de longitud; no es un filtro de contenido, sólo un límite razonable
  // para no persistir payloads gigantes en `last_error`.
  return msg.length > 500 ? msg.slice(0, 500) + "…" : msg;
}

/**
 * RESOLVE + DELIVER.
 *
 * Busca primero la credencial específica del tenant (`platform` + `type`? +
 * `tenant_id = tenantId`); si no existe, busca la global (`tenant_id IS
 * NULL`). Este es el mismo patrón tenant → global que ya usa
 * MLVaultService.get() para MercadoLibre/MercadoPago, generalizado.
 *
 * Devuelve null si no hay ninguna credencial (ni de tenant ni global).
 * No filtra por expiración ni por status acá — HEALTH es informativo, la
 * decisión de qué hacer con una credencial `expired`/`invalid` es del
 * consumidor (ej. TokenManager decide refrescar).
 */
export async function resolveCredential(
  supabase: SupabaseLike,
  input: ResolveInput,
): Promise<ResolvedCredential | null> {
  const cols =
    "id, value, platform, tenant_id, type, env, expires_at, status";

  let tenantRow: any = null;
  if (input.tenantId) {
    let q = supabase
      .from("api_vault")
      .select(cols)
      .eq("platform", input.platform)
      .eq("tenant_id", input.tenantId);
    if (input.type) q = q.eq("type", input.type);
    if (input.env) q = q.eq("env", input.env);
    const { data, error } = await q.maybeSingle();
    if (error) {
      throw new Error(`[CredentialProvider] resolve (tenant) failed: ${error.message}`);
    }
    tenantRow = data;
  }

  if (tenantRow) {
    return toResolved(tenantRow, /* resolvedAsGlobal */ false);
  }

  let gq = supabase
    .from("api_vault")
    .select(cols)
    .eq("platform", input.platform)
    .is("tenant_id", null);
  if (input.type) gq = gq.eq("type", input.type);
  if (input.env) gq = gq.eq("env", input.env);
  const { data: globalRow, error: globalErr } = await gq.maybeSingle();
  if (globalErr) {
    throw new Error(`[CredentialProvider] resolve (global) failed: ${globalErr.message}`);
  }
  if (!globalRow) return null;

  return toResolved(globalRow, /* resolvedAsGlobal */ true);
}

function toResolved(row: any, resolvedAsGlobal: boolean): ResolvedCredential {
  return {
    credentialId: row.id,
    value: row.value,
    metadata: {
      platform: row.platform,
      tenantId: row.tenant_id ?? null,
      type: row.type,
      env: row.env,
      expiresAt: row.expires_at ?? null,
      status: (row.status ?? "unknown") as VaultStatus,
      resolvedAsGlobal,
    },
  };
}

/**
 * REPORT.
 *
 * Un consumidor informa el resultado de haber usado la credencial
 * `credentialId` (identificada por `api_vault.id`, NO por platform — puede
 * haber más de una credencial por plataforma con distintos tenants).
 * Persiste HEALTH: status, last_checked_at, last_error.
 *
 * No valida que el llamador "sea dueño" de la credencial más allá de que
 * este módulo corre con service_role — la autorización de quién puede
 * invocar REPORT es responsabilidad de la Edge Function que lo llama (ya
 * que ninguna de ellas expone `credentialId` a un cliente no confiable hoy).
 */
export async function reportCredentialOutcome(
  supabase: SupabaseLike,
  input: ReportInput,
): Promise<void> {
  if (!VALID_STATUSES.includes(input.outcome)) {
    throw new Error(
      `[CredentialProvider] report: outcome inválido "${input.outcome}". ` +
        `Válidos: ${VALID_STATUSES.join(", ")}`,
    );
  }

  const { error } = await supabase
    .from("api_vault")
    .update({
      status: input.outcome,
      last_checked_at: new Date().toISOString(),
      last_error: input.outcome === "active" ? null : normalizeError(input.error),
    })
    .eq("id", input.credentialId);

  if (error) {
    throw new Error(`[CredentialProvider] report failed (id=${input.credentialId}): ${error.message}`);
  }
}

/**
 * HEALTH (lectura). Devuelve el estado persistido de una credencial por id.
 * Conveniencia sobre lo que REPORT ya escribió — no recalcula nada.
 */
export async function getCredentialHealth(
  supabase: SupabaseLike,
  credentialId: string,
): Promise<{ status: VaultStatus; lastCheckedAt: string | null; lastError: string | null } | null> {
  const { data, error } = await supabase
    .from("api_vault")
    .select("status, last_checked_at, last_error")
    .eq("id", credentialId)
    .maybeSingle();

  if (error) {
    throw new Error(`[CredentialProvider] health failed (id=${credentialId}): ${error.message}`);
  }
  if (!data) return null;

  return {
    status: (data.status ?? "unknown") as VaultStatus,
    lastCheckedAt: data.last_checked_at ?? null,
    lastError: data.last_error ?? null,
  };
}
