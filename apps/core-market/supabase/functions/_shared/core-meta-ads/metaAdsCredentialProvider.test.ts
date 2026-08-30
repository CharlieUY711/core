// supabase/functions/_shared/core-meta-ads/metaAdsCredentialProvider.test.ts
//
// Test del wiring F8B contra el CredentialProvider REAL. No hay mock del
// Vault: se importa `resolveCredential` de verdad
// (../api-vault/CredentialProvider.ts) y se le inyecta un cliente Supabase
// falso que imita el query builder de PostgREST. Lo unico simulado es la
// base de datos.
//
// Correr:  deno test apps/core-market/supabase/functions/_shared/core-meta-ads/
//
// Ningun test usa credenciales reales ni hace red.

import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createMetaAdsCredentialProvider } from "./metaAdsCredentialProvider.ts";
import { resolveMetaCredentials } from "./credentials/resolveMetaCredentials.ts";
import { MetaModuleError } from "./errors/MetaModuleError.ts";

const APP_SECRET = "app-secret-que-no-debe-aparecer-en-ningun-lado";
const ACCESS_TOKEN = "access-token-que-no-debe-aparecer-en-ningun-lado";

const VALUE_JSON = JSON.stringify({
  appId: "1234567890",
  appSecret: APP_SECRET,
  accessToken: ACCESS_TOKEN,
  adAccountId: "act_998877",
  businessId: "5566778899",
});

interface VaultRow {
  id: string;
  value: string;
  platform: string;
  tenant_id: string | null;
  type: string;
  env: string;
  expires_at: string | null;
  status: string;
}

function row(overrides: Partial<VaultRow> = {}): VaultRow {
  return {
    id: "cred-uuid-1",
    value: VALUE_JSON,
    platform: "meta_ads",
    tenant_id: "tienda-1",
    type: "oauth",
    env: "production",
    expires_at: "2026-12-31T00:00:00.000Z",
    status: "active",
    ...overrides,
  };
}

interface QueryRecord {
  table: string;
  eq: Array<[string, unknown]>;
  isNull: string[];
}

/**
 * Cliente Supabase falso: imita lo justo del query builder de PostgREST que
 * usa el CredentialProvider real:
 *   - RESOLVE: .from().select().eq().is().maybeSingle()
 *   - REPORT:  .from().update().eq()  (F8E)
 */
function fakeSupabase(
  rows: VaultRow[],
  options: { failResolveWith?: string; failReportWith?: string } = {},
) {
  const { failResolveWith, failReportWith } = options;
  const queries: QueryRecord[] = [];
  const updates: Array<{ table: string; patch: Record<string, unknown>; eq: Array<[string, unknown]> }> = [];

  function selectBuilder(record: QueryRecord) {
    const api = {
      select: (_cols: string) => api,
      eq: (col: string, val: unknown) => {
        record.eq.push([col, val]);
        return api;
      },
      is: (col: string, _val: null) => {
        record.isNull.push(col);
        return api;
      },
      // deno-lint-ignore require-await
      maybeSingle: async () => {
        if (failResolveWith) return { data: null, error: { message: failResolveWith } };
        const match = rows.find((r) => {
          for (const [col, val] of record.eq) {
            if ((r as unknown as Record<string, unknown>)[col] !== val) return false;
          }
          for (const col of record.isNull) {
            if ((r as unknown as Record<string, unknown>)[col] !== null) return false;
          }
          return true;
        });
        return { data: match ?? null, error: null };
      },
    };
    return api;
  }

  return {
    queries,
    updates,
    client: {
      from: (table: string) => ({
        select: (_cols: string) => {
          const record: QueryRecord = { table, eq: [], isNull: [] };
          queries.push(record);
          return selectBuilder(record);
        },
        update: (patch: Record<string, unknown>) => {
          const record = { table, patch, eq: [] as Array<[string, unknown]> };
          updates.push(record);
          return {
            eq: async (col: string, val: unknown) => {
              record.eq.push([col, val]);
              if (failReportWith) return { error: { message: failReportWith } };
              return { error: null };
            },
          };
        },
      }),
    },
  };
}

