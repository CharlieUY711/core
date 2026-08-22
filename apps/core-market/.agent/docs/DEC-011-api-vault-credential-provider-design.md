# API Vault — Credential Provider Design
## DEC-011 supporting document

**Status: DESIGNED / APPROVED — IMPLEMENTATION PENDING.**
**Referenced by:** `.agent/DECISIONS.md`, DEC-011.
**Session type:** design only. No code, migrations, schema, or secrets were
modified while producing this document.

---

## 0. Evidence base — what was actually read this session, and what wasn't

Per the brief's own rule ("the repository is the source of truth" / "do not
assume documentation supplied in a previous prompt is complete"), this
section states plainly what this design is grounded in, so the next agent
does not mistake narrative references for verified source.

### Files actually read this session (VERIFIED)
- `supabase/migrations/20260822001700_api_vault_client_exposed.sql` — adds
  `client_exposed boolean`, an additive `SELECT` RLS policy, and a support
  index.
- `src/lib/core-apivault/src/services/apiVaultTypes.ts` — the full
  `ApiVaultEntry` shape as currently typed, `VaultEnv`, `VaultType`, and the
  ~90-entry `VAULT_PLATFORM_DEFS` catalog.
- `src/lib/core-apivault/src/services/getClientCredential.ts` — the one
  generic client-side credential-read helper that exists today.
- `src/lib/core-apivault/src/services/index.ts` — re-exports
  `apiVaultTypes`, `apiVaultService`, `getClientCredential`.
- `src/lib/core-apivault/src/components/ApiVaultPage.tsx` (440 lines,
  skimmed for the `client_exposed`/`type==='token'` gating logic specifically
  — not read end-to-end line by line).
- `src/app/components/maps/mapboxToken.ts`, `AddressMap.tsx` (partial),
  `AddressAutocomplete.tsx` (partial), `src/app/admin/pages/AdminProfile.tsx`
  (existence + line count only, not read in full) — the three Mapbox
  consumers.
- `.agent/DECISIONS.md`, `.agent/HANDOFF.md`, `.agent/CHANGELOG.md` — DEC-001
  through DEC-010 and every changelog entry currently in this snapshot.

### Files the brief asks for that are NOT present in this snapshot (UNVERIFIED)
The zip this session worked from does not contain:
- `apiVaultService.ts` — imported by `index.ts` and almost certainly the
  actual `resolve`/CRUD implementation behind today's Vault, but its source
  is not in this snapshot. Its behavior is inferred only from its type
  contracts and from how `ApiVaultPage.tsx`/`getClientCredential.ts`
  consume it.
- `MLVaultService`, `TokenManager`, `OAuthService`, `ml-oauth`, `ml-sync`,
  `publicar-en-ml`, `ml-webhook`, `extract-catalog` — none of these files
  exist anywhere in this snapshot. Everything this document says about ML's
  credential handling is reconstructed **secondhand**, from mentions in
  `.agent/DECISIONS.md`/`CHANGELOG.md` (e.g. DEC-005's reference to
  `crear_orden_segura` and `mp_webhook`, the 2026-08-21 architecture-
  confirmation changelog entry's mention of "MercadoLibre OAuth/sync/
  webhook/publish/queue" edge functions). **None of it is independently
  confirmed by reading the actual ML source in this session.**
- The base `api_vault` table migration (`20260607_api_vault.sql`,
  referenced by DEC-006 and DEC-009 but not included in this zip) — so the
  exact current column list, constraints, and the full existing RLS policy
  set (beyond the one additive policy in the file that *is* present) are
  not independently confirmed here either. Everything about `tenant_id`
  semantics ("NULL = credencial global (fallback)", the unique index
  `api_vault_platform_global_uidx`) is taken from DEC-009's prose, not from
  reading the migration.
- The claim in the brief itself that a real `ml-webhook` query uses
  `.eq("provider", "mercadolibre")` against a column that is actually named
  `platform` — **this cannot be verified in this session** because
  `ml-webhook`'s source isn't in the snapshot. DEC-010 already flagged this
  once; it is repeated here because this design document is the place a
  future implementer will actually go looking for it. **Read the real file
  before writing the fix.**

**Practical consequence for this design:** everything below that concerns
API Vault's own schema, RLS boundary, and the `client_exposed`/Mapbox
pattern is grounded in code actually read this session. Everything that
concerns ML's *current* internal architecture (TokenManager's dedup
pattern, MLVaultService's exact shape, ml-webhook's exact bug) is carried
forward as **reported context, not verified evidence**, and is marked as
such at each mention. This does not block producing a generic design —
section 1's rule (API Vault must not know what any provider does) means
the target architecture does not depend on ML's specifics anyway — but it
does block writing a precise ML migration plan (section 20) with full
confidence.

---

## 1. Executive architecture

API Vault becomes the platform's single **Credential Provider**: a
generic service that stores, resolves, delivers, and tracks the health of
credentials for any external platform, without encoding any
platform-specific behavior itself.

