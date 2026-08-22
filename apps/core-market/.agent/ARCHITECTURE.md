# CORE-Market — Architecture Map

> Compact map, not exhaustive documentation. Confirmed 2026-08-21 against
> real `src/` tree, real `supabase/` tree, `src/app/routes.tsx`, and
> `src/utils/supabase/client.ts`. Supersedes the earlier package.json-only
> inference.

## Status
CONFIRMED (structural level). Business logic inside individual services
(e.g. exact ML sync rules, exact document templates) not read line-by-line
— only mapped by name/location.

## What CORE-Market actually is
A Uruguayan e-commerce marketplace ("CORE-Market"). Evidence: BCU (Banco
Central del Uruguay) exchange-rate integration (`bcuApi.ts`,
`useTipoCambio`), Spanish-language domain naming throughout
(`ordenes`, `ventas`, `articulos`, `publicaciones`), and a MercadoLibre
(ML) sync/publish pipeline. It has: a public storefront + cart/checkout,
a buyer/seller dashboard, and a full internal admin panel (catalog,
image editor, bulk import, ML integration, API vault).

## General Flow
```text
Browser (React 18 SPA, client-side routed via react-router-dom v6)
 ↓
src/utils/supabase/client.ts → @supabase/supabase-js client
   (uses VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from env — no
   hardcoded credentials)
 ↓
Supabase (Postgres + Auth + Storage, confirmed linked project —
   supabase/.temp/linked-project.json exists)
 ↓
Supabase Edge Functions (supabase/functions/*, Deno runtime) for anything
   that needs a secret/server-side step: payments, ML OAuth, email,
   webhooks, stock reconciliation, event tracking, age verification
```

## Applications / Structure
Single Vite SPA at repo root, with two internal sub-packages under `src/lib/`
that have their own `package.json`/`tsconfig.json` (effectively a small
internal monorepo, not just folders):
- `src/lib/core-apivault/` — API vault feature (its own `src/`, and its
  own `supabase/migrations/20260607_api_vault.sql`, which matches the
  migration also present at the repo-root `supabase/migrations/` —
  same migration, not a duplicate feature).
- `src/lib/tool-editor/` — a separate tool-editor implementation (`.jsx`,
  not `.tsx` — inconsistent with the rest of the codebase, worth noting).
  Contains `.bak`, `.bak2`, `.bak3` files — stale/backup files sitting in
  source control; flag for cleanup, not touched here.

## Frontend
- Framework: React 18.3.1, Vite 5, `@vitejs/plugin-react`
- Language: TypeScript 5 in `src/app/**` and most of `src/`, but `.jsx`
  (not `.tsx`) inside `src/lib/tool-editor/` — mixed, not fully TS.
- Routing: `react-router-dom` v6, single route table in
  `src/app/routes.tsx` (`createBrowserRouter`). Public routes: `/`,
  `/tienda`, `/carrito`, `/checkout`, `/orden/:id`, `/m/:token` (emotive
  message/label feature), `/success`, `/failure`, `/pending`,
  `/dashboard`, `/dashboard/*`. Admin routes nested under `/admin`
  (dashboard, orders, publicaciones, export, import, carga-masiva,
  profile, catalog/articulos, biblioteca, tool-editor, editor, catalog,
  ml, api-vault).
- **Auth guarding is NOT visible in routes.tsx** — no wrapper/loader
  gating `/admin` or `/dashboard` at the route-table level. Protection,
  if it exists, must live inside the page components themselves via
  `useRequireAuth` (`src/app/hooks/`) and/or `useUserRole` /
  `usePermissions` (`src/dashboard/hooks/`, `src/app/admin/hooks/`) —
  NOT yet confirmed by reading those hooks' contents.
- State management: Zustand (seen concretely in
  `app/admin/editor/engine/useEditorStore.ts`)
- Styling: Tailwind CSS v4 via `@tailwindcss/vite`, plus a notable number
  of hand-written CSS files in `src/styles/` (`brand.css`,
  `core-market-patch.css`, `core-storefront.css`, `theme.css`, etc.) —
  suggests Tailwind is not the only styling mechanism in use.
- **Inconsistency found:** `routes.tsx` imports `AdminAnalytics` from
  `./admin/pages/AdminAnalytics`, but no `AdminAnalytics.tsx` appears in
  the `src/app/admin/pages/` listing captured. Either the file exists
  under a name/location not captured by the tree listing, or this is a
  broken import — needs direct confirmation, not assumed either way.

## Backend
No custom long-running server. Backend logic is split two ways:
1. **Supabase Postgres via `@supabase/supabase-js`**, called directly from
   the client for regular CRUD.