Deno.test("wiring: resuelve credenciales de Meta Ads a traves del CredentialProvider real", async () => {
  const { client } = fakeSupabase([row()]);
  const provider = createMetaAdsCredentialProvider(client);

  const credentials = await resolveMetaCredentials(provider, {
    adAccountId: "act_998877",
    tenantId: "tienda-1",
  });

  assertEquals(credentials, {
    appId: "1234567890",
    appSecret: APP_SECRET,
    accessToken: ACCESS_TOKEN,
    adAccountId: "act_998877",
    businessId: "5566778899",
    expiresAt: "2026-12-31T00:00:00.000Z",
  });
});

Deno.test("wiring: consulta api_vault por platform 'meta_ads' y type 'oauth'", async () => {
  const { client, queries } = fakeSupabase([row()]);
  const provider = createMetaAdsCredentialProvider(client);

  await resolveMetaCredentials(provider, {
    adAccountId: "act_998877",
    tenantId: "tienda-1",
  });

  assertEquals(queries.length, 1);
  assertEquals(queries[0].table, "api_vault");
  assertEquals(queries[0].eq, [
    ["platform", "meta_ads"],
    ["tenant_id", "tienda-1"],
    ["type", "oauth"],
  ]);
});

Deno.test("wiring: cae a la credencial global cuando el tenant no tiene fila propia", async () => {
  const { client, queries } = fakeSupabase([row({ id: "cred-global", tenant_id: null })]);
  const provider = createMetaAdsCredentialProvider(client);

  const credentials = await resolveMetaCredentials(provider, {
    adAccountId: "act_998877",
    tenantId: "tienda-sin-credencial",
  });

  assertEquals(credentials.accessToken, ACCESS_TOKEN);
  // Dos queries: intento por tenant, luego fallback global.
  assertEquals(queries.length, 2);
  assertEquals(queries[1].isNull, ["tenant_id"]);
});

Deno.test("wiring: falla con MetaModuleError 'credentials' cuando no hay credencial", async () => {
  const { client } = fakeSupabase([]);
  const provider = createMetaAdsCredentialProvider(client);

  const err = await assertRejects(
    () => resolveMetaCredentials(provider, { adAccountId: "act_998877", tenantId: "tienda-1" }),
    MetaModuleError,
  );
  assertEquals(err.category, "credentials");
});

Deno.test("wiring: envuelve un error del Vault sin filtrar secretos", async () => {
  const { client } = fakeSupabase([], { failResolveWith: `boom con ${ACCESS_TOKEN} y ${APP_SECRET}` });
  const provider = createMetaAdsCredentialProvider(client);

  const err = await assertRejects(
    () => resolveMetaCredentials(provider, { adAccountId: "act_998877", tenantId: "tienda-1" }),
    MetaModuleError,
  );
  assertEquals(err.category, "credentials");
  assert(!err.message.includes(APP_SECRET), "el message no debe incluir appSecret");
  assert(!err.message.includes(ACCESS_TOKEN), "el message no debe incluir accessToken");
});

Deno.test("wiring: rechaza si la credencial esta fijada a otra cuenta publicitaria", async () => {
  const { client } = fakeSupabase([row()]);
  const provider = createMetaAdsCredentialProvider(client);

  const err = await assertRejects(
    () => resolveMetaCredentials(provider, { adAccountId: "act_000111", tenantId: "tienda-1" }),
    MetaModuleError,
  );
  assertEquals(err.category, "authorization");
  assert(!err.message.includes(ACCESS_TOKEN));
});

Deno.test("wiring: ningun error serializado expone el value crudo del Vault", async () => {
  const { client } = fakeSupabase([row({ value: `{"appSecret":"${APP_SECRET}"` })]);
  const provider = createMetaAdsCredentialProvider(client);

  const err = await assertRejects(
    () => resolveMetaCredentials(provider, { adAccountId: "act_998877", tenantId: "tienda-1" }),
    MetaModuleError,
  );
  const serialized = `${err.message} ${String(err.cause ?? "")} ${err.stack ?? ""}`;
  assert(!serialized.includes(APP_SECRET), "nada del error debe incluir appSecret");
});