```
CONSUMER
   |  requestCredential(platform, context)
   v
API VAULT
   |  RESOLVE  -> identify the right row (tenant -> global fallback)
   |  (ACQUIRE / REFRESH, only if the credential's lifecycle needs it —
   |   the refresh mechanism itself is supplied by the provider integration,
   |   not by API Vault)
   |  DELIVER  -> hand back a credential reference + value (scoped to what
   |              the caller is authorized to see) + health/lifecycle metadata
   v
CONSUMER uses the credential against the external provider
   |
   v
CONSUMER reports outcome
   |  reportCredentialResult(credentialId, outcome, error?, metadata?)
   v
API VAULT
   |  HEALTH / LIFECYCLE update, persisted
```

API Vault owns: identity, storage, resolution, tenant/global precedence,
lifecycle state, health, audit trail, and the client/server exposure
boundary.

Provider integrations (ML, Mapbox, future META, future generic web import,
future shipping/payment providers) own: how to talk to that provider, its
OAuth dance, its scopes, its token-exchange format, and its business logic.
They are consumers of the contract below, never a second storage location
for credentials.

---

## 2. Current state (as verified this session)

- `api_vault` is a real Postgres table with RLS. The one column
  confirmed added this session is `client_exposed boolean default false`,
  via an **additive** `SELECT` policy (`USING (client_exposed = true)`),
  which — per Postgres's OR-combination of same-command policies — sits
  alongside, and does not replace, the pre-existing "user reads their own"
  policy. The pre-existing policy's exact predicate was not re-read this
  session; DEC-006/DEC-009 describe it as `auth.uid() = user_id`.
- `ApiVaultEntry` (current TS type) has: `id, user_id, tenant_id,
  created_by, name, platform, type, value, env, tags, notes, expires_at,
  client_exposed, created_at, updated_at`. `type` is one of `api_key |
  token | oauth | secret | webhook | connection | jwt | cert`. `value` is
  a plain `string` — there is no structured/JSON credential representation
  today; multi-part credentials (e.g. an OAuth access+refresh token pair)
  would have to be encoded into that single string field by whatever
  writes it, with no documented convention for how.
- The only generic credential-provider primitive that exists today is
  `getClientCredential(supabase, platform, {tenantId?})` — and it is
  **client-side only**: it runs directly in the browser against Supabase
  with the anon/user JWT, filtered to rows where `client_exposed = true`.
  There is no generic **server-side** resolve function visible in this
  snapshot (`apiVaultService.ts`, which likely contains one, is not
  present).
- The only concrete, verified consumer of the generic path is Mapbox, via
  3 call sites (`AddressMap.tsx`, `AddressAutocomplete.tsx`,
  `AdminProfile.tsx`'s `reverseGeocode`) that all funnel through
  `mapboxToken.ts`'s `getMapboxToken()`, which does: vault (client-exposed,
  global/`tenant_id IS NULL`) → fallback to `VITE_MAPBOX_TOKEN` → cache in
  a module-level variable with in-flight-promise dedup for the lifetime of
  the tab. This dedup pattern (a `let inflight: Promise<...> | null`) is
  the one **verified**, generalizable concurrency pattern available this
  session — see section 12.
- `ApiVaultPage.tsx` gates the "expose to client" toggle to `type ===
  'token'` only, in the UI layer — a soft guardrail, not a database
  constraint. The database constraint is `client_exposed`, which is
  settable on any row type; the UI is what currently prevents an admin
  from casually marking an `api_key`/`secret`/`oauth`/`webhook` row as
  client-exposed. This is a real gap noted for section 13.
- ML's credential handling (`MLVaultService`, `TokenManager`,
  `OAuthService`) is **not verified this session** — see section 0. It is
  referenced only as context for why a generic design must accommodate
  refreshable, tenant-scoped, health-tracked credentials, since that
  pattern is reported to already exist for ML.
- There is exactly **one** generic mechanism today (the `client_exposed`
  path) and it only covers the client-exposed, no-refresh, no-health case.
  Everything else — server-side resolution, refresh, health, reporting —
  does not exist yet in a generic form.

---

## 3. Target state

A single Credential Provider contract, callable from both server contexts
(edge functions, backend services) and, for the narrow client-exposed
case, directly from the browser, with:

- One canonical `resolveCredential()` (server) and the existing
  `getClientCredential()` (browser, client-exposed only) as the two
  sanctioned entry points — not one-off `.from('api_vault').eq(...)`
  queries scattered per consumer.
- One canonical `reportCredentialResult()` that updates persisted health.
- A `health`/`status` column set, persisted, replacing implicit "it works
  or it doesn't" behavior.
- A defined lifecycle vocabulary (static / expiring / refreshable /
  reauth-required / revoked) that provider integrations plug into rather
  than reinvent.
- A hard, code-level (not just UI) boundary between what may ever reach
  the browser and what may not.
