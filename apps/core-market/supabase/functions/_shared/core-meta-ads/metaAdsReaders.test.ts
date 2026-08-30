// supabase/functions/_shared/core-meta-ads/metaAdsReaders.test.ts
//
// Test de la cadena completa de F8C:
//   CredentialProvider REAL (api_vault) -> core-meta-ads -> Meta Marketing API
//
// No se mockea ni el Vault ni core-meta-ads: se usa el `resolveCredential`
// real y los Readers reales. Lo unico simulado es la frontera de red — la
// base (un query builder PostgREST falso) y `fetch` hacia graph.facebook.com.
//
// Correr:  deno test --allow-net=deno.land apps/core-market/supabase/functions/_shared/core-meta-ads/

import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createMetaAdsCredentialProvider } from "./metaAdsCredentialProvider.ts";
import { createMetaAdsReaders } from "./metaAdsReaders.ts";
import { resolveMetaCredentials } from "./credentials/resolveMetaCredentials.ts";
import { HttpMetaClient } from "./client/HttpMetaClient.ts";
import { MetaModuleError } from "./errors/MetaModuleError.ts";
import type { MetaAdsCredentials } from "./types/credentials.types.ts";

const APP_SECRET = "app-secret-que-no-debe-salir-nunca";
const ACCESS_TOKEN = "access-token-que-no-debe-salir-nunca";
const AD_ACCOUNT_ID = "act_998877";

const VAULT_VALUE = JSON.stringify({
  appId: "1234567890",
  appSecret: APP_SECRET,
  accessToken: ACCESS_TOKEN,
  adAccountId: AD_ACCOUNT_ID,
  businessId: "5566778899",
});

// -- Vault falso (misma forma que en metaAdsCredentialProvider.test.ts) ------

function fakeSupabase() {
  const fila = {
    id: "cred-uuid-1",
    value: VAULT_VALUE,
    platform: "meta_ads",
    tenant_id: "tienda-1",
    type: "oauth",
    env: "production",
    expires_at: "2026-12-31T00:00:00.000Z",
    status: "active",
  };
  const api = {
    select: (_c: string) => api,
    eq: (_c: string, _v: unknown) => api,
    is: (_c: string, _v: null) => api,
    // deno-lint-ignore require-await
    maybeSingle: async () => ({ data: fila, error: null }),
  };
  return { from: (_t: string) => api };
}

/** Resuelve credenciales reales pasando por el CredentialProvider real. */
function credenciales(): Promise<MetaAdsCredentials> {
  const provider = createMetaAdsCredentialProvider(fakeSupabase());
  return resolveMetaCredentials(provider, { adAccountId: AD_ACCOUNT_ID, tenantId: "tienda-1" });
}

// -- Meta falso -------------------------------------------------------------

interface FakeMeta {
  urls: string[];
  fetchImpl: typeof fetch;
}

