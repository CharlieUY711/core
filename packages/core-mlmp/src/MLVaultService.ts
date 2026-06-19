// packages/core-mlmp/src/MLVaultService.ts
//
// CRUD sobre la tabla real `api_vault`.
//
// IMPORTANTE — reescrito el 2026-06-18:
// La versión anterior de este archivo asumía columnas que NUNCA
// existieron en la tabla real (provider, access_token, refresh_token,
// client_id, client_secret como columnas sueltas). La tabla real
// (ver migrations/20260607_api_vault.sql + 20260618_api_vault_tenant_id.sql)
// tiene: platform, type, value (JSON serializado como texto),
// tenant_id (uuid, nullable = global), tags, name, env, expires_at.
//
// api_vault es una herramienta de CORE independiente de cualquier
// integración puntual — debe poder usarse standalone para guardar
// credenciales de cualquier `platform` (mercadolibre, mercadopago,
// meta, whatsapp, lo que sea), no solo las que núcleo conoce hoy.
// Por eso esta clase no tiene ningún literal de provider hardcodeado.
//
// Resuelve credencial por tienda (tenant_id = storeId) con fallback
// a cuenta global (tenant_id = null), igual semántica que antes.
// userId es obligatorio en INSERT (audita qué admin conectó la cuenta).

import { MLModuleError } from "./MLModuleError.ts";

// Forma "plana" que el resto del paquete (TokenManager, OAuthService)
// sigue consumiendo — se mantiene igual para no romper sus imports.
// Internamente se construye/destruye a partir de la fila real de la
// tabla (platform/value JSON/tenant_id).
export interface VaultCredential {
  id: string;
  tenant_id: string | null;
  provider: string; // alias de `platform` en la tabla real
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  client_id: string | null;
  client_secret: string | null;
  extra: Record<string, unknown>;
  user_id: string;
}

export interface SaveCredentialInput {
  provider: string; // se persiste como `platform`
  storeId: string | null; // se persiste como `tenant_id`
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  clientId?: string | null;
  clientSecret?: string | null;
  extra?: Record<string, unknown>;
}

// Forma real de una fila en api_vault (lo que efectivamente devuelve
// Supabase). `value` llega como texto y hay que parsearlo.
interface ApiVaultRow {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  type: string;
  value: string; // JSON.stringify(VaultValue)
  env: string;
  tags: string[];
  tenant_id: string | null;
  expires_at: string | null;
}

// Forma del JSON guardado dentro de `value`
interface VaultValue {
  accessToken: string;
  refreshToken?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  extra?: Record<string, unknown>;
}

const TABLE = "api_vault";
const TYPE = "oauth";

function rowToCredential(row: ApiVaultRow): VaultCredential {
  let parsed: VaultValue;
  try {
    parsed = JSON.parse(row.value) as VaultValue;
  } catch {
    throw new MLModuleError(
      "VAULT_ERROR",
      `Corrupt value JSON in api_vault row ${row.id} (platform=${row.platform})`
    );
  }

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    provider: row.platform,
    access_token: parsed.accessToken,
    refresh_token: parsed.refreshToken ?? null,
    expires_at: row.expires_at,
    client_id: parsed.clientId ?? null,
    client_secret: parsed.clientSecret ?? null,
    extra: parsed.extra ?? {},
    user_id: row.user_id,
  };
}

export class MLVaultService {
  constructor(
    // Supabase client — acepta cualquier instancia compatible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly supabase: any
  ) {}

  /**
   * Obtiene credencial para un provider (platform) dado un storeId.
   * Primero busca tenant_id = storeId, luego fallback a tenant_id = null.
   */
  async get(provider: string, storeId: string): Promise<VaultCredential | null> {
    // Intento 1: credencial específica de la tienda
    const { data: storeRow, error: storeErr } = await this.supabase
      .from(TABLE)
      .select("*")
      .eq("platform", provider)
      .eq("type", TYPE)
      .eq("tenant_id", storeId)
      .maybeSingle();

    if (storeErr) {
      throw new MLModuleError("VAULT_ERROR", `Vault read error (store): ${storeErr.message}`);
    }
    if (storeRow) return rowToCredential(storeRow as ApiVaultRow);

    // Intento 2: credencial global (tenant_id IS NULL)
    const { data: globalRow, error: globalErr } = await this.supabase
      .from(TABLE)
      .select("*")
      .eq("platform", provider)
      .eq("type", TYPE)
      .is("tenant_id", null)
      .maybeSingle();

    if (globalErr) {
      throw new MLModuleError("VAULT_ERROR", `Vault read error (global): ${globalErr.message}`);
    }

    return globalRow ? rowToCredential(globalRow as ApiVaultRow) : null;
  }

