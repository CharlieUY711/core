// packages/core-mlmp/src/TokenManager.ts
//
// Obtiene tokens OAuth2 para MercadoLibre y MercadoPago.
// - Refresh automático con margen de 5 minutos antes de expiración.
// - Deduplicación de refreshes concurrentes (_inflight Map).
// - Persiste el token renovado en el vault automáticamente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MLVaultService } from "./MLVaultService.ts";
import { MLModuleError } from "./MLModuleError.ts";

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";

// Margen en segundos antes de expiración para forzar refresh
const REFRESH_MARGIN_SECONDS = 5 * 60;

// Map para deduplicar refreshes concurrentes por (provider, storeId)
const _inflight = new Map<string, Promise<string>>();

function makeKey(provider: string, storeId: string): string {
  return `${provider}::${storeId}`;
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  return exp - now < REFRESH_MARGIN_SECONDS * 1000;
}

async function refreshToken(
  tokenUrl: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new MLModuleError(
      "REFRESH_FAILED",
      `Token refresh failed (${resp.status}): ${body.message ?? JSON.stringify(body)}`
    );
  }

  return resp.json();
}

function buildSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getToken(
  provider: string,
  tokenUrl: string,
  storeId: string
): Promise<string> {
  const key = makeKey(provider, storeId);

  // Si ya hay un refresh en vuelo para este (provider, storeId), esperarlo
  const inflight = _inflight.get(key);
  if (inflight) return inflight;

  const promise = (async (): Promise<string> => {
    const supabase = buildSupabase();
    const vault = new MLVaultService(supabase);

    const cred = await vault.get(provider, storeId);
    if (!cred) {
      throw new MLModuleError(
        "NO_CREDENTIAL",
        `No credential found for provider=${provider} storeId=${storeId}`
      );
    }

    // Token vigente — devolver directamente
    if (!isExpiringSoon(cred.expires_at)) {
      return cred.access_token;
    }

    // Necesita refresh
    if (!cred.refresh_token) {
      throw new MLModuleError(
        "REFRESH_FAILED",
        `Token expired and no refresh_token available for provider=${provider}`
      );
    }
    if (!cred.client_id || !cred.client_secret) {
      throw new MLModuleError(
        "MISSING_CLIENT_SECRET",
        `Missing client_id or client_secret for provider=${provider}`
      );
    }

    const refreshed = await refreshToken(
      tokenUrl,
      cred.refresh_token,
      cred.client_id,
      cred.client_secret
    );

    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    // Persistir token renovado en el vault
    await vault.updateTokens(provider, storeId, refreshed.access_token, newExpiresAt);

    return refreshed.access_token;
  })();

  _inflight.set(key, promise);

  try {
    return await promise;
  } finally {
    _inflight.delete(key);
  }
}

/**
 * Obtiene un token válido de MercadoLibre para la tienda indicada.
 * Refresca automáticamente si está por vencer.
 */
export function getMLToken(storeId: string): Promise<string> {
  return getToken("mercadolibre", ML_TOKEN_URL, storeId);
}

/**
 * Obtiene un token válido de MercadoPago para la tienda indicada.
 * Refresca automáticamente si está por vencer.
 */
export function getMPToken(storeId: string): Promise<string> {
  return getToken("mercadopago", MP_TOKEN_URL, storeId);
}
