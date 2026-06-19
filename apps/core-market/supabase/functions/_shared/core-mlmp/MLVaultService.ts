// packages/core-mlmp/src/MLVaultService.ts
//
// CRUD sobre tabla `api_vault`.
// Resuelve credencial por tienda (tenant_id = storeId) con fallback
// a cuenta global (tenant_id = null).
// userId es obligatorio en INSERT (audita qué admin conectó la cuenta).

import { MLModuleError } from "./MLModuleError.ts";

export interface VaultCredential {
  id: string;
  tenant_id: string | null;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  client_id: string | null;
  client_secret: string | null;
  extra: Record<string, unknown>;
  user_id: string;
}

export interface SaveCredentialInput {
  provider: string;
  storeId: string | null;
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  clientId?: string | null;
  clientSecret?: string | null;
  extra?: Record<string, unknown>;
}

export class MLVaultService {
  constructor(
    // Supabase client — acepta cualquier instancia compatible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly supabase: any
  ) {}

  /**
   * Obtiene credencial para un provider dado un storeId.
   * Primero busca tenant_id = storeId, luego fallback a tenant_id = null.
   */
  async get(provider: string, storeId: string): Promise<VaultCredential | null> {
    // Intento 1: credencial específica de la tienda
    const { data: storeRow, error: storeErr } = await this.supabase
      .from("api_vault")
      .select("*")
      .eq("provider", provider)
      .eq("tenant_id", storeId)
      .maybeSingle();

    if (storeErr) {
      throw new MLModuleError("VAULT_ERROR", `Vault read error (store): ${storeErr.message}`);
    }
    if (storeRow) return storeRow as VaultCredential;

    // Intento 2: credencial global (tenant_id IS NULL)
    const { data: globalRow, error: globalErr } = await this.supabase
      .from("api_vault")
      .select("*")
      .eq("provider", provider)
      .is("tenant_id", null)
      .maybeSingle();

    if (globalErr) {
      throw new MLModuleError("VAULT_ERROR", `Vault read error (global): ${globalErr.message}`);
    }

    return (globalRow as VaultCredential) ?? null;
  }

  /**
   * Inserta o actualiza credencial.
   * userId es obligatorio (NOT NULL en api_vault.user_id).
   * En UPDATE preserva user_id original salvo que se pase explícitamente.
   */
  async save(input: SaveCredentialInput): Promise<VaultCredential> {
    const payload = {
      provider:      input.provider,
      tenant_id:     input.storeId,
      user_id:       input.userId,
      access_token:  input.accessToken,
      refresh_token: input.refreshToken ?? null,
      expires_at:    input.expiresAt?.toISOString() ?? null,
      client_id:     input.clientId ?? null,
      client_secret: input.clientSecret ?? null,
      extra:         input.extra ?? {},
    };

    const { data, error } = await this.supabase
      .from("api_vault")
      .upsert(payload, { onConflict: "provider,tenant_id" })
      .select()
      .single();

    if (error) {
      throw new MLModuleError("VAULT_ERROR", `Vault save error: ${error.message}`);
    }

    return data as VaultCredential;
  }

  /**
   * Actualiza solo el access_token y expires_at (post-refresh).
   * Preserva todos los demás campos.
   */
  async updateTokens(
    provider: string,
    storeId: string | null,
    accessToken: string,
    expiresAt: Date | null
  ): Promise<void> {
    const query = this.supabase
      .from("api_vault")
      .update({
        access_token: accessToken,
        expires_at:   expiresAt?.toISOString() ?? null,
      })
      .eq("provider", provider);

    if (storeId) {
      query.eq("tenant_id", storeId);
    } else {
      query.is("tenant_id", null);
    }

    const { error } = await query;
    if (error) {
      throw new MLModuleError("VAULT_ERROR", `Vault updateTokens error: ${error.message}`);
    }
  }

  /**
   * Elimina credencial de una tienda (o global si storeId = null).
   */
  async delete(provider: string, storeId: string | null): Promise<void> {
    const query = this.supabase
      .from("api_vault")
      .delete()
      .eq("provider", provider);

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
}