- ML, Mapbox, and any future provider (META, generic web import, shipping,
  payments, AI) all speaking the same contract, with their protocol-
  specific logic living entirely in their own integration layer.

---

## 4. Responsibility boundaries

| API Vault owns | Provider integration owns |
|---|---|
| Credential storage (`api_vault` table) | Provider OAuth URLs, scopes, token-exchange format |
| Identity (`api_vault.id`) | Provider-specific API calls |
| Tenant → global resolution | Provider-specific publishing/sync/business rules |
| Lifecycle state machine (generic states) | The actual refresh HTTP call to the provider |
| Health/status persistence | Interpreting provider-specific error bodies (before mapping to the generic taxonomy) |
| Client/server exposure boundary | — |
| Audit trail of resolve/use/report events | — |
| Concurrency dedup for in-flight lifecycle operations | — |

API Vault must never contain a symbol, branch, or comment that says `if
platform === 'MercadoLibre'` (or Meta, Mapbox, etc.) for anything beyond
descriptive metadata (name/icon/category — which is exactly what
`VAULT_PLATFORM_DEFS` already is: a UI catalog, not branching logic. That
distinction is worth preserving explicitly: `VAULT_PLATFORM_DEFS` is fine
as-is, because it's a *label list*, not a *behavior switch*).

---

## 5. Credential lifecycle (conceptual state machine)

```
UNKNOWN --(first successful resolve+report)--> ACTIVE
ACTIVE --(expires_at passed)--> EXPIRED
ACTIVE --(provider rejects: 401-class)--> REQUIRES_REAUTH  (if refreshable)
ACTIVE --(provider rejects: 401-class)--> INVALID           (if not refreshable)
EXPIRED --(refreshable, refresh succeeds)--> ACTIVE
EXPIRED --(not refreshable, or refresh fails w/ reauth signal)--> REQUIRES_REAUTH
REQUIRES_REAUTH --(user completes provider auth flow again)--> ACTIVE
ANY --(provider explicitly revokes / admin marks revoked)--> REVOKED
ANY --(operational failure: network/5xx/timeout)--> ERROR (transient, does NOT overwrite a healthier prior state — see section 18)
REVOKED --> terminal. Requires a brand-new credential row, not a transition.
```

This is deliberately close to the taxonomy already sketched in the
governing brief (section 10) rather than inventing a new one, since no
existing canonical health-state vocabulary was found in the verified
files this session (there is no `status` column in the `ApiVaultEntry`
type as read).

---

## 6. RESOLVE contract

```
resolveCredential({
  platform: string,
  tenantId?: string | null,
  type?: VaultType,
  environment?: VaultEnv,
}): CredentialReference
```

Naming note: the brief warns against inventing names if a convention
already exists. `getClientCredential` is today's convention for the
client-side, client-exposed-only path. Since `apiVaultService.ts` (the
likely home of any existing server-side resolve function) is not in this
snapshot, **the next agent must check it before naming the server-side
function** — if it already exposes something resolve-shaped, extend/rename
that rather than introducing a second name. Absent evidence, this document
proposes `resolveCredential` for the server-side canonical entry point,
and treats `getClientCredential` as the (already-correctly-scoped)
client-side counterpart — not something to be replaced, since it already
implements the "client_exposed only" boundary correctly.

Resolution order (mirroring the pattern already implemented for
`client_exposed`/Mapbox, generalized):
1. Reject/short-circuit if `platform` is missing.
2. If `tenantId` given: look for `platform = X AND tenant_id = tenantId`.
3. If none found (or `tenantId` omitted): look for `platform = X AND
   tenant_id IS NULL` (global fallback) — the same pattern
   `getClientCredential` already implements.
4. Narrow by `type`/`environment` if provided; if multiple rows still
   match, this is an ambiguous configuration — RESOLVE must fail loudly
   (return an error, not silently pick one), since the brief explicitly
   forbids identifying a credential by `platform` alone when multiple can
   exist. **`api_vault.id` is the only thing that unambiguously identifies
   a single credential** once callers need to disambiguate.
5. Once a row is chosen, inspect its lifecycle/health. If `EXPIRED` or
   `REQUIRES_REAUTH` and the caller indicated `mustBeUsable: true`
   (default), RESOLVE fails with that reason rather than handing back a
   dead credential — this is different from today's Mapbox path, which
   has no health awareness at all and would happily return a token that
   is already invalid.
6. If the credential's lifecycle needs an automatic refresh (refreshable +
   expired) and the caller supplied a provider-specific refresh callback,
   invoke it (see section 11) before delivering — with the concurrency
   dedup described in section 12.

Server-side RESOLVE requires an authenticated/service-role/internal-trust
caller (see section 13) — it is not the same trust boundary as
`getClientCredential`, and should not be reachable from the browser.

---

## 7. DELIVER contract

