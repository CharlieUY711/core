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


/**
 * ADAPTADOR AL ESQUEMA REAL DE api_vault
 *
 * Este servicio fue escrito contra un esquema que la tabla nunca tuvo. La
 * realidad, verificada contra produccion:
 *
 *   - la columna se llama `platform`, no `provider`, y guarda el nombre
 *     capitalizado ("MercadoLibre"), no el slug;
 *   - no existen columnas access_token / refresh_token / client_id: todo eso
 *     vive dentro de `value`, un JSON con claves camelCase
 *     (accessToken, refreshToken, expiresAt, appId, nickname, sellerId);
 *   - client_secret no esta en el vault: ml-oauth lo lee de la variable de
 *     entorno ML_SECRETS_{PLATFORM}_{SITE}, con formato "appId:clientSecret".
 *
 * Por eso la integracion nunca pudo recuperar un token que ella misma guardo:
 * quien escribe y quien lee usaban formas distintas. Se adapta el LECTOR, que
 * es el que estaba equivocado; ml-oauth funciona y no se toca.
 */
const PLATAFORMA_POR_PROVIDER: Record<string, string> = {
  mercadolibre: "MercadoLibre",
  mercadopago:  "MercadoPago",
};

function nombrePlataforma(provider: string): string {
  return PLATAFORMA_POR_PROVIDER[provider.toLowerCase()] ?? provider;
}

/** El siteId no se guarda como campo: viene en `name`, "MercadoLibre MLU · ...". */
function siteDesdeNombre(name: string | null): string {
  const partes = (name ?? "").split(/\s+/);
  return partes[1] && /^ML[A-Z]$/.test(partes[1]) ? partes[1] : "MLU";
}

function secretoDeEntorno(platform: string, siteId: string): { appId: string | null; clientSecret: string | null } {
  const clave = `ML_SECRETS_${platform.toUpperCase().replace(/\s/g, "")}_${siteId}`;
  const valor = Deno.env.get(clave);
  if (!valor) return { appId: null, clientSecret: null };
  const [appId, clientSecret] = valor.split(":");
  return { appId: appId || null, clientSecret: clientSecret || null };
}

/** Convierte una fila real de api_vault a la forma que espera TokenManager. */
function filaACredencial(fila: Record<string, any>, provider: string): VaultCredential {
  let v: Record<string, any> = {};
  try {
    v = typeof fila.value === "string" ? JSON.parse(fila.value) : (fila.value ?? {});
  } catch {
    throw new MLModuleError("VAULT_ERROR", `El campo value de api_vault no es JSON valido (id=${fila.id})`);
  }

  const site = siteDesdeNombre(fila.name);
  const env  = secretoDeEntorno(fila.platform ?? nombrePlataforma(provider), site);

  const { accessToken, refreshToken, expiresAt, appId, ...resto } = v;

  return {
    id:            fila.id,
    tenant_id:     fila.tenant_id ?? null,
    provider,
    access_token:  accessToken ?? "",
    refresh_token: refreshToken ?? null,
    expires_at:    fila.expires_at ?? expiresAt ?? null,
    client_id:     appId ?? env.appId,
    client_secret: env.clientSecret,
    extra:         { ...resto, site },
    user_id:       fila.user_id,
  };
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
    const plataforma = nombrePlataforma(provider);

    // Intento 1: credencial específica de la tienda
    const { data: storeRow, error: storeErr } = await this.supabase
      .from("api_vault")
      .select("*")
      .eq("platform", plataforma)
      .eq("type", "oauth")
      .eq("tenant_id", storeId)
      .maybeSingle();

    if (storeErr) {
      throw new MLModuleError("VAULT_ERROR", `Vault read error (store): ${storeErr.message}`);
    }
    if (storeRow) return filaACredencial(storeRow, provider);

    // Intento 2: credencial global (tenant_id IS NULL)
    const { data: globalRow, error: globalErr } = await this.supabase
      .from("api_vault")
      .select("*")
      .eq("platform", plataforma)
      .eq("type", "oauth")
      .is("tenant_id", null)
      .maybeSingle();

    if (globalErr) {
      throw new MLModuleError("VAULT_ERROR", `Vault read error (global): ${globalErr.message}`);
    }

    return globalRow ? filaACredencial(globalRow, provider) : null;
  }

  /**
   * Inserta o actualiza credencial.
   * userId es obligatorio (NOT NULL en api_vault.user_id).
   * En UPDATE preserva user_id original salvo que se pase explícitamente.
   */
  /**
   * NO ADAPTADO al esquema real, y sin llamadores: escribe columnas
   * (provider, access_token, refresh_token, client_id) que api_vault no tiene.
   * Quien realmente persiste credenciales es la edge function ml-oauth, que
   * escribe directo en la tabla con la forma correcta. Antes de usar este
   * metodo hay que reescribirlo siguiendo ml-oauth, o directamente borrarlo.
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
    // El token vive dentro del JSON `value`, no en columnas propias, asi que
    // hay que leer la fila, mezclar y reescribir. Se conservan las demas claves
    // (refreshToken, appId, sellerId, nickname) para no perderlas al refrescar.
    const actual = await this.get(provider, storeId ?? "");
    if (!actual) {
      throw new MLModuleError("VAULT_ERROR", `No hay credencial para actualizar (provider=${provider})`);
    }

    const { data: fila, error: leerErr } = await this.supabase
      .from("api_vault").select("value").eq("id", actual.id).maybeSingle();
    if (leerErr) {
      throw new MLModuleError("VAULT_ERROR", `Vault updateTokens read error: ${leerErr.message}`);
    }

    let valor: Record<string, unknown> = {};
    try {
      valor = typeof fila?.value === "string" ? JSON.parse(fila.value) : (fila?.value ?? {});
    } catch {
      valor = {};
    }

    valor.accessToken = accessToken;
    if (expiresAt) valor.expiresAt = expiresAt.toISOString();

    const { error } = await this.supabase
      .from("api_vault")
      .update({
        value:      JSON.stringify(valor),
        expires_at: expiresAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", actual.id);
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
      .eq("platform", nombrePlataforma(provider))
      .eq("type", "oauth");

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