// ---- REPORT / HEALTH (F8E) --------------------------------------------

Deno.test("wiring REPORT: reporta 'active' contra la fila de api_vault tras RESOLVE + uso exitoso", async () => {
  const { client, updates } = fakeSupabase([row()]);
  const provider = createMetaAdsCredentialProvider(client);
  const ref = { adAccountId: "act_998877", tenantId: "tienda-1" };

  await resolveMetaCredentials(provider, ref);
  await provider.reportCredentialOutcome?.(ref, "active");

  assertEquals(updates.length, 1);
  assertEquals(updates[0].table, "api_vault");
  assertEquals(updates[0].patch.status, "active");
  assertEquals(updates[0].eq, [["id", "cred-uuid-1"]]);
});

Deno.test("wiring REPORT: reporta 'invalid' con mensaje de error tras un fallo de credencial", async () => {
  const { client, updates } = fakeSupabase([row()]);
  const provider = createMetaAdsCredentialProvider(client);
  const ref = { adAccountId: "act_998877", tenantId: "tienda-1" };

  await resolveMetaCredentials(provider, ref);
  await provider.reportCredentialOutcome?.(ref, "invalid", "Meta rechazo el access token.");

  assertEquals(updates.length, 1);
  assertEquals(updates[0].patch.status, "invalid");
  assertEquals(updates[0].patch.last_error, "Meta rechazo el access token.");
});

Deno.test("wiring REPORT: NO reporta cuando RESOLVE no encontro ninguna fila (no hay credentialId)", async () => {
  const { client, updates } = fakeSupabase([]);
  const provider = createMetaAdsCredentialProvider(client);
  const ref = { adAccountId: "act_998877", tenantId: "tienda-1" };

  await assertRejects(() => resolveMetaCredentials(provider, ref), MetaModuleError);
  await provider.reportCredentialOutcome?.(ref, "invalid", "no deberia reportarse");

  assertEquals(updates.length, 0);
});

Deno.test("wiring REPORT: propaga sin romper cuando el UPDATE del Vault falla (best-effort)", async () => {
  const { client } = fakeSupabase([row()], { failReportWith: "vault unavailable" });
  const provider = createMetaAdsCredentialProvider(client);
  const ref = { adAccountId: "act_998877", tenantId: "tienda-1" };

  await resolveMetaCredentials(provider, ref);
  // No debe lanzar aunque el UPDATE subyacente falle.
  await provider.reportCredentialOutcome?.(ref, "active");
});

// NOTA: `reportCredentialOutcome` (CredentialProvider real) no sanitiza el
// contenido de `error` — esa garantia es responsabilidad de quien arma el
// mensaje (ver MetaModuleError, ya testeado para nunca incluir secretos).
// Lo que SI le corresponde a esta capa (adapter + wiring) es no reenviar
// jamas la fila resuelta del Vault (que SI contiene appSecret/accessToken
// en su `value` opaco) hacia el UPDATE: solo debe viajar el `credentialId`.
Deno.test("wiring REPORT: el UPDATE nunca incluye el value opaco de la credencial resuelta", async () => {
  const { client, updates } = fakeSupabase([row()]);
  const provider = createMetaAdsCredentialProvider(client);
  const ref = { adAccountId: "act_998877", tenantId: "tienda-1" };

  await resolveMetaCredentials(provider, ref);
  await provider.reportCredentialOutcome?.(ref, "invalid", "Meta rechazo el access token.");

  const serialized = JSON.stringify(updates);
  assert(!serialized.includes(APP_SECRET), "el UPDATE no debe incluir appSecret");
  assert(!serialized.includes(ACCESS_TOKEN), "el UPDATE no debe incluir accessToken");
});