```
CredentialReference = {
  credentialId:   string        // api_vault.id — unambiguous identity
  platform:       string
  type:           VaultType
  tenantId:       string | null
  environment:    VaultEnv
  value:          string | null // null if the caller is not authorized to see it
  expiresAt:      string | null
  health: {
    status:        HealthStatus
    lastCheckedAt: string | null
    lastError:     string | null
  }
  refreshed:      boolean       // true if a refresh happened during this resolve
  metadata:       Record<string, unknown> // provider-agnostic extras (tags, notes)
}
```

`value` is `null` whenever the caller's context doesn't clear the
exposure boundary in section 13 — the contract always returns a
reference (id, platform, health) even when it can't return the secret, so
a caller can at least act on health/lifecycle without ever seeing the
value. This is a deliberate change from `getClientCredential`'s current
`string | null` return (value-or-nothing, no context) — DELIVER is
richer, but `getClientCredential` itself does not need to change, since
its narrower client_exposed contract is already correctly scoped; DELIVER
is the shape for the **new, server-side** path.

---

## 8. REPORT contract

```
reportCredentialResult({
  credentialId: string,   // api_vault.id, required — no platform-name lookups
  outcome: 'SUCCESS' | 'EXPIRED' | 'INVALID' | 'REVOKED' | 'REQUIRES_REAUTHENTICATION' | 'ERROR',
  error?: string,
  metadata?: Record<string, unknown>,
}): void
```

No existing error taxonomy was found in the files read this session (no
`status`/`outcome` enum in `apiVaultTypes.ts`), so this reuses the
vocabulary the governing brief itself proposed in section 9, rather than
inventing a third one. If `apiVaultService.ts` (unread) already defines
one, the next agent must reconcile before implementing — not silently
duplicate.

Provider-error → generic-outcome mapping (already specified in the brief,
carried forward here as the design's error taxonomy, section 14 expands
it):
- HTTP 401 → `INVALID` or `REQUIRES_REAUTHENTICATION` (refreshable
  credentials get the latter; non-refreshable get the former).
- HTTP 403 → `ERROR` by default (ambiguous: could be scope/permission,
  not necessarily a bad credential) — never auto-`INVALID` on 403 alone.
- Network timeout / provider 5xx → `ERROR`, transient, must not overwrite
  a credential's prior `ACTIVE` health (see section 18).
- Explicit provider revocation signal (where the provider's protocol
  supports checking this) → `REVOKED`.

---

## 9. HEALTH model

Distinguish **credential health** (is this specific `api_vault` row
usable) from **integration health** (is the ML/Meta/Mapbox integration as
a whole working) — the brief calls this out explicitly and no evidence
contradicts treating them separately. A credential can be `ACTIVE` while
its integration is down (provider outage), and an integration can be
fully configured while its credential is `REQUIRES_REAUTH`.

States: `ACTIVE`, `EXPIRED`, `INVALID`, `REVOKED`, `REQUIRES_REAUTH`,
`ERROR`, `UNKNOWN` (not yet validated — the correct default for every
existing row the day this ships, since no row has ever been health-
checked under this model).

Persisted fields required (none exist today per the verified
`ApiVaultEntry` type): `status`, `last_checked_at`, `last_error`. These
are additive columns — see section 24.

Who may transition into each state: RESOLVE and REPORT are the only
writers. Admin UI (section 19) may force `REVOKED` manually (an admin
who knows a credential was compromised); it should not be able to force
`ACTIVE` directly (that must come from a real successful use+report, to
avoid masking a real problem).

---

## 10. LIFECYCLE model

Four kinds of credential, generic, not provider-specific:
- **STATIC** — no `expires_at`, no refresh concept (e.g. most API keys).
- **EXPIRING** — has `expires_at`, no refresh path; once expired, only a
  human replacing the row (or completing reauth) fixes it.
- **REFRESHABLE** — has `expires_at` and a provider-specific refresh
  mechanism the provider integration supplies; API Vault detects "needs
  refresh" (approaching/past `expires_at`) and calls the supplied
  refresh callback, then persists the result and updates health. **API
  Vault does not implement OAuth itself** (explicitly out of scope per
  the brief) — it only orchestrates *when* to call a refresh function the
  caller provides.
- **REAUTH_REQUIRED** — refresh failed in a way that signals the user
  must re-authorize (not a transient error); surfaces distinctly in
  RESOLVE and in the admin UI so a human knows to act.

This four-way split is new relative to what exists today (today there is
no lifecycle concept at all in the verified `ApiVaultEntry` type beyond a
raw `expires_at` timestamp) — it does not contradict anything found, it
fills a gap.

---

## 11. Tenant / global resolution

Directly generalizes the pattern already implemented and verified in
`getClientCredential.ts`:

```
tenant-specific row (tenant_id = X)
        |
        v  (if not found)
global row (tenant_id IS NULL)
```

Explicit rules this design adds (not previously codified anywhere found):
- Fallback is **allowed by default**, mirroring the existing Mapbox
  behavior, but RESOLVE must accept an explicit `allowGlobalFallback:
  false` for callers where a missing tenant-specific credential must be a
  hard failure rather than silently falling through to a shared
  credential (e.g. anything payment-related, where "silently used the
  platform's own MercadoPago key for a tenant's checkout" would be a
  serious bug class, not a convenience).