  /**
   * Inserta o actualiza credencial.
   * userId es obligatorio (NOT NULL en api_vault.user_id).
   * En UPDATE preserva user_id original salvo que se pase explícitamente.
   *
   * onConflict usa el índice único real: (platform, tenant_id) para
   * tenant_id IS NOT NULL, o (platform) cuando es NULL — ver migración
   * 20260618_api_vault_tenant_id.sql. Como Supabase upsert necesita un
   * único onConflict, resolvemos manualmente: buscamos primero y
   * hacemos update/insert según corresponda.
   */
  async save(input: SaveCredentialInput): Promise<VaultCredential> {
    const value: VaultValue = {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      clientId: input.clientId ?? null,
      clientSecret: input.clientSecret ?? null,
      extra: input.extra ?? {},
    };

    const existing = await this._findRaw(input.provider, input.storeId);

    const name = `${input.provider}${input.storeId ? ` · Tienda ${input.storeId}` : " · Global"}`;
    const payload = {
      user_id: input.userId,
      name,
      platform: input.provider,
      type: TYPE,
      value: JSON.stringify(value),
      env: "production",
      tenant_id: input.storeId,
      expires_at: input.expiresAt?.toISOString() ?? null,
    };

    if (existing) {
      const { data, error } = await this.supabase
        .from(TABLE)
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw new MLModuleError("VAULT_ERROR", `Vault save (update) error: ${error.message}`);
      return rowToCredential(data as ApiVaultRow);
    }

    const { data, error } = await this.supabase
      .from(TABLE)
      .insert({ ...payload, tags: [] })
      .select()
      .single();

    if (error) throw new MLModuleError("VAULT_ERROR", `Vault save (insert) error: ${error.message}`);
    return rowToCredential(data as ApiVaultRow);
  }

  /**
   * Actualiza solo el access_token y expires_at (post-refresh).
   * Preserva todos los demás campos (incluido refresh_token/client
   * secrets dentro de `value`).
   */
  async updateTokens(
    provider: string,
    storeId: string | null,
    accessToken: string,
    expiresAt: Date | null
  ): Promise<void> {
    const existing = await this._findRaw(provider, storeId);
    if (!existing) {
      throw new MLModuleError(
        "VAULT_ERROR",
        `updateTokens: no existing credential for platform=${provider} tenant_id=${storeId}`
      );
    }

    let value: VaultValue;
    try {
      value = JSON.parse(existing.value) as VaultValue;
    } catch {
      throw new MLModuleError("VAULT_ERROR", `Corrupt value JSON in api_vault row ${existing.id}`);
    }

    value.accessToken = accessToken;

    const { error } = await this.supabase
      .from(TABLE)
      .update({
        value: JSON.stringify(value),
        expires_at: expiresAt?.toISOString() ?? null,
      })
      .eq("id", existing.id);

    if (error) {
      throw new MLModuleError("VAULT_ERROR", `Vault updateTokens error: ${error.message}`);
    }
  }

  /**
   * Elimina credencial de una tienda (o global si storeId = null).
   */
  async delete(provider: string, storeId: string | null): Promise<void> {
    const query = this.supabase
      .from(TABLE)
      .delete()
      .eq("platform", provider)
      .eq("type", TYPE);

    if (storeId) {
      query.eq("tenant_id", storeId);
    } else {
      query.is("tenant_id", null);
    }

    const { error } = await query;
    if (error) {
      throw new MLModuleError("VAULT_ERROR", `Vault delete error: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------
  // Helper interno: busca la fila cruda (sin parsear) por
  // (platform, tenant_id), respetando NULL como global.
  // ---------------------------------------------------------------
  private async _findRaw(provider: string, storeId: string | null): Promise<ApiVaultRow | null> {
    const query = this.supabase
      .from(TABLE)
      .select("*")
      .eq("platform", provider)
      .eq("type", TYPE);

    if (storeId) {
      query.eq("tenant_id", storeId);
    } else {
      query.is("tenant_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new MLModuleError("VAULT_ERROR", `Vault lookup error: ${error.message}`);
    }
    return (data as ApiVaultRow) ?? null;
  }
}