function fakeMeta(responder: (url: string) => { status?: number; body: unknown }): FakeMeta {
  const urls: string[] = [];
  const fetchImpl = ((input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    const { status = 200, body } = responder(url);
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as unknown as typeof fetch;
  return { urls, fetchImpl };
}

function readersCon(meta: FakeMeta) {
  return createMetaAdsReaders(
    new HttpMetaClient({ apiVersion: "v21.0" }, { fetchImpl: meta.fetchImpl }),
  );
}

// -- 1. Ad Account ----------------------------------------------------------

Deno.test("READ: obtiene el Ad Account pasando por el Vault real", async () => {
  const meta = fakeMeta(() => ({
    body: { id: AD_ACCOUNT_ID, name: "Cuenta Demo", currency: "UYU", account_status: 1 },
  }));

  const resultado = await readersCon(meta).accounts.getAdAccount(await credenciales());

  assert(resultado.ok);
  assertEquals(resultado.data, {
    id: AD_ACCOUNT_ID,
    name: "Cuenta Demo",
    currency: "UYU",
    status: "active",
  });
  assertStringIncludes(meta.urls[0], `/v21.0/${AD_ACCOUNT_ID}`);
  // El token viaja a Meta (query string, comportamiento estandar de Graph
  // API) — lo que se verifica mas abajo es que no vuelve al caller.
  assertStringIncludes(meta.urls[0], "access_token=");
});

// -- 2. Campaigns -----------------------------------------------------------

Deno.test("READ: lista Campaigns de la cuenta", async () => {
  const meta = fakeMeta(() => ({
    body: {
      data: [
        {
          id: "23851",
          account_id: AD_ACCOUNT_ID,
          name: "Campania Verano",
          status: "ACTIVE",
          objective: "OUTCOME_TRAFFIC",
          daily_budget: "150000",
          created_time: "2026-01-02T10:00:00+0000",
          updated_time: "2026-01-03T10:00:00+0000",
        },
      ],
      paging: { cursors: { after: "cursor-2" } },
    },
  }));

  const resultado = await readersCon(meta).campaigns.listCampaigns(await credenciales(), {
    limit: 25,
  });

  assert(resultado.ok);
  assertEquals(resultado.data?.data.length, 1);
  assertEquals(resultado.data?.data[0].status, "active");
  assertEquals(resultado.data?.data[0].dailyBudget, 150000);
  assertEquals(resultado.data?.nextCursor, "cursor-2");
  assertStringIncludes(meta.urls[0], `${AD_ACCOUNT_ID}/campaigns`);
  assertStringIncludes(meta.urls[0], "limit=25");
});

// -- 3. Ad Sets -------------------------------------------------------------

Deno.test("READ: lista Ad Sets de una campania", async () => {
  const meta = fakeMeta(() => ({
    body: {
      data: [
        {
          id: "77001",
          campaign_id: "23851",
          name: "AdSet Montevideo",
          status: "PAUSED",
          lifetime_budget: "500000",
        },
      ],
    },
  }));

  const resultado = await readersCon(meta).adSets.listAdSets(await credenciales(), "23851");

  assert(resultado.ok);
  assertEquals(resultado.data?.data[0].campaignId, "23851");
  assertEquals(resultado.data?.data[0].status, "paused");
  assertEquals(resultado.data?.data[0].lifetimeBudget, 500000);
  assertStringIncludes(meta.urls[0], "23851/adsets");
});

// -- 4. Ads -----------------------------------------------------------------

Deno.test("READ: lista Ads de un ad set", async () => {
  const meta = fakeMeta(() => ({
    body: { data: [{ id: "90210", adset_id: "77001", name: "Anuncio A", status: "ACTIVE" }] },
  }));

  const resultado = await readersCon(meta).ads.listAds(await credenciales(), "77001");

  assert(resultado.ok);
  assertEquals(resultado.data?.data[0].adSetId, "77001");
  assertEquals(resultado.data?.data[0].status, "active");
  assertStringIncludes(meta.urls[0], "77001/ads");
});

// -- 5. Insights ------------------------------------------------------------

Deno.test("READ: obtiene Insights y sigue la paginacion del edge", async () => {
  let llamadas = 0;
  const meta = fakeMeta(() => {
    llamadas += 1;
    if (llamadas === 1) {
      return {
        body: {
          data: [{
            spend: "1234.56",
            impressions: "10000",
            reach: "8000",
            account_currency: "UYU",
            date_start: "2026-01-01",
            date_stop: "2026-01-31",
          }],
          paging: { cursors: { after: "pag-2" } },
        },
      };
    }
    return { body: { data: [{ spend: "10", impressions: "1", reach: "1", account_currency: "UYU" }] } };
  });

  const resultado = await readersCon(meta).insights.getInsights(
    await credenciales(),
    { entityId: "23851", entityType: "campaign" },
    { since: "2026-01-01", until: "2026-01-31" },
  );

  assert(resultado.ok);
  assertEquals(resultado.data?.length, 2);
  assertEquals(resultado.data?.[0].spend, 1234.56);
  assertEquals(resultado.data?.[0].entityType, "campaign");
  assertStringIncludes(meta.urls[0], "23851/insights");
  assertStringIncludes(decodeURIComponent(meta.urls[0]), '{"since":"2026-01-01","until":"2026-01-31"}');
});

// -- Propagacion de errores -------------------------------------------------

Deno.test("errores: un error de Meta vuelve como ok:false normalizado, sin lanzar", async () => {
  const meta = fakeMeta(() => ({
    status: 400,
    body: {
      error: {
        message: "Unsupported get request.",
        type: "GraphMethodException",
        code: 100,
        error_subcode: 33,
        fbtrace_id: "Abc123",
      },
    },
  }));

  const resultado = await readersCon(meta).campaigns.listCampaigns(await credenciales());

  assertEquals(resultado.ok, false);
  assertEquals(resultado.error?.code, 100);
  assertEquals(resultado.error?.message, "Unsupported get request.");
  assertEquals(resultado.error?.fbtraceId, "Abc123");
});

Deno.test("errores: rate limit de Meta lanza MetaModuleError 'rate_limit'", async () => {
  const meta = fakeMeta(() => ({
    status: 400,
    body: { error: { message: "Application request limit reached", code: 4 } },
  }));
  const creds = await credenciales();

  const err = await assertRejects(
    () => readersCon(meta).campaigns.listCampaigns(creds),
    MetaModuleError,
  );
  assertEquals(err.category, "rate_limit");
});

Deno.test("errores: una respuesta que no es JSON lanza MetaModuleError 'meta_api'", async () => {
  const fetchImpl = (() =>
    Promise.resolve(new Response("<html>502</html>", { status: 502 }))) as unknown as typeof fetch;
  const readers = createMetaAdsReaders(
    new HttpMetaClient({ apiVersion: "v21.0" }, { fetchImpl }),
  );
  const creds = await credenciales();

  const err = await assertRejects(
    () => readers.accounts.getAdAccount(creds),
    MetaModuleError,
  );
  assertEquals(err.category, "meta_api");
});

// -- Ausencia de secretos ---------------------------------------------------

Deno.test("secretos: ninguna respuesta READ serializada contiene accessToken ni appSecret", async () => {
  const meta = fakeMeta((url) => {
    if (url.includes("/insights")) return { body: { data: [{ spend: "1" }] } };
    if (url.includes("/campaigns") || url.includes("/adsets") || url.includes("/ads")) {
      return { body: { data: [{ id: "1" }] } };
    }
    return { body: { id: AD_ACCOUNT_ID, name: "Cuenta", currency: "UYU", account_status: 1 } };
  });
  const readers = readersCon(meta);
  const creds = await credenciales();

  const salidas = [
    await readers.accounts.getAdAccount(creds),
    await readers.campaigns.listCampaigns(creds),
    await readers.adSets.listAdSets(creds, "23851"),
    await readers.ads.listAds(creds, "77001"),
    await readers.insights.getInsights(
      creds,
      { entityId: "23851", entityType: "campaign" },
      { since: "2026-01-01", until: "2026-01-31" },
    ),
  ];

  for (const salida of salidas) {
    const serializado = JSON.stringify(salida);
    assert(!serializado.includes(ACCESS_TOKEN), "una respuesta READ incluyo el accessToken");
    assert(!serializado.includes(APP_SECRET), "una respuesta READ incluyo el appSecret");
  }
});

Deno.test("secretos: el error de Meta propagado no arrastra la URL con el access_token", async () => {
  const meta = fakeMeta(() => ({
    status: 400,
    body: { error: { message: "Invalid parameter", code: 100 } },
  }));

  const resultado = await readersCon(meta).ads.listAds(await credenciales(), "77001");

  const serializado = JSON.stringify(resultado);
  assert(!serializado.includes(ACCESS_TOKEN));
  assert(!serializado.includes("access_token"));
});

Deno.test("secretos: MetaModuleError de red no expone el token en message ni stack", async () => {
  const fetchImpl = (() =>
    Promise.reject(new Error("ECONNRESET"))) as unknown as typeof fetch;
  const readers = createMetaAdsReaders(
    new HttpMetaClient({ apiVersion: "v21.0" }, { fetchImpl }),
  );
  const creds = await credenciales();

  const err = await assertRejects(() => readers.accounts.getAdAccount(creds), MetaModuleError);
  const serializado = `${err.message} ${err.stack ?? ""}`;
  assert(!serializado.includes(ACCESS_TOKEN));
  assert(!serializado.includes(APP_SECRET));
});