- No evidence was found (in the files read this session) of a rule for
  "does a user-owned credential override a global one" — this needs a
  human decision once real multi-owner scenarios exist; not decided here,
  flagged as an open question rather than guessed.
- Type/environment act as an **additional narrowing filter**, not a
  fallback dimension — RESOLVE does not, e.g., fall back from
  `production` to `staging` automatically. That would be a much more
  dangerous silent behavior than tenant fallback and nothing in the
  evidence suggests it should exist.

---

## 12. DELIVER security / value exposure — see section 13 for the full model; concurrency below

## 12. Concurrency

The one verified, generalizable pattern is `mapboxToken.ts`'s in-flight
promise cache:

```ts
let inflight: Promise<string | null> | null = null;
// ...
if (inflight) return inflight;
inflight = (async () => { ...; inflight = null; return token; })();
return inflight;
```

Generalized design: any lifecycle operation that may be triggered
concurrently (a refresh, primarily) must be deduplicated per
`credentialId` — a map of `credentialId -> Promise<CredentialReference>`
in the resolving process, not per-platform like today's single module-
level variable (today's Mapbox case only ever has one credential in
flight at a time by construction; a generic RESOLVE serving many
credentials needs a keyed map, not a single variable). This does **not**
require distributed locking to be designed in this phase — a single
in-process map handles the common case (many callers within one edge
function/server instance hitting the same about-to-expire credential).
Whether refresh needs to be safe across multiple concurrent server
instances is a real question for a distributed deployment but is **not
decided here** — no evidence in this snapshot describes the deployment
topology precisely enough to design that safely; flagged as
`REQUIRED FOR IMPLEMENTATION`, not designed.

Explicitly not carried forward: nothing about `TokenManager`'s actual
dedup implementation is asserted here beyond what the brief itself
already described in prose — that file was not read this session (see
section 0).

---

## 13. Security model

Roles, as distinguishable from evidence + the brief's own framework:

| Role | Can resolve (get reference) | Can see `value` | Can create/edit rows | Can force REVOKED | Can trigger refresh |
|---|---|---|---|---|---|
| Browser / anonymous | Only `client_exposed=true` rows, via `getClientCredential` | Only if `client_exposed=true` | No | No | No |
| Browser / authenticated end user | Their own rows (existing "user reads their own" RLS) + `client_exposed=true` rows | Their own rows' values (existing behavior) + client_exposed values | Their own rows (existing `ApiVaultPage.tsx` behavior) | No | No |
| Server / internal trust (edge functions, backend) | Any row needed for the operation it's performing | Yes, for rows it's authorized to consume (server-side, never forwarded to the browser) | Depends on existing service-role policy (not verified this session) | Depends on existing policy | Yes — this is the layer that should call `resolveCredential` and drive refresh |
| Admin (human, via Vault UI) | All (existing admin capability, not independently reverified this session) | Masked by default (section 16); explicit reveal action, existing pattern in `ApiVaultPage.tsx` not fully audited | Yes | Yes | No (admin triggers a human reauth flow, not a raw refresh call) |

Hard rule, unconditional: **the browser must never receive a `value` for a
row where `client_exposed` is not `true`.** This must be enforced at the
RLS layer (as it already is for the existing policies, per DEC-009) —
not merely by an application-layer `if` — because RLS is what actually
stops a crafted request from a compromised or malicious client.
`ApiVaultPage.tsx`'s `type === 'token'` gate is a **UI-layer** guardrail
only; it does not stop a row of `type: 'secret'` from having
`client_exposed` set directly (e.g. via a raw API call bypassing the
form). This is a **real gap** worth calling `REQUIRED FOR
IMPLEMENTATION`: consider a database-level check constraint (e.g.
`CHECK (client_exposed = false OR type = 'token')`) so the safety
property doesn't depend on every future write path remembering to check
it in application code. Not implemented in this session — flagged for
the next agent as part of DEC-011's implementation scope.

---

## 14. Secret storage / value representation

`value` is `text` today, per the verified type. No structured/JSON
convention exists in the verified files for representing a token pair
(access + refresh) — this is a real gap for `REFRESHABLE` credentials.