2. **Supabase Edge Functions** (Deno, `supabase/functions/*`) for
   anything needing secrets or server-side orchestration — see full list
   below.

### Edge Functions (confirmed from `supabase/functions/`)
- `crear-orden` — order creation
- `create-paypal-order`, `paypal-webhook` — PayPal payment flow
- `create_preference`, `mp_webhook` — MercadoPago payment flow (`deno.json`
  + `.npmrc` present, so this one has its own Deno deps)
- `extract-catalog` — catalog extraction (likely bulk import related)
- `get-near-products` — geographic "nearby products" query, ties to the
  Mapbox/geo frontend components (`CoreGlobe.tsx`, `MapView.tsx`,
  `AddressMap.tsx`)
- `import-proxy` — proxy for import operations
- `ml-oauth`, `ml-sync`, `ml-webhook`, `publicar-en-ml`,
  `process-ml-queue` — full MercadoLibre integration: OAuth, sync,
  webhook receiver, publish action, and an async queue processor
- `reconcile-stock` — stock/inventory reconciliation
- `send-email` — transactional email
- `track-event` — analytics/event tracking
- `verify-age` — age verification (likely for age-restricted products)
- `_shared/core-mlmp/` — shared module used by the ML functions:
  `MLVaultService.ts`, `OAuthService.ts`, `TokenManager.ts`,
  `MLModuleError.ts` — a small internal SDK for the ML integration,
  including its own token/vault management (parallel concept to the
  frontend's `core-apivault`).

## Database
- Engine: Supabase (Postgres)
- Migrations: `supabase/migrations/20260607_api_vault.sql` (only one
  migration file present at repo root — either the schema was created
  directly in the Supabase dashboard/CLI outside of migration files, or
  most schema history isn't tracked in this repo. Not confirmed either
  way.)
- Project is linked to a real Supabase project (`supabase/.temp/` has
  `linked-project.json`, `project-ref`, `postgres-version`, etc.)

## Authentication
Supabase Auth (via `@supabase/supabase-js`), env-driven
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Role/permission logic
appears to live in `useUserRole` (present in both
`src/app/admin/hooks/useUserRole.ts` and `src/dashboard/hooks/useUserRole.ts`
— two separate files with the same name, not confirmed whether they're
duplicated logic or intentionally distinct) and `usePermissions`
(`src/dashboard/hooks/`). Exact auth flow (login modal →
`LoginModal.tsx` in `src/app/public/` → session handling) not traced
line-by-line.

## Payments
Two payment providers, both via Edge Functions:
- **MercadoPago**: `create_preference` (creates a payment preference) +
  `mp_webhook` (receives payment confirmation)
- **PayPal**: `create-paypal-order` + `paypal-webhook`

## Services / Integrations
- **MercadoLibre (ML)** — full integration (OAuth, sync, webhook, publish,
  queue processor) plus a dedicated frontend admin page (`AdminML.tsx`)
  and hooks. This is a first-class feature, not a minor add-on.
- **Mapbox / geo** (`mapbox-gl`, `geojson`, `topojson-client`) — used for
  `CoreGlobe.tsx`, `MapView.tsx`, `AddressMap.tsx`,
  `AddressAutocomplete.tsx`, and backed by the `get-near-products` edge
  function — i.e. geo isn't decorative, it powers a real "nearby
  products/sellers" feature.
- **BCU (Banco Central del Uruguay)** exchange rate — `bcuApi.ts` +
  `useTipoCambio` hook, used somewhere in pricing/checkout (not traced to
  exact call site).
- **PDF** (`pdfjs-dist`) — likely used in `AdminBiblioteca` or the
  document-generation flow for reading/rendering PDFs (not confirmed
  which specific screen).
- **CSV** (`papaparse`) — used by `AdminCargaMasiva` (bulk upload) and/or
  `AdminExport`, matching `api/cargaMasivaClient.ts`.
- **Client-side background removal** (`@imgly/background-removal`) —
  confirmed used in `app/admin/editor/engine/bgRemoval.ts`, part of the
  in-house product-photo editor (`EditorPage.tsx` +
  `AdjustPanel`/`EffectsPanel`/`TransformPanel`/etc.)
- **Document generation engine** — custom, in
  `src/app/services/documentos/`: templates for `remito` (delivery note),
  `etiquetaEnvio` (shipping label), `ticket`, `acuseRecibo` (receipt
  acknowledgment), each built from reusable blocks (`footer`, `items`,
  `persona`, `qr`, `styles`) via a small `engine/` (context + registry)
  and a `baseHTML` renderer — this generates HTML documents (printable,
  likely also used for the `qr` block on shipping labels).
- **Order status state machine** — `src/app/services/ventas/handlers/`:
  `handleVentaPagada`, `handleVentaPreparando`, `handleVentaEnviada`,
  `handleVentaEntregada` (paid → preparing → shipped → delivered), driven
  by `cambiarEstadoVenta.ts`.

## Data Flow (critical paths only)
```text
Storefront (MarketPage) → CarritoPage → CheckoutPage
   → Edge Function (create_preference / create-paypal-order)
   → external payment provider
   → webhook (mp_webhook / paypal-webhook)
   → crear-orden (order created in Supabase)
   → ventas handlers (state machine: pagada → preparando → enviada → entregada)
   → documentos engine (remito / etiqueta / ticket generated per state)
```
```text
Admin → AdminCargaMasiva (bulk import, CSV via papaparse)
   → api/cargaMasivaClient.ts
   → extract-catalog / import-proxy edge functions
   → Supabase (products/catalog tables)
```
```text
Admin → AdminML → ml-oauth (connect ML account)
   → publicar-en-ml (publish product) / ml-sync (sync state)
   → ml-webhook (receive ML events) → process-ml-queue (async processing)
   → _shared/core-mlmp (TokenManager, MLVaultService, OAuthService)
```
Exact data shapes and table names not traced (would require reading the
service files themselves, not just their existence/location).

## Critical Dependencies
- `@supabase/supabase-js` — data layer + auth, env-driven config
- `mapbox-gl` — needs a Mapbox token; **location of that token not yet
  confirmed** (check `.env` / Vite env vars — not inspected, and secrets
  should never be pasted into `.agent/*.md` files)
- Two payment providers (MercadoPago + PayPal) each with their own Edge
  Function pair — any change to checkout must consider both
- MercadoLibre integration — has its own token/vault system
  (`core-mlmp`), separate from the frontend's `core-apivault`; don't
  conflate the two when working on either
- `src/lib/core-apivault` and `src/lib/tool-editor` are semi-independent
  packages with their own `package.json` — changes there may need their
  own install/build step, not just the root `npm install`

## Gaps / things still not confirmed
- No `lint`, `test`, or `typecheck` script exists in the root
  `package.json` (see CURRENT.md). `agent:verify` today only runs `build`.
- Whether `AdminAnalytics.tsx` exists (imported in routes.tsx but not
  seen in the captured `pages/` listing).
- Whether `src/app/admin/hooks/useUserRole.ts` and
  `src/dashboard/hooks/useUserRole.ts` are duplicated logic or
  intentionally different per-context implementations.
- Exact auth-guarding mechanism for `/admin` and `/dashboard` routes.
- Whether the two `ProductCard.tsx` files (`src/app/components/brand/`
  and `src/app/public/`) are duplicates or genuinely different components
  for different contexts.
- Whether `src/services/carritoApi.ts` (top-level `src/services/`) and
  `src/app/services/carritoApi.ts` (under `app/services/`, implied by the
  tree) are the same file duplicated, or distinct — the tree shows a
  `services/` folder at both `src/services/` (with just `carritoApi.ts`)
  and `src/app/services/` (with many files including its own
  `carritoApi.ts`) — worth resolving, could be dead code either way.

---

# CORRECTIONS — 2026-08-22 pass (supersede the sections above)

The map above was built from structure (imports, file locations, names).
Running `tsc --noEmit` for the first time (DEC-003) contradicted parts of
it. Where this section and the text above disagree, **this section wins.**

## C1. The order state machine and the document engine are NOT wired in

The "Data Flow (critical paths only)" diagram above shows
`crear-orden → ventas handlers → documentos engine` as a live path. That
is wrong. Those two subsystems form a **connected island that nothing
outside imports**:

```text
cambiarEstadoVenta.ts → registerHandlers.ts → handleVentaPagada / Preparando
                                            / Enviada / Entregada
   ↑
   nothing in the app imports cambiarEstadoVenta
```

Evidence: a grep for `cambiarEstadoVenta`, `services/ventas`,
`generateDocumentHTML`, and `services/documentos` across `src/` returns
hits only from inside `src/app/services/` itself.

Corroborating evidence — the island's imports are broken, which is only
possible because Vite never enters it:
- 8 files under `services/ventas/`, `services/ventas/handlers/`,
  `services/productos/`, and `services/documentos/` import
  `../../utils/supabase/client` (or `../../../...`) at a path depth that
  resolves to `src/app/utils/supabase/client`. That directory does not
  exist; the real client is at `src/utils/supabase/client.ts`. Every one
  of those paths is off by one level.
- `templates/remito.ts`, `templates/ticket.ts`, and
  `templates/acuseRecibo.ts` all import `../blocks/header`. The `blocks/`
  directory contains `footer`, `items`, `persona`, `qr`, `styles`,
  `utils`, `wrap` — there is **no** `header.ts`.

Conclusion: remito / etiqueta de envío / ticket / acuse de recibo and the
`pagada → preparando → enviada → entregada` transitions are **written but
not functional**. Treat them as unfinished work, not as features.

## C2. `src/dashboard/` is entirely orphaned

Six files (`DashboardPage.tsx`, `layout/DashboardLayout.tsx`,
`layout/Sidebar.tsx`, `layout/Topbar.tsx`, `hooks/useUserRole.ts`,
`hooks/usePermissions.ts`). Nothing outside the directory imports any of
them. `routes.tsx` maps `/dashboard` and `/dashboard/*` to
`DashboardRedirect` from `./public/`, not to this tree. Its internal
imports are broken too (`../layout/DashboardLayout` from
`src/dashboard/DashboardPage.tsx`; `../../lib/supabase` from
`src/dashboard/hooks/useUserRole.ts` — `src/lib/supabase` does not exist).

This resolves an Open Question: the two `useUserRole.ts` files are **not**
"intentionally distinct per-context implementations." One is live
(`src/app/admin/hooks/useUserRole.ts`), the other is in dead code.

## C3. Auth guarding for `/admin` — found, and it is weaker than it looks

Resolves the "exact auth-guarding mechanism" Open Question. There is no
route-level guard; the check is inside
`src/app/admin/components/AdminLayout.tsx` (~line 282):

```tsx
const { user, isAdmin, loading } = useUserRole();
if (loading) return <...Cargando... />;
if (!user) { navigate("/"); return null; }
```

`isAdmin` is destructured and then **never used as a gate**. The only
condition enforced is "is there a session at all." Any authenticated
user — not just an admin — passes into `/admin` and every nested admin
route.

NOT FIXED in this pass: it is a security-relevant behavior change and
needs a human decision on the intended policy (redirect? 403 view?
per-route granularity?). Flagged here so it is not rediscovered a fourth
time.

## C4. `/m/:token` (Etiqueta Emotiva) has a live runtime bug

`src/app/public/MensajePage.tsx` is a real mounted route. It calls
`` fetch(`${API}/etiquetas/token/${token}`) `` at lines 58, 70, and 84,
but `API` is **never declared or imported** in that file. It imports
`projectId` and `publicAnonKey` from `../../utils/supabase/info` and
defines `HEADERS` and `ORANGE` — the line that was presumably meant to
build `API` from `projectId` is simply missing.

`vite build` cannot catch this (esbuild does not resolve free
identifiers). At runtime the page throws `ReferenceError: API is not
defined` as soon as its effect runs. Reported as TS2304 by
`typecheck:full`.

NOT FIXED in this pass: the correct base URL is a product/infrastructure
fact (which Edge Function or external API serves `/etiquetas/...`), not
something to guess.

## C5. `MapView.tsx` uses Google Maps, not Mapbox

`src/components/MapView.tsx` references the `google` global (TS2304).
The geo stack above is described as Mapbox-only; at minimum this one
component is on a different provider, or is stale. Not investigated
further.

---

# STATUS OF CORRECTIONS C1–C5 — updated 2026-08-22 (same day, after DEC-005/006)

- **C1 (ventas/documentos island)** — RESOLVED BY DELETION. The island and
  `src/app/events/` are gone (DEC-005). Consequence to internalize: the
  marketplace has **no fulfillment layer**. `ordenes.payment_status` and
  `ordenes.estado` are the only order state that exists. Build fulfillment
  on `ordenes.estado` when the time comes; do not reintroduce a second
  order model.
- **C2 (`src/dashboard/` orphaned)** — RESOLVED BY DELETION. Note there is
  a *second* orphaned dashboard still in the tree, under
  `src/app/public/Dashboard*.tsx` + `MisPublicacionesPage.tsx`, reachable
  from nothing because `/dashboard` redirects to `/admin`. Left in place
  deliberately (DEC-005 "Deliberately NOT deleted").
- **C3 (`/admin` role check)** — NOT FIXED, and deliberately so. Escalated:
  the role lives in client-writable `user_metadata`, so this is privilege
  escalation, not a weak guard. See DEC-006 for the diagnosis query and
  the remediation path. **Highest-priority open item in this repo.**
- **C4 (`/m/:token` runtime bug)** — RESOLVED BY DELETION. The whole
  Etiqueta Emotiva feature is gone (DEC-005); it had no backend, no table,
  and no admin UI. If it returns, it is a feature to build, not a bug to fix.
- **C5 (`MapView.tsx` uses Google Maps)** — STILL OPEN. Two TS2304 `google`
  errors remain. Either add `@types/google.maps` or migrate the component
  to Mapbox like the rest of the geo stack. A dependency change, so not
  done here.
