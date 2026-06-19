// packages/core-mlmp/src/OAuthService.ts
//
// Flujo OAuth2 completo para MercadoLibre y MercadoPago.
// - connect()         → genera URL de autorización con state codificado
// - handleCallback()  → intercambia code por tokens, guarda en vault
// - disconnect()      → elimina credencial del vault
//
// El campo `state` viaja codificado en base64 con { storeId, userId, provider }.
// userId se resuelve validando el JWT del request antes de llamar connect().

import { MLVaultService } from "./MLVaultService.ts";
import { MLModuleError } from "./MLModuleError.ts";

const PROVIDER_CONFIG: Record<string, { authBase: string; tokenUrl: string }> = {
  mercadolibre: {
    authBase: "https://auth.mercadolibre.com.ar/authorization",
    tokenUrl: "https://api.mercadolibre.com/oauth/token",
  },
  mercadopago: {
    authBase: "https://auth.mercadopago.com/authorization",
    tokenUrl: "https://api.mercadopago.com/oauth/token",
  },
};

export interface OAuthState {
  storeId: string;
  userId:  string;
  provider: string;
}

export interface ConnectOptions {
  provider:    string;
  storeId:     string;
  userId:      string;
  clientId:    string;
  redirectUri: string;
  scopes?:     string[];
}

export interface CallbackOptions {
  provider:     string;
  code:         string;
  state:        string; // base64 de OAuthState
  clientId:     string;
  clientSecret: string;
  redirectUri:  string;
}

export class OAuthService {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly vault: MLVaultService
  ) {}

  /**
   * Genera la URL de autorización OAuth2.
   * El state lleva storeId + userId + provider en base64.
   */
  connect(options: ConnectOptions): string {
    const config = PROVIDER_CONFIG[options.provider];
    if (!config) {
      throw new MLModuleError(
        "INVALID_CONFIG",
        `Unknown provider: ${options.provider}`
      );
    }

    const statePayload: OAuthState = {
      storeId:  options.storeId,
      userId:   options.userId,
      provider: options.provider,
    };

    const state = btoa(JSON.stringify(statePayload));

    const params = new URLSearchParams({
      response_type: "code",
      client_id:     options.clientId,
      redirect_uri:  options.redirectUri,
      state,
    });

    if (options.scopes?.length) {
      params.set("scope", options.scopes.join(" "));
    }

    return `${config.authBase}?${params.toString()}`;
  }

  /**
   * Decodifica el state del callback OAuth2.
   */
  decodeState(state: string): OAuthState {
    try {
      return JSON.parse(atob(state)) as OAuthState;
    } catch {
      throw new MLModuleError("INVALID_CONFIG", "Invalid OAuth state");
    }
  }

  /**
   * Intercambia el code por tokens y los persiste en el vault.
   */
  async handleCallback(options: CallbackOptions): Promise<void> {
    const config = PROVIDER_CONFIG[options.provider];
    if (!config) {
      throw new MLModuleError("INVALID_CONFIG", `Unknown provider: ${options.provider}`);
    }

    // Decodificar state para obtener storeId + userId
    const stateData = this.decodeState(options.state);

    // Intercambiar code por tokens
    const resp = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:   "authorization_code",
        client_id:    options.clientId,
        client_secret: options.clientSecret,
        code:         options.code,
        redirect_uri: options.redirectUri,
      }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new MLModuleError(
        "REFRESH_FAILED",
        `OAuth token exchange failed (${resp.status}): ${body.message ?? JSON.stringify(body)}`
      );
    }

    const tokens = await resp.json();
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await this.vault.save({
      provider:     options.provider,
      storeId:      stateData.storeId,
      userId:       stateData.userId,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      clientId:     options.clientId,
      clientSecret: options.clientSecret,
      extra:        { scope: tokens.scope ?? null },
    });
  }

  /**
   * Elimina la credencial del vault (desconecta la cuenta).
   */
  async disconnect(provider: string, storeId: string): Promise<void> {
    await this.vault.delete(provider, storeId);
  }
}