Design choice (smallest evolution, not a new storage system, per the
brief's own preference): keep `value` as the primary, backward-compatible
field for the simple/static case (unchanged for every existing row and
every existing consumer, including `getClientCredential`, which must
keep working exactly as-is). For structured credentials, add an optional,
nullable JSON column (e.g. `value_json jsonb`) rather than repurposing
`value` — so nothing that already reads `value` as a plain string breaks,
and refreshable-credential logic can store `{accessToken, refreshToken,
expiresAt, providerMeta}` without inventing a serialization convention
inside a text field. This is `REQUIRED FOR IMPLEMENTATION`, not a
decision to touch schema now.

Secrets must never appear in logs: REPORT's `error`/`metadata` fields
must be documented (in code comments and in the admin UX) as "do not put
the credential value here" — this is a discipline requirement, not
something the database can enforce by itself. Rotations: out of scope
for this design phase (no rotation mechanism found in evidence; flagged
as future work, not designed here).

---

## 15. Auditability

No existing audit table was found in this session's evidence.
`created_at`/`updated_at` exist on `api_vault` itself but say nothing
about *use*. Per the brief's own instruction ("first determine whether
existing infrastructure can support this... if a new table is genuinely
required, justify it explicitly"): the persisted `last_checked_at` /
`last_error` on the credential row itself (section 9) cover the
*current* state, but not a *history* of resolves/uses. A genuine audit
trail (who resolved what, when, which tenant, which consumer, outcome)
needs its own append-only table (e.g. `api_vault_events`) because a
single-row "last value" column set cannot represent history. This is
flagged as `REQUIRED FOR IMPLEMENTATION` with an explicit justification
per the brief's rule, not decided as urgent-priority — the health
columns in section 9 are the higher-priority, smaller addition and
should ship first; the event-log table is a reasonable fast-follow, not
bundled into the same migration by default.

---

## 16. Observability (Admin UX data, not implementation)

Admin-visible fields, generic (no per-platform screens): Credential,
Platform, Tenant, Environment, Status, Expiration, Last checked, Last
used, Last error, Consumer (if the audit table in section 15 exists),
Health. **Never display `value` in a list/table view** — `ApiVaultPage.tsx`
already appears to mask values by default per its existing pattern (not
fully audited this session); this design does not change that, only adds
the health/status columns to the same view.

UI states surfaced to the admin, generic: CONNECTED, EXPIRING, EXPIRED,
INVALID, REQUIRES REAUTH, ERROR — a direct mapping from section 9's
health states to admin-friendly labels.

---

## 17. Deployment / bootstrap

Not independently verified this session — no deployment config, CI, or
Supabase Secrets/env-var inventory was read. Per the brief's own
distinction (platform bootstrap secrets vs. runtime provider
credentials): `VITE_MAPBOX_TOKEN` (verified, in `mapboxToken.ts`) is a
clear example of a bootstrap/dev-fallback secret that legitimately stays
in `.env`/build-time env vars rather than moving into `api_vault` — this
design does not propose eliminating that fallback; `getMapboxToken()`'s
existing vault-first/env-fallback order is exactly the right shape and
should be the template other providers eventually follow, not something
this design changes. Anything beyond that (how Supabase Secrets
participate in server-side edge-function bootstrap) is `REQUIRED FOR
IMPLEMENTATION` — needs its own read of the actual deployment config
before design, not guessed here.

---

## 18. Failure model

| Failure | RESOLVE returns | REPORT changes health? | Retry allowed? | Credential marked invalid? |
|---|---|---|---|---|
| Credential missing (no matching row) | Error: not found | n/a (nothing to report against) | n/a | n/a |
| Credential expired, not refreshable | Error: expired (unless caller passed `mustBeUsable: false`) | n/a | No — needs a human/new row | No new marking; `EXPIRED` is already the state |
| Credential expired, refreshable | Auto-refresh attempted first (section 10); on success, `ACTIVE` returned | Yes, on refresh outcome | n/a | Only if refresh itself fails with a reauth signal |
| Credential invalid (REPORT says so) | Error: invalid | Yes → `INVALID` | No | Yes |
| Credential revoked | Error: revoked | Yes → `REVOKED` (terminal) | No | Yes, terminal |
| Refresh failure (transient) | Returns prior state; does not force `REQUIRES_REAUTH` | `ERROR`, but does not overwrite `ACTIVE`/`EXPIRED` state | Yes, caller may retry | **No** — this is the "avoid false invalidation" rule the brief calls out explicitly |
| Provider unavailable / network timeout | Returns prior cached state if available; else error | `ERROR`, transient | Yes | No |
| Vault/database unavailable | Hard error, RESOLVE cannot proceed | n/a | Caller's own retry policy | No |
| Permission denied (RLS/authorization) | Hard error, distinct from "not found" so it isn't confused with a missing credential | n/a | No — this is a caller-side bug, not transient | No |
| Malformed/unsupported credential type | Hard error at RESOLVE time | n/a | No | No |

The one rule worth restating because it's easy to get wrong under
pressure: **a temporary provider outage (network timeout, provider 5xx)
must never downgrade a credential's health from `ACTIVE`.** Only an
explicit, provider-confirmed rejection (401-class, explicit revocation)
does that.

---

## 19. Admin UX (design only)

Generic naming, consistent with the brief's section 24 rule and with what
already exists (`ApiVaultPage.tsx` is already generically named, not
`MetaCredentialsPage.tsx` — this is a pattern already correctly followed
and should continue): "Credentials", "Credential Health", "Credential
Details". No provider-named screens. Add, to the existing table view:
Status, Last checked, Last error — the three new persisted fields from
section 9. Add an explicit "Force revoke" admin action (writes
`REVOKED`, does not touch `value`) — the one manual state transition an
admin should have, per section 9's reasoning about not letting admins
force `ACTIVE` directly.

---

## 20. ML — migration strategy (LOW CONFIDENCE — see section 0)

Because `MLVaultService`, `TokenManager`, `OAuthService`, `ml-oauth`,
`ml-webhook` are not present in this snapshot, this section can only
state a strategy shape, not a concrete plan:

1. **Do not touch ML's runtime behavior in the implementation phase this
   design leads into.** ML must keep working exactly as it does today
   while API Vault's generic contract is built alongside it.
2. Once `resolveCredential`/`reportCredentialResult` exist and are
   proven (e.g. via a lower-stakes consumer first — Mapbox is already
   using the pattern's spirit and is the natural first real caller of the
   *server-side* contract too, if a server-side Mapbox use case exists;
   otherwise a new, small consumer), ML's `TokenManager`/`MLVaultService`
   become candidates to be refactored to **call into** the generic
   contract internally, rather than being deleted and rebuilt. This is a
   strangler-fig migration, not a rewrite, specifically because ML's
   current behavior is reported (DEC-005/CHANGELOG) to be the most mature
   credential-lifecycle implementation in the repo — replacing it outright
   would be higher-risk than wrapping it.
3. The reported `ml-webhook` `.eq("provider", ...)` vs. real `platform`
   column mismatch **must be independently confirmed by reading the real
   file** before it is fixed — under this design, if real, the fix is a
   one-line column-name correction and is unrelated to the credential-
   provider migration itself; it should not be bundled into the same PR
   as the RESOLVE/REPORT rollout, to keep the two changes independently
   revertible.
4. `REQUIRED FOR IMPLEMENTATION`, not decided here: an actual read of
   `MLVaultService`/`TokenManager`/`OAuthService`/`ml-webhook` by the next
   agent, before any ML-touching code is written.

---

## 21. Mapbox compatibility

Verified and straightforward. `getClientCredential` already implements
exactly the client-exposed contract this design formalizes — **no change
required** to `getClientCredential.ts`, `mapboxToken.ts`, `AddressMap.tsx`,
`AddressAutocomplete.tsx`, or `AdminProfile.tsx`'s `reverseGeocode`. They
become the reference example of "a correctly-scoped client-exposed
consumer" in documentation/admin UX, not something migrated to the new
server-side `resolveCredential` (there's no evidence any of these three
call sites need server-side resolution — they're all browser-rendered
map/geocoding UI). If a future server-side Mapbox use case appears (e.g.
a backend geocoding job), *that* new code should use `resolveCredential`,
but the existing three files stay untouched.

---

## 22. Future META consumption

Per section 22 of the brief (restated as the target, not re-derived):
META is fully downstream and blocked until this design is implemented and
verified. When built, META must call `resolveCredential`/
`reportCredentialResult` exactly like any other consumer, own its own
OAuth flow (Instagram/Facebook/WhatsApp scopes, token exchange) as
provider-specific logic, and must not create `MetaCredentialService`,
`MetaVault`, or any per-platform storage. This document does not design
META itself — that remains explicitly out of scope, unchanged from the
brief.

---

## 23. Future generic external-web-import consumption

Same shape as META: a future consumer, not designed here, but the
contract in sections 6–9 is deliberately provider-agnostic so that a
future "import products from an arbitrary external site" module,
shipping providers, payment providers, or AI providers can all resolve
credentials the same way without API Vault knowing anything about any of
them specifically.

---

## 24. Database changes required (PENDING IMPLEMENTATION — none made this session)

- `api_vault.status` (enum or text, per section 9's vocabulary), default
  `UNKNOWN` for all existing rows.
- `api_vault.last_checked_at timestamptz`, nullable.
- `api_vault.last_error text`, nullable.
- Optional `api_vault.value_json jsonb`, nullable (section 14) — only if
  a refreshable credential needs structured storage; not required for
  static credentials.
- Recommended, not required for a first cut: `CHECK (client_exposed =
  false OR type = 'token')` (section 13's gap) — needs a human decision
  since it could reject rows that already violate this if any exist
  (unverified — no data was queried this session).
- Optional, second-priority: `api_vault_events` audit table (section 15).

None of this was created or modified in this session.

---

## 25. Code changes required (PENDING IMPLEMENTATION — none made this session)

- New: `resolveCredential()` server-side function (exact location depends
  on what `apiVaultService.ts` — unread — already contains; may be an
  addition to that file rather than a new one).
- New: `reportCredentialResult()`.
- New: lifecycle/refresh orchestration (section 10/12) — the dedup-map
  generalization of `mapboxToken.ts`'s pattern.
- Unchanged: `getClientCredential.ts`, `mapboxToken.ts`, all three Mapbox
  consumers (section 21).
- Unchanged (pending its own confirmed audit): all ML files — section 20.
- New (admin UX): status/last-checked/last-error columns surfaced in
  `ApiVaultPage.tsx`; a "force revoke" action.

---

## 26. Migration strategy

Additive-only, in this order, each independently shippable and
revertible:
1. Health columns (section 24) — pure addition, `UNKNOWN` default, zero
   behavior change for existing consumers.
2. `resolveCredential`/`reportCredentialResult` implemented, tested
   against a low-stakes new consumer (not ML, not yet) to prove the
   contract.
3. ML's internals refactored to call the generic contract internally
   (strangler-fig, section 20) — only after step 2 is verified stable.
4. Audit table (section 15) — independent of 1–3, can land any time after
   step 1.
5. META (fully separate future project) — blocked until 1–3 are verified.

---

## 27. Backward compatibility

- `getClientCredential`'s signature and behavior: unchanged.
- Every existing `api_vault` row: unaffected by the new columns (all
  nullable/defaulted).
- `ApiVaultEntry` TS type: additive fields only (`status`,
  `last_checked_at`, `last_error`, optionally `value_json`) — existing
  code that destructures a subset of fields keeps compiling.
- No existing consumer (verified: the 3 Mapbox files) requires any code
  change to keep working.

---

## 28. Rollback strategy

Because every schema change in section 24 is additive (new nullable
columns, no column removed or retyped, no existing RLS policy replaced —
only new ones added, matching DEC-009's own "additive policy" pattern),
rollback is: drop the new columns/table if step 2 is abandoned before any
consumer depends on them; no data migration is destructive, so there is
no data-loss risk in reverting. The one place this doesn't hold is if
step 3 (ML refactor) has already shipped and depends on the new columns
— at that point rollback means reverting the ML refactor commit(s)
first, then the schema, in that order.

---

## 29. Testing strategy (design-level; no tests written this session)

- Unit-level: RESOLVE's tenant→global fallback logic, ambiguous-match
  rejection, and health-gating (`mustBeUsable`) behavior — these are the
  core logic points, testable without hitting a real provider.
- Integration-level: REPORT's outcome→health mapping, including the "5xx/
  timeout never downgrades ACTIVE" rule from section 18, since that's the
  rule most likely to be silently violated by a rushed implementation.
- Concurrency: the dedup-map behavior under simulated concurrent resolve
  calls for the same `credentialId`.
- Regression: the 3 Mapbox consumers and `getClientCredential` must
  continue to pass whatever existing manual/verification process was used
  for DEC-009 (this session found no automated test suite in the files
  read — testing tooling itself is out of scope here, same gap DEC-003
  already documented for the wider repo).

---

## 30. Acceptance criteria for "API Vault Credential Provider: IMPLEMENTED"

1. `resolveCredential`/`reportCredentialResult` exist, are used by at
   least one real consumer beyond the design phase, and match sections
   6–9 of this document (or a documented, deliberate deviation is
   recorded as its own DEC entry).
2. Health columns exist, default `UNKNOWN`, and are populated by real
   REPORT calls for at least one consumer.
3. No new per-provider credential-manager class was introduced (section
   4's rule holds).
4. `getClientCredential` and the 3 Mapbox consumers are unmodified and
   still pass verification (section 27).
5. ML has not been touched unless its own files were independently read
   and a corresponding DEC entry documents what was found (section 20's
   confidence gap is closed before ML code changes).
6. META has not been started.
7. This document's `REQUIRED FOR IMPLEMENTATION` items (sections 13's
   check constraint, 14's `value_json`, 15's audit table, 17's deployment
   read) are each either implemented or explicitly deferred with a reason,
   not silently dropped.

---

## Summary status block

```
DESIGN STATUS:              DESIGNED / APPROVED — IMPLEMENTATION PENDING
DOCUMENTS CREATED/MODIFIED: .agent/DEC-011-api-vault-credential-provider-design.md (new)
                             .agent/DECISIONS.md (DEC-011 added)
                             .agent/HANDOFF.md (UPDATE 6 added)
                             .agent/CHANGELOG.md (session entry added)
DECISIONS RECORDED:         DEC-011
CODE CHANGES:                0
DATABASE CHANGES:            0
SECRETS CHANGES:             0
MIGRATIONS:                  0
IMPLEMENTATION READINESS:   PARTIAL — Vault-side contract (sections 5-19)
                             is implementation-ready. ML migration
                             (section 20) is NOT implementation-ready:
                             requires reading MLVaultService/TokenManager/
                             OAuthService/ml-webhook, none of which were
                             available in this session's snapshot.
NEXT AGENT INSTRUCTION:      Before writing any code: (1) locate and read
                             apiVaultService.ts, the base api_vault
                             migration, and the ML integration files this
                             session could not access; (2) reconcile any
                             existing resolve-shaped function found there
                             with section 6 rather than introducing a
                             duplicate; (3) independently verify the
                             ml-webhook provider/platform claim before
                             touching it; (4) implement in the order given
                             in section 26. META remains blocked.
```
