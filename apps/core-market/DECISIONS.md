# CORE-Market — Decisions

> Log of architectural / cross-cutting decisions made by agents (or humans)
> while working on CORE-Market. See AGENTS.md section 4: existing entries
> are not edited in place — they are superseded by new entries.

## DEC-001 — `AdminAnalytics` import in `routes.tsx` is dead code, remove it

### Date
2026-08-21

### Decision
The `AdminAnalytics` import in `src/app/routes.tsx` (line 16, from
`./admin/pages/AdminAnalytics`) points to a file that does not exist and
is never referenced as a route element anywhere in that file. It should
be deleted as a one-line cleanup. No route/page needs to be rebuilt
unless a human confirms `AdminAnalytics` was an intentional, still-wanted
feature (in which case recover it from git history rather than
rewriting it from scratch).

### Reason
Direct evidence, gathered in this session, confirms both halves of the
claim:
- A real `dir src\app\admin\pages\` listing (no `-Filter`, no cache) does
  not contain `AdminAnalytics.tsx`. Earlier `Get-ChildItem -Filter
  "AdminAnalytics*"` misses were a red herring, not proof the file was
  present.
- A clean, cache-free `npx vite build` (after removing `node_modules/.vite`
  and `dist`, bypassing Turborepo/pnpm) still succeeds. This is only
  possible because esbuild/Rollup elide an import that is never used as a
  runtime value (e.g. never passed to `element:`) before Rollup tries to
  resolve its file path — confirmed via `Select-String -Pattern
  "AdminAnalytics"` on `routes.tsx`, which shows only the import line and
  no usage. So `agent:verify` (build-only) structurally cannot catch this
  class of bug: there is no `typecheck` script running `tsc`, which would
  otherwise flag it via `noUnusedLocals: true`.

### Impact
- `src/app/routes.tsx`: remove the one dead import line. No other file
  depends on this import (nothing references `AdminAnalytics` elsewhere
  per the same search).
- Confirms `Known Problems` item "no typecheck script" as directly
  responsible for this bug going undetected — raises the priority of
  eventually wiring `tsc --noEmit` into `agent:verify`, without silently
  adding it (per AGENTS.md §7, that's still an app-adjacent tooling
  change to flag, not auto-apply).
- No functional/runtime behavior of the shipped app changes either way,
  since the import was already dead weight in every build to date.

### Status
ACTIVE — recommendation only; the one-line deletion in `routes.tsx`
itself was not applied by an agent in this session (see AGENTS.md §7:
this layer doesn't touch application code). Next agent/human should
apply it and flip this entry's file-level TODO off in a follow-up
CHANGELOG entry.

---

## DEC-002 — `C:\CORE\apps\core-market` is the canonical repo; `Charlie/apps/market` is a frozen fossil

### Date
2026-08-22

### Decision
All CORE-Market work happens in `C:\CORE\apps\core-market`. The copy at
`C:\Charlie\apps\market` (also `"name": "core-market"` in its
package.json) is to be treated as a read-only historical snapshot. Do not
edit it, do not port changes into it, and do not use it to answer
questions about what the marketplace does.

### Reason
Evidence gathered directly, not inferred:
- `C:\CORE\apps\core-market` is its own git repository with live history.
  HEAD is `ee92871` (2026-08-21 21:39), the working tree was clean at the
  start of this session, and the legacy-cleanup commit (removal of the old
  Next.js `app/` dir and stale backups) has already landed there.
- `Charlie/apps/market` is tracked inside the Charlie monorepo but every
  one of its 253 files traces to a single commit, `3fed007 feat: init
  charlie monorepo` (2026-07-02). Nothing has touched it since — roughly
  seven weeks stale.
- It still carries `next.config.js`, `middleware.ts.bak`, and assorted
  `.ps1` patch scripts, i.e. exactly the legacy layer that CORE already
  deleted in `ee92871`.
- The recent commits on the active Charlie branch
  (`claude/marketplace-features-4b4052`: `0d99fe6`, `cd6f940`, `4a9cf0c`)
  touch only `apps/orquesta/**` and `vercel.json`. None of them touch
  `apps/market`, so no live build depends on the Charlie copy.

### Impact
- Removes the ambiguity that would otherwise make every future "which
  file do I edit?" question a coin flip.
- `.agent/*` continuity (this whole system) lives only in the CORE copy,
  which is consistent with making it canonical.
- If the Charlie monorepo ever needs the marketplace, it should consume
  CORE rather than keep a divergent copy — but that is a separate
  decision, not made here.

### Status
ACTIVE

---

## DEC-003 — Wire TypeScript as `typecheck:full` (reporting), not yet as a blocking gate

### Date
2026-08-22

### Decision
Add `"typecheck:full": "tsc --noEmit"` to `package.json`. Deliberately
do **not** name it `typecheck`, `type-check`, or `tsc`, because
`scripts/agent-verify.js` auto-detects those names (see its `CANDIDATES`
map) and would immediately turn `agent:verify` red. Promote it to the
gating name `typecheck` only once the error count reaches zero.

### Reason
DEC-001 established that `agent:verify` (build-only) structurally cannot
catch dead/broken imports, and recommended wiring `tsc --noEmit`. That
recommendation was correct but incomplete: it assumed the codebase was
close to type-clean. It is not.

Measured this session, with the two syntactically-broken files set aside:
**374 errors across 64 files.** Breakdown by code:

| Code    | Count | Meaning                                  |
|---------|-------|------------------------------------------|
| TS6133/TS6196 | 157 | unused locals/params (`noUnusedLocals`) |
| TS2339  | 95    | property does not exist on type          |
| TS18047 | 28    | value is possibly `null`                 |
| TS7006  | 27    | implicit `any` parameter                 |
| TS2307  | 15    | **cannot find module** (broken imports)  |
| TS2345  | 11    | argument type mismatch                   |
| TS7016  | 5     | missing `@types` (papaparse)             |
| TS2304  | 5     | **cannot find name** (undefined symbol)  |
| other   | ~31   |                                          |

A gate that is red on day one is a gate everyone learns to ignore. Naming
it out of `agent:verify`'s detection range keeps the signal available on
demand (`pnpm run typecheck:full`) without producing a permanently
failing verification step.

Explicitly rejected alternative: relaxing `noUnusedLocals` /
`noUnusedParameters` in `tsconfig.json` to shrink the number. Those two
flags are precisely what would have caught DEC-001. Weakening them to
make a metric look better would defeat the purpose of adding the check.

### Impact
- `pnpm run typecheck:full` is now available and returns a real,
  reproducible error inventory.
- `agent:verify` still reports PASS (build only) — verified this session.
- Promotion criteria, for whoever burns the backlog down: when
  `typecheck:full` exits 0, rename the script to `typecheck` in
  `package.json`. No change to `agent-verify.js` is needed; it will pick
  the new name up automatically.

### Status
ACTIVE

---

## DEC-004 — Repair `Sidebar.tsx`; `CoreStorefront.tsx` deletion deferred to a human

### Date
2026-08-22

### Decision
Two files in the tree have never been syntactically valid TypeScript.
Both entered git already broken, in the initial snapshot `446872f`
(2026-07-05); no later commit has ever touched either of them.

1. `src/dashboard/layout/Sidebar.tsx` — **repaired.** Line 32 was
   `<a href={item.path} style={{ color: 'var(--color-primary)',` — an
   unterminated style object and an unclosed JSX tag. Closed both. One
   line changed, nothing else.
2. `src/app/public/CoreStorefront.tsx` (912 lines) — **deletion
   recommended, NOT performed.** Left in place for a human decision.

### Reason
Neither file breaks `vite build`, because neither is reachable from the
entry graph — esbuild never parses them. This is the same blind spot as
DEC-001, one class worse.

On `CoreStorefront.tsx` specifically, the evidence that it is a fossil:
- Its body is structurally destroyed. Around line 175 a `fetch(...)` call
  is cut off mid-object literal and JSX belonging to a completely
  different component (a login button) is spliced in. A chunk of the file
  was lost. It cannot be "fixed" without inventing the missing code.
- Nothing imports it. The only other occurrences of the name in `src/`
  are header comments in `CrossSellBar.tsx`, `LoginModal.tsx`,
  `ProductCard.tsx`, and `SHCard.tsx` — the components that were
  extracted *out of it*. It is the gutted remains of the pre-split
  monolith ("CORE Marketplace Builder v1.5").
- The live storefront is `src/app/public/MarketPage.tsx` (297 lines),
  which is what `routes.tsx` actually mounts at `/` and `/tienda`.

It was not deleted because deleting 912 lines of source is a product
call, not a tooling call, and this session's mandate was tooling. It is
fully recoverable either way — see below.

### Impact
- `typecheck:full` currently reports 7 syntax errors from
  `CoreStorefront.tsx`. Critically, those parse failures **suppress all
  semantic diagnostics for the rest of the codebase** — this was measured,
  not assumed: with the file excluded, the error count goes from 7 to 374.
  So until it is removed, `typecheck:full` is close to useless.
- Recovery, if the deletion is ever regretted:
  `git show 446872f:src/app/public/CoreStorefront.tsx > <path>`

### Status
ACTIVE — item 1 applied, item 2 awaiting human go-ahead.

---

## DEC-005 — Delete the Etiqueta Emotiva feature, the `ventas`/`documentos` island, and the orphaned trees

### Date
2026-08-22

### Decision
Deleted, with explicit human authorization ("si hay que eliminar que no
quede nada"), 39 files in four groups. Everything is recoverable from git
history; nothing was deleted that had a live caller.

**1. Etiqueta Emotiva (`/m/:token`)** — feature removed entirely.
- `src/app/public/MensajePage.tsx`
- its `import` and its route entry in `src/app/routes.tsx`
- `src/app/services/ordenesApi.ts` (same phantom backend — see below)
- `src/utils/supabase/info.ts` (orphaned once its only two consumers went)

**2. The `ventas` / `documentos` island** — 23 files:
- `src/app/services/ventas/**` (state machine + 4 handlers)
- `src/app/services/documentos/**` (engine, blocks, renderers, 4 templates)
- `src/app/events/**` (eventBus, registerHandlers, types) — consumed only
  by the island

**3. Orphaned trees and fossils:**
- `src/dashboard/**` (6 files — a second, fully orphaned dashboard)
- `src/app/public/CoreStorefront.tsx` (912-line unparseable fossil, DEC-004)
- `src/app/public/ProductCard.tsx`, `src/app/public/CrossSellBar.tsx`
  (children of CoreStorefront, orphaned by its removal)
- `src/app/services/productos/ranking.ts` (broken supabase import path,
  zero importers)

### Reason
**Etiqueta Emotiva had no backend, not a missing line.** The undefined
`API` was reconstructible — `src/app/services/ordenesApi.ts` used the
sibling pattern `` `https://${projectId}.supabase.co/functions/v1/api/ordenes` ``
— so `API` was meant to be `.../functions/v1/api`. But **no edge function
named `api` exists** in `supabase/functions/`. Neither does an `etiquetas`
table (no `.from("etiquetas")` anywhere), nor any admin UI to create a
label. The feature existed only as one orphan page pointing at a server
that never shipped. `ordenesApi.ts` targets the same phantom endpoint and
had zero importers, so it went with it. Supplying a guessed base URL would
have converted a loud `ReferenceError` into a silent 404 — strictly worse.

**The island targets a table nothing else in the system knows about.**
Ten `from("ventas")` calls, all inside the island. Verified against the
real backend: `crear-orden` calls the RPC `crear_orden_segura`, and
`mp_webhook` writes to `ordenes` — no edge function, no migration, and no
live frontend code references `ventas` at all. Combined with its
systematically off-by-one import paths and a `blocks/header` that never
existed, the island had never executed. This also removes the third of
three competing order-status vocabularies (`ordenes.payment_status`
paid/pending; `ordenes.estado` pagado/pendiente; `ventas.estado`
pagada→preparando→enviada→entregada).

### Impact
- `typecheck:full`: **374 errors / 64 files → 279 / 44.** Broken-import
  errors (TS2307) inside this repo went from 15 to 1 (`topojson-specification`,
  a missing `@types` package, not broken code).
- `agent:verify` → PASS after every deletion.
- **The marketplace now has no fulfillment layer at all** — no shipping
  state, no remito/etiqueta/ticket generation. That capability was already
  non-functional; deleting it makes the gap honest instead of hidden. When
  fulfillment is built, build it on `ordenes.estado` (that column already
  exists on the live table), not on a second order model.
- Recovery for any file: `git show ee92871:<path>`

### Deliberately NOT deleted
Applying the rule *delete what provably never worked; report what is
merely unwired*:
- `src/app/public/DashboardLayout.tsx`, `DashboardPage.tsx`,
  `DashboardOrdenes.tsx`, `DashboardPerfil.tsx`,
  `DashboardPublicaciones.tsx`, `MisPublicacionesPage.tsx` — a whole
  buyer/seller dashboard, orphaned only because `/dashboard` currently
  redirects to `/admin` (`DashboardRedirect.tsx`). This is valid code that
  looks parked, not dead. Needs a product call.
- `src/app/services/depositosApi.ts`, `entregasApi.ts`,
  `inventarioApi.ts` — zero importers but syntactically sound; they look
  like the logistics layer waiting to be wired.
- `src/app/components/brand/ProductCard.tsx`, `src/app/public/FiltersSidebar.tsx`,
  `src/services/carritoApi.ts` — orphaned, but predate this cleanup.

### Status
ACTIVE

---

## DEC-006 — Do NOT "fix" the `/admin` guard in client code; the role source is the bug

### Date
2026-08-22

### Decision
Left `AdminLayout.tsx` and `useAdminOrders.ts` unchanged, despite having
authorization to change them. The client-side guard is not where this is
fixable, and the obvious one-line "fix" carries a real lockout risk.

### Reason
The full chain, all confirmed by reading the code:
- `src/app/admin/hooks/useUserRole.ts` derives
  `isAdmin = user.user_metadata?.role === "admin"`.
- `user_metadata` is **writable by the user it belongs to**. This repo
  already performs exactly that write from the browser, in two places:
  `AdminProfile.tsx:86` and `DashboardPerfil.tsx:17`
  (`supabase.auth.updateUser({ data: {...} })`). The same call with
  `{ data: { role: 'admin' } }` self-promotes any account.
- `useAdminOrders.ts:18` then uses that same client-computed flag to
  decide whether to scope the query:
  `if (!isAdmin) query = query.eq("user_id", user.id)`. A self-promoted
  user skips the filter and requests every order — including `user_id`,
  `mp_payment_id`, `paypal_order_id`, and totals.

Adding `if (!isAdmin) navigate("/")` to `AdminLayout` would therefore
secure nothing (the attacker sets the flag) while risking locking the
legitimate owner out of their own admin panel if their account does not
carry `role: "admin"` in metadata — which cannot be verified from the
repo. Bad trade in both directions.

### Impact / required remediation (needs DB access — not doable from the repo)
1. **Diagnose first.** Whether this is an active leak depends entirely on
   RLS, and the schema is not tracked in this repo (only
   `20260607_api_vault.sql` exists):
   ```sql
   select tablename, rowsecurity from pg_tables where schemaname = 'public';
   ```
   If `ordenes` shows `rowsecurity = false`, every order is readable with
   the anon key today, independent of any UI guard.
2. **Move the role to a server-controlled source** — a `profiles` /
   `user_roles` table with an RLS policy that forbids self-update, or a
   custom JWT claim set by an auth hook. The correct pattern already
   exists in this repo: `20260607_api_vault.sql` enables RLS and scopes
   every policy by `auth.uid()`. Copy it.
3. **Then** enforce RLS on `ordenes` (and any other admin-read table), and
   only after that treat the UI guard as cosmetic UX.

### Status
ACTIVE — diagnosis and remediation blocked on database access.

---

## DEC-007 — Design-token migration: legacy orange/grey palette is NOT auto-mapped to brand tokens

### Context
A new task ("CORE MARKET — DESIGN TOKEN ENFORCEMENT") asked for every
visual CSS property under `src/app` to consume the existing Design
System tokens (`src/styles/brand.css` + `src/styles/theme.css`), starting
with three named files: `AdjustPanel.tsx`, `AdminCargaMasiva.tsx`,
`Navbar.tsx`. Explicit constraints: no redesign, no new tokens invented
to hide hardcodes, visual output must stay equivalent.

### What the audit found
`src/app` has **1,651** hardcoded hex colors and **198** `rgba()/rgb()`
calls across 50+ files. They fall into two very different buckets:

1. **~150 occurrences that are exact matches for existing tokens**
   (`#3D5689` = `--brand-madre`, `#0D2B55` = `--brand-navy`, `#1C6E86` =
   `--tech`, `#8A8678` = `--mute`, `#fff`/`#ffffff` = `--card` /
   `--color-text-light`, etc.). These are safe, mechanical, zero-risk
   substitutions — the rendered pixel value does not change.

2. **A second, much larger palette with NO token equivalent at all:**
   `#FF7A00` (orange "ACCENT"), `#0F3460` (navy "BLUE"), `#1DC878`
   (green "GREEN"), plus a full Tailwind default grey scale (`#E5E7EB`,
   `#6B7280`, `#9CA3AF`, `#F9FAFB`, `#6BB87A`...). Counted standalone:
   `FF7A00`×78, `0F3460`×12, `1DC878`×9, `E5E7EB`×136, `6B7280`×93,
   `9CA3AF`×119, `F9FAFB`×22, `6BB87A`×37 — roughly **500 occurrences**
   across ~20 files, concentrated in `AdminProfile.tsx` (143 hex),
   `AdminPublicaciones.tsx` (116), `AdminMisPublicaciones.tsx` (115),
   `AdminCatalog.tsx` (106), `AdminBiblioteca.tsx` (80),
   `AdminImport.tsx` (77), `SHCard.tsx` (74), `AdminArticulos.tsx` (74),
   and the photo-editor panels (`TransformPanel.tsx`, `EffectsPanel.tsx`,
   `HistoryPanel.tsx`, `ExportPanel.tsx`, `EditorPage.tsx`,
   `AdjustPanel.tsx` itself).

   This orange/navy/green/grey system is visually unrelated to
   `brand.css`'s actual palette (blue "madre" `#3D5689` + warm neutrals
   from the "Manual de Marca v1.0 · Junio 2026" rebrand documented at the
   top of that file). It looks like the **pre-rebrand admin theme**,
   still hardcoded everywhere it was never touched by the rebrand.

### Decision
**Do not map bucket 2 onto the nearest existing brand token.** Doing so
(e.g. `#FF7A00` → `var(--brand-madre)`, orange → blue) would silently
change the rendered color of ~500 UI spots across the whole admin panel.
That is a redesign, not a normalization — explicitly forbidden by the
task ("No: cambiar colores porque parecen mejores"). It is also not
"one component's hardcode" that DEC-007 could route around quietly: it
is a second, internally-consistent color system used deliberately and
repeatedly (`ACCENT`/`BLUE`/`GREEN` constants defined at the top of 10+
files), which per §7 of the task brief is exactly the case where a new
token category should be *proposed*, not invented silently.

Bucket 1 (exact matches) **was** migrated to tokens — see CHANGELOG.

### Required human input before bucket 2 can be touched
Someone with product/design authority needs to pick one:
  a) The orange/navy/green system is intentional and current (the admin
     panel is meant to look different from the storefront) → propose
     3 new tokens (e.g. `--admin-accent`, `--admin-accent-alt`,
     `--admin-success`) that alias these exact hex values, then migrate
     ~500 call sites onto them. Zero visual change, full compliance.
  b) The orange/navy/green system is pre-rebrand debris and the admin
     panel should now use the `brand.css` palette like the storefront
     does → this is a genuine redesign (visually different), out of
     scope for a token-enforcement pass and needs its own sign-off.
  c) Leave it as documented technical debt for now.

The same ambiguity applies to the Tailwind default greys (`#E5E7EB` /
`#6B7280` / `#9CA3AF` / `#F9FAFB`): they sit close to, but not exactly
on, `--border` (`#E4E1D8`) / `--gray-*` tokens. Small enough to be
imperceptible if swapped, but that swap was intentionally NOT done
network-wide in this session — only inside the 3 target files, where it
was low-risk and reviewable in isolation.

### Status (2026-08-22, updated by FASE 2 analysis)
**PROPOSED — RECOMMENDATION: OPTION A (with one carve-out), pending
human approval. Not implemented. No code touched in this phase.**

#### Executive conclusion
`#FF7A00` / `#0F3460` / `#1DC878` are not an admin-specific design
choice. They are the **primary/secondary/success colors of "ODDY"**, an
earlier name/brand for this same product, documented in a contextual
note dated **28 abril 2026** found in this repo's own first commit
(`git show 446872f:"Resumen contextual — ODDY_Fron.txt"`):

> `AdminLayout.tsx` — sidebar azul oscuro (`#0F3460`) + naranja
> (`#FF7A00`)

`brand.css` records the rebrand to the current blue "madre" palette as
happening in **Junio 2026** — a month *after* that note, and the
`AdminLayout`/sidebar shell described in the note is a *different* file
from the one currently in the repo: today's `AdminLayout.tsx` no longer
hardcodes `#0F3460`/`#FF7A00` at all — it imports a `BRAND` object from
`src/app/components/brand/Brand.tsx` with `primary:"#3D5689"`,
`secondary:"#0D2B55"`, matching `brand.css`'s current tokens exactly.
**The top-level admin shell was already migrated.** What's left with the
ODDY colors is everything *inside* it that was never revisited: the
photo editor (`AdjustPanel`, `TransformPanel`, `EffectsPanel`,
`HistoryPanel`, `ExportPanel`, `EditCanvas`, `OriginalCanvas`,
`EditorPage`), catalog tree UI (`CatalogTree.tsx`, `TreeNode.tsx`),
bulk-admin pages (`AdminProfile`, `AdminPublicaciones`,
`AdminMisPublicaciones`, `AdminCatalog`, `AdminBiblioteca`,
`AdminImport`, `AdminArticulos`, `AdminExport`,
`SelectorMediaArticulo`), and — notably — it also leaked into
**public-facing storefront components** (`ProductCard.tsx` rating
stars, `AddressCard.tsx` "default address" badge, `AddressMap.tsx`,
`AddressAutocomplete.tsx`), so this was never an "admin design language"
decision either. It is undone migration debt, present anywhere the
rebrand pass didn't reach.

There is also **a third, undocumented token system**: `Brand.tsx`'s
`BRAND` object duplicates `brand.css`'s hex values in JS instead of
consuming the CSS custom properties. That's a separate, smaller finding
— flagged here, not in scope for DEC-007's color question, but worth its
own cleanup ticket (it's the "no crear un segundo sistema de tokens"
violation AGENTS.md §3 warns about, just with matching rather than
conflicting values).

#### Legacy palette inventory (approximate, `src/app`)
| Value | Occurrences | Files |
|---|---|---|
| `#FF7A00` | 78 | 23 (list below) |
| `#0F3460` | 12 | subset of the 23 |
| `#1DC878` | 9 | subset of the 23 |
| Tailwind grey scale (`#E5E7EB`,`#6B7280`,`#9CA3AF`,`#F9FAFB`,`#6BB87A`) | 407 | 30 |

23 files carry the core-3 legacy brand colors: `ProductCard.tsx`,
`AddressCard.tsx`, `AddressMap.tsx`, `AddressAutocomplete.tsx`,
`TransformPanel.tsx`, `EditCanvas.tsx`, `OriginalCanvas.tsx`,
`EffectsPanel.tsx`, `HistoryPanel.tsx`, `ExportPanel.tsx`,
`AdjustPanel.tsx`, `EditorPage.tsx`, `TreeNode.tsx`,
`SelectorMediaArticulo.tsx`, `CatalogTree.tsx`, `AdminArticulos.tsx`,
`AdminCatalog.tsx`, `AdminBiblioteca.tsx`, `AdminPublicaciones.tsx`,
`AdminExport.tsx`, `AdminMisPublicaciones.tsx`, `AdminProfile.tsx`,
`AdminImport.tsx`. The 30-file grey-scale list overlaps heavily with
this set but is not identical (greys also show up in files that never
used the orange/navy/green trio).

#### Semantic mapping
| Legacy value | Context | Semantic role | Current CORE equivalent | Confidence |
|---|---|---|---|---|
| `#FF7A00` (named `ACCENT` in 10+ files) | buttons, active tab, CTA borders, "default"/"preferred" badges, rating stars, map-pin accent | **primary/interactive accent** | `--brand-madre` (`#3D5689`) / `--color-primary` | HIGH — same role `BRAND.primary` already plays in the migrated `AdminLayout.tsx` |
| `#0F3460` (named `BLUE`) | headings, undo/redo controls, secondary tab nav, dark chrome | **secondary/brand-dark** | `--brand-navy` (`#0D2B55`) | HIGH — same role `BRAND.secondary` already plays |
| `#0F3460` *inside `TransformPanel.tsx`'s `BG_COLORS` array* (`{label:"Azul", color:"#0F3460"}`) | one literal, user-selectable canvas background swatch (alongside Blanco/Negro/Gris/Transparente/Naranja) | **content data, not UI chrome** | **KEEP literal** — this is a photo-editor output color choice, not a themed element; tokenizing it would be arbitrary and would silently change what "Azul" produces on the user's exported image | N/A — excluded from migration scope |
| `#1DC878` (named `GREEN`) | save-success state, version badges, "saved" confirmation text | **success state** | `--color-success` (`#2E7D57`) | HIGH — same role, standard success-green family |
| Grey scale (`#E5E7EB`/`#6B7280`/`#9CA3AF`/`#F9FAFB`) | borders, muted/secondary text, disabled states, light surfaces | **neutral/border/muted-text** | `--border` (`#E4E1D8`) / `--mute` (`#8A8678`) / `--gray-50` (`#F6F4EF`) / `--gray-400` | MEDIUM — functionally identical role, but these are generic Tailwind defaults with no ODDY-specific history found; likely just "whatever Tailwind ships" rather than any deliberate palette, same practical fix |
| `#6BB87A` | success-adjacent (hover/lighter variant near GREEN/success contexts) | **success (lighter variant)** | derivable via `color-mix(in srgb, var(--color-success) NN%, white)` per task's own §6, calibrate NN to match | MEDIUM |

#### Evidence
- `git show 446872f:"Resumen contextual — ODDY_Fron.txt"` — dated 28 Apr
  2026, names the product "ODDY_Front2", documents `#0F3460`+`#FF7A00`
  as the literal sidebar/brand colors of that era.
- `src/styles/brand.css` header comment: `"Rebrand: azul madre
  multirrubro · Archivo · Junio 2026"` — one month after the ODDY note,
  confirms current tokens are the *later* palette.
- `src/app/components/brand/Brand.tsx`: `BRAND.primary = "#3D5689"`,
  `BRAND.secondary = "#0D2B55"` — exact matches for `--brand-madre` /
  `--brand-navy`, proving the rebrand's target values, and that
  `AdminLayout.tsx` (which imports `BRAND`) already completed the move.
  `grep` confirms zero `#FF7A00`/`#0F3460` left in `AdminLayout.tsx`
  itself.
- No comments, doc references, or commit messages anywhere in this
  repo's git history (`git log --all`, 5 commits total) name or justify
  ACCENT/BLUE/GREEN as an intentional, separate design language — the
  only surviving context is the ODDY note above.
- The core-3 colors appear in public storefront files
  (`ProductCard.tsx`, `AddressCard.tsx`, map components), not only
  admin — rules out "deliberate admin-only skin" as the explanation.

#### Recommended decision: **OPTION A, with one documented carve-out**
Remove the legacy palette by migrating it to the CORE tokens it
functionally duplicates (`--brand-madre`, `--brand-navy`,
`--color-success`, `--border`/`--mute`/`--gray-*`) — **except** the
literal `BG_COLORS` swatch value in `TransformPanel.tsx`, which is
editor *content*, not UI theme, and must stay a literal hex regardless
of what happens to the rest.

This is **not** being proposed as a redesign-by-preference (which
DEC-007 originally, correctly, refused to do silently). It's proposed
because the evidence shows the rebrand decision was already made and
already executed at the shell level in June 2026 — this is finishing
that migration in the ~23 files it never reached, using the exact
tokens the shell itself already adopted. OPTION B (new admin-specific
tokens) is not recommended: nothing found suggests these colors were
ever meant to persist as their own system, and inventing tokens to
preserve an abandoned brand's palette would itself be the kind of
unjustified token creation AGENTS.md §7 warns against.

#### Proposed token mapping
- `#FF7A00` → `var(--brand-madre)` — *reason:* same interactive/primary
  role `BRAND.primary` already covers.
- `#0F3460` → `var(--brand-navy)` — *reason:* same secondary/dark-chrome
  role `BRAND.secondary` already covers. **Except** the one
  `BG_COLORS` literal in `TransformPanel.tsx` — keep hardcoded.
- `#1DC878` → `var(--color-success)` — *reason:* both are success-green,
  standard semantic role, `--color-success` is the established name for
  it everywhere else in the app.
- `#E5E7EB`/`#F9FAFB` → `var(--border)` / `var(--gray-50)`;
  `#6B7280`/`#9CA3AF` → `var(--mute)` / `var(--gray-400)` — *reason:*
  generic neutral roles, nearest existing neutral tokens.
- `#6BB87A` → `color-mix(in srgb, var(--color-success) ~70%, white)` (or
  nearest calibrated mix) — *reason:* lighter success variant, no exact
  token, `color-mix()` explicitly endorsed by the task brief for this
  case.

#### Migration scope
~23 files for the core-3 colors, ~30 for the grey scale (overlapping),
≈500 total call sites. Roughly the same file list already inventoried
in this decision's original text above.

#### Risk assessment
- **Visual change is real and repo-wide**: every orange accent, navy
  heading, and green success indicator in the ~23 files turns into the
  current blue/navy/green brand equivalents. This is the intended
  effect (finishing the rebrand), not a side effect, but it will be
  visually obvious in a diff/screenshot review and should be reviewed
  as such, not merged silently.
- **The `TransformPanel.tsx` `BG_COLORS` carve-out is easy to miss** in
  a mechanical find/replace — flagged explicitly so Fase 3 doesn't
  regress the photo editor's actual color-swatch feature.
- **`Brand.tsx`'s duplicate `BRAND` object** is a separate, smaller risk
  (second token system) — not blocking this decision, but should be
  cleaned up in the same pass or its own follow-up so a future rebrand
  doesn't have to update two places again.
- Grey-scale mapping is LOWER confidence than the core-3: those hexes
  have no ODDY-era documentation, just structural similarity to
  existing neutral tokens. Recommend treating them as a second,
  separately-reviewable pass rather than bundling with the core-3 move.

### Status
~~PROPOSED, awaiting human approval.~~ **SUPERSEDED by the Status update
below (2026-08-22, Fase 3).**

### Status (2026-08-22, Fase 3 — IMPLEMENTED)
Human approval was given in the Fase 3 task brief itself (its exact
wording matches this decision's proposed token mapping and the
`TransformPanel.tsx` carve-out verbatim). **Option A implemented.**

- All ~499 exact-hex occurrences of the core-3 legacy colors and the
  associated grey scale migrated to the tokens proposed above, across 34
  files. Full substitution counts, file list, and validation results are
  in the 2026-08-22 "Fase 3" entry in `.agent/CHANGELOG.md` — not
  duplicated here.
- The `TransformPanel.tsx` `BG_COLORS` carve-out was honored exactly as
  specified: the two literal swatch values were left untouched; the
  file's `ACCENT`/`BLUE` chrome constants were migrated.
- One **new** exception surfaced during implementation, not anticipated
  in the original proposal: `src/app/components/brand/Brand.tsx`'s
  `Toast` component has one `#6BB87A` (of the grey-scale/success-adjacent
  group) inside an otherwise fully-custom 4-way status-color object.
  Migrating it alone would break that object's internal consistency
  without a decision covering its three sibling values. Left as a
  documented exception — see CHANGELOG — pending its own follow-up
  decision (a `Toast`/status-color token group), not blocking this
  decision's closure.
- A related, non-anticipated finding: the FASE 1 audit's `rgba()/rgb()`
  category also contained `rgba(255,122,0,X)` / `rgba(15,52,96,X)` /
  `rgba(29,200,120,X)` — the same three legacy colors as alpha tints, 36
  occurrences. Migrated via `color-mix()`, per the task brief's own
  guidance for tint variants with no exact token equivalent (same
  reasoning DEC-007 already applied to `#6BB87A`).
- `typecheck` baseline (270 errors) unchanged — zero regressions.
  `vite build` still fails only on the pre-existing, unrelated
  `tw-animate-css` gap (untouched, out of scope, still needs a human
  call per HANDOFF.md).

### Status
**RESOLVED / IMPLEMENTED**, with 2 permanent carve-outs (by design) and 1
new documented exception (`Brand.tsx` Toast, needs its own follow-up
decision). Bucket-1 hardcodes in the other ~30 unrelated files remain
open, tracked separately in TASK.md — not part of DEC-007's scope.

---

## DEC-008 — Post-Fase-3 audit findings: three new hardcode clusters, none touched, all PROPOSED for a future decision

### Date
2026-08-22 (Fase 4 — audit-only, no code modified)

### Context
Fase 4's brief was explicitly audit/validation/closure only ("NO
realizar nuevas migraciones masivas... NO editar src/app"). This entry
records what the full `src/app` re-audit found *beyond* DEC-007's
already-closed scope (the ODDY orange/navy/green/grey palette). None of
this is a regression — DEC-007's own migration is intact and verified
(see the Fase 4 CHANGELOG entry for the full metrics table). These are
new, previously uncatalogued findings, each requiring its own human call
before any code changes.

### Finding 1 — `#FF6835`: a third, undocumented brand-adjacent color
`#FF6835` (a bright orange, distinct from ODDY's `#FF7A00`) appears in
13 files as a primary CTA/accent color: `AdminDashboard.tsx` (stat-card
accent), `FailurePage.tsx`/`SuccessPage.tsx`/`PendingPage.tsx` (checkout
result buttons/links), `ErrorBoundary.tsx` (retry button), `AdminOrders.tsx`,
`AdminProducts.tsx`, `AdminCatalog.tsx`, `DashboardLayout.tsx`,
`DashboardOrdenes.tsx`, `DashboardPage.tsx`, `DashboardPerfil.tsx`,
`OrdenPage.tsx`. No exact token match in `brand.css` (closest is
`--brand-madre` `#3D5689`, a completely different hue — not a
same-role/different-value case like the ODDY trio was). Not part of
DEC-007's inventory (that was scoped to `#FF7A00`/`#0F3460`/`#1DC878`
specifically, sourced from the ODDY note). This looks like it could be
*either* (a) another undocumented legacy identity, or (b) a deliberately
different "checkout/error" accent kept apart from the main brand color on
purpose. No evidence either way was found in git history or comments.
**PROPOSED next step:** same evidence-gathering DEC-007 did for ODDY —
check git blame/first-commit context for `#FF6835`, then decide
new-token vs. migrate-to-brand-madre vs. leave as debt. Not decided here.

### Finding 2 — Tailwind-default semantic colors duplicating existing `--color-*` tokens
`brand.css` already defines `--color-danger` (`#B23B30`), `--color-warning`
(`#C2611F`), `--color-success` (`#2E7D57`), `--color-info` (`#1C6E86`).
Despite that, `src/app` widely uses plain Tailwind-default equivalents
instead: `#EF4444`/`#dc2626`/`#fef2f2` (red, ~13 files, danger role),
`#F59E0B`/`#92400e`/`#fffbeb` (amber, warning role), `#166534`/`#f0fdf4`
(green, success role — a *second* green, different from both
`--color-success` and the already-resolved `#1DC878`), `#3B82F6`/`#06B6D4`/
`#8B5CF6` (blue/cyan/violet, assorted info/tag roles), plus neutral
Tailwind defaults `#374151`/`#F3F4F6`/`#D1D5DB`/`#EAECF0`/`#CBD5E1`/`#FAFAFA`/
`#f1f5f9` (text/border/surface roles already covered by `--text-2`/`--border`/
`--gray-*`). This is structurally the same situation DEC-007 already
solved once (a parallel color system used consistently instead of the
token system) but for *semantic-state* colors rather than brand colors,
spread across a large, not-yet-fully-enumerated set of files. **Not
migrated** — this needs its own semantic-mapping pass (DEC-007's method
applies directly: confirm role, confirm exact-vs-near-match, propose
mapping) rather than being folded into this audit silently.
**PROPOSED next step:** a DEC-007-style semantic audit scoped to
danger/warning/success/info-role hardcodes specifically (distinct from
the brand-color question DEC-007 already closed).

### Finding 3 — `"DM Sans, sans-serif"` as a second, undocumented UI font, parallel to `--font-base`
`brand.css` defines `--font-base: 'Archivo', system-ui, ...`. At least 20
files instead hardcode `fontFamily: "DM Sans, sans-serif"` (or the
no-space variant) as the actual rendered UI font for full-page chrome:
`ErrorBoundary.tsx`, `AdminLayout.tsx` (the admin shell root — the same
file DEC-007 confirmed was otherwise fully migrated to `BRAND`/token
colors), `LoginModal.tsx`, `DashboardLayout.tsx`, the checkout result
pages (`SuccessPage`/`FailurePage`/`PendingPage`), and others. This is a
duplicate-token-system situation for typography specifically: two
different font families are both live as "the" UI font depending on
which file renders, and no comment or commit explains which one is
current. Unlike the ODDY color trio, no first-commit evidence was found
either way in this session — this needs its own investigation, not an
assumption. **Not migrated.** **PROPOSED next step:** determine (via the
same git-history method DEC-007 used) which of `Archivo` / `DM Sans` is
the *current* intended brand font and which is legacy, then migrate the
loser to `var(--font-base)` the same way DEC-007 migrated the ODDY
colors — or, if both are deliberately used for different sections,
document that as an intentional exception instead.

### Also noted, not proposed as a decision (informational only)
- **`Brand.tsx`** (audited per Fase 4 §5, not modified): `BRAND`/`LOGO_BG`
  contain several *exact* token matches (`LOGO_BG.tech` = `--tech`,
  `.home` = `--home`, `.vestimenta` = `--vestimenta`, `.entret` =
  `--entret`, `.servicios` = `--servicios`, `.second`/`.gourmet` =
  `--second`/`--gourmet`; `BRAND.primary`/`.secondary` = `--brand-madre`/
  `--brand-navy`) — this is exactly the same duplicate-JS-token-system
  pattern already flagged during DEC-007's Fase 2 analysis, not a new
  finding, just now itemized. It sits alongside `StatusBadge`/`PriceBadge`/
  `SecondHandBadge`'s near-miss pastel values (`#2A6B4B`, `#9A4B16`,
  `#56544C`, etc. — close to but not identical to any token), which are
  genuine `TOKEN GAP`s, not migratable mechanically. Classified
  **DOCUMENTED EXCEPTION** as a whole file: it is internally coherent
  (badges/toasts share a consistent pastel palette), any color-by-color
  edit risks breaking that coherence, and it duplicates already-correct
  values rather than conflicting with them. No code changed.
- **Border-radius, box-shadow, and spacing hardcodes** are extensive
  (208 non-token radius values, ~40 shadow values with literal `rgba(0,0,0,X)`,
  781 spacing declarations not using `var(--space-*)`) but were **never in
  DEC-007's scope** (color only) and are not treated here as a compliance
  regression — they are pre-existing, uncounted-until-now debt. A few
  exact matches exist (e.g. `14px` border-radius = `--r-card`/`--radius-md`
  exactly, `0 8px 24px rgba(0,0,0,.08)` box-shadow = `--sh-card`/`--shadow-md`
  exactly) and could be mechanically migrated the same way DEC-007's
  bucket 1 was, but that is new scope, not part of this audit's mandate.
- **Tailwind arbitrary-value classes** (`bg-[...]`, `text-[...]`,
  `rounded-[...]`, `shadow-[...]`): **zero found** anywhere in `src/app`.
  The codebase does not use Tailwind utility classes for visual styling at
  all (only 120 `className=` occurrences total, none with arbitrary
  bracket syntax) — everything visual goes through inline `style={{}}` or
  the few `<style>` blocks. This audit category is closed with no
  findings.
- **Local CSS custom properties**: exactly one, `Navbar.tsx`'s
  `['--mk-ph' as any]: skin.color` — a per-render dynamic property fed
  from a data-driven `skin` object (category-specific theming), not a
  hardcode. Legitimate, no action needed.

### Fase 5 (2026-08-22) — deep-evidence pass on each finding's own "PROPOSED next step"
This is the evidence-gathering each finding above already called for, done
before any migration, per the Fase 5 brief ("PHASE 1: ANALYSIS ONLY").
Confirmed first: DEC-007 still IMPLEMENTED, not reopened, ODDY trio not
re-touched. No code modified this session either.

**Finding 1 revised — `#FF6835` is not one thing; it is three, and one of
them changes the read on all of them.**
`AdminOrders.tsx:181-190`'s `SourceBadge` maps order-channel identity to
its *real external brand color*: `oddy:#FF6835`, `mercadopago:#009EE3`,
`paypal:#003087`, `mercadolibre:#FFE600`. That single occurrence is
unambiguous: it is EXTERNAL BRAND DATA, exactly like the MercadoPago blue
and PayPal navy sitting next to it — never tokenize it, same reasoning
DEC-007 already applied to `#6BB87A`.
That literal `"oddy"` label sent us looking wider: `.env`/edge-function
defaults hardcode `APP_URL=https://market.oddy.com.uy` and
`FROM_EMAIL=noreply@market.oddy.com.uy`
(`supabase/functions/create-paypal-order`, `send-email`), and
`docs/legado/` titles the whole product "ODDY Marketplace Builder" /
"ODDY Frontstore Standalone." **"ODDY" is not dead — it is the live
external/production brand name the app still ships under.** This does
**not** reopen DEC-007: `brand.css`'s own header ("Rebrand: azul madre
multirrubro · Archivo · Junio 2026") and `core-storefront.css`'s local
`--accent:#3D5689` (already aligned to `--brand-madre`, not to `#FF6835`
or the old `#FF7A00`) both confirm the *visual* ODDY palette DEC-007
migrated is genuinely superseded. What's newly visible is that the
non-visual "ODDY" identity (domain, emails, channel label) hasn't
rebranded yet, and `#FF6835` sits at the seam between them.
Re-splitting the 24 occurrences with this lens:
- 1 occurrence (`AdminOrders.tsx` `SourceBadge`) — EXTERNAL BRAND DATA.
  Never touch.
- 1 occurrence (`AdminCatalog.tsx:39`, `addDepto`'s insert default) —
  a hardcoded seed value written into a user-editable `departamentos.color`
  DB column, not chrome. USER DATA (default), not a token question.
- 22 occurrences across `ErrorBoundary.tsx`, `AdminOrders.tsx` (chrome,
  not the badge), `AdminCatalog.tsx` (stat card only),
  `AdminDashboard.tsx`, `AdminProducts.tsx`, and 8 of `src/app/public`'s
  checkout/dashboard pages — used consistently as the CTA/header accent
  for **customer-facing** screens (`DashboardLayout`, `DashboardPage`,
  `OrdenPage`, `Success/Failure/PendingPage`) plus a few admin buttons.
  `supabase/functions/send-email/index.ts` uses this exact hex for its
  transactional-email CTA button too — same value, same role, outside
  `src/app` (informational, out of this audit's file scope). No file uses
  `--brand-madre` and `#FF6835` interchangeably for the same role; the
  split is consistently admin-chrome-blue vs. customer-storefront-orange.
  This reads as a **second, deliberate accent color for the public/
  storefront surface**, not stray debt — migrating it to `--brand-madre`
  would visibly recolor every checkout CTA, i.e. a redesign, exactly the
  kind of silent swap DEC-007 already refused to do for the ODDY trio.
  **PROPOSED:** if confirmed, this earns its own token (e.g.
  `--brand-storefront-accent` / `--cta-primary`), not a migration to an
  existing one. Still needs a human product call, not decided here.

**Finding 2 revised — two different problems were merged; only one is
actually "semantic state."**
Re-checked by role, not just hue:
- `red` (`#EF4444`/`#dc2626`/`#fef2f2`, 19 files), `amber`
  (`#F59E0B`/`#92400e`/`#fffbeb`, 9 files), and one `green`
  (`#166534`/`#f0fdf4`, 18 files) are genuinely UI semantic state —
  `ToastProvider.tsx`'s error/warning/success map is the clearest example,
  mirrored ad hoc in `SectionErrorBoundary.tsx`, `AdminArticulos.tsx`,
  `AddressCard.tsx`, `AdminOrders.tsx`'s paid/pending/failed badges. These
  duplicate `--color-danger`/`--color-warning`/`--color-success` **by
  role**, not by value (Tailwind's `#EF4444` ≠ CORE's `#B23B30`, etc.) —
  same same-role-different-value shape DEC-007 resolved for ODDY, so a
  migration here is a recolor, not a mechanical swap.
- `blue`/`violet`/`cyan` (`#3B82F6`/`#8B5CF6`/`#06B6D4`) do **not**
  belong in the semantic-state bucket at all. Traced to
  `TreeNode.tsx`'s `TYPE_STYLE` map and mirrored in `AdminCatalog.tsx`'s
  stat cards: department=blue, category=violet, subcategory=cyan,
  node=amber, product=already-tokenized success-green via `color-mix()`.
  This is a **categorical/qualitative color-coding scheme** for catalog
  hierarchy depth — closer to a data-viz palette than to a danger/warning
  state. No chart library is used anywhere in the repo (`recharts` not in
  `package.json`, zero imports). Conflating this with Finding 2's
  danger/warning/success question would be wrong; it needs its own,
  separate decision (define a categorical token set, or leave as-is —
  there's no existing token to duplicate).
- The neutral-grey set (`#374151`/`#F3F4F6`/`#D1D5DB`/`#EAECF0`/
  `#CBD5E1`/`#FAFAFA`/`#f1f5f9`) duplicates `--text-2`/`--border`/
  `--gray-*` **by role** (borders, muted icons, light surfaces,
  disabled text) but not by exact value — CORE's neutrals are warm/beige
  (`--gray-50:#F6F4EF`), Tailwind's are cool-grey. Same shape again: a
  role match, not a value match.
**PROPOSED next step (revised):** three separate follow-up decisions, not
one — (a) danger/warning/success role-mapping, (b) the catalog
categorical scheme (probably its own token group, not a fix), (c) the
neutral-grey role-mapping. None decided here.

**Finding 3 revised — strong evidence, same shape as the ODDY case DEC-007
already accepted.**
`src/styles/fonts.css:4` sets the actual global default:
`body { font-family: 'Archivo', ... }` — confirming `--font-base` is live
and inherited everywhere by default. `src/styles/core-storefront.css`
(self-labelled in its own header comment: `"ODDY Storefront — oddy.css,
Charlie Marketplace Builder v1.5"` — a legacy file, same vintage as the
already-migrated ODDY color palette) hardcodes `'DM Sans'` in ~20
selectors, plus `'Bebas Neue'` and `'JetBrains Mono'` for its own
headings/labels, none of it touched by DEC-007 (color-only scope). 14
`src/app` files (not 20+; recount this session) additionally hardcode
`fontFamily:"DM Sans, sans-serif"` inline — because inline `style={{}}`
wins the cascade over `body`'s rule, every one of those 14 files renders
DM Sans, not Archivo, for that subtree, regardless of what `--font-base`
says. `brand.css`'s own header — `"Rebrand: azul madre multirrubro ·
Archivo · Junio 2026"` — is direct, in-repo evidence that Archivo is the
*current*, post-rebrand font, exactly the kind of documentation DEC-007
used to call the ODDY palette legacy. **This is the same evidentiary
shape as DEC-007's approved case**, just for typography. **PROPOSED
(strengthened, not decided):** migrate the 14 `src/app` occurrences (and,
separately, `core-storefront.css`'s ~20) to `var(--font-base)`, same
method as DEC-007's Option A. Still requires explicit human sign-off per
this brief — not implemented.

**Brand.tsx — split further per the brief's request, not left as one
blanket exception.**
- `BRAND` (primary/secondary/accent/gourmet) and `LOGO_BG` (tech/home/
  vestimenta/entret/servicios/second/gourmet): **every value is an exact
  match** to an existing token (`--brand-madre`, `--brand-navy`,
  `--color-success`, `--gourmet`, `--tech`, `--home`, `--vestimenta`,
  `--entret`, `--servicios`, `--second`). Pure DESIGN TOKEN DUPLICATION —
  mechanically migratable (`background: bg` → `background:
  "var(--tech)"` etc. — CSS custom properties work fine as JS string
  values). Bucket-1-shaped, low risk. Not done here (still Phase 1).
- `StatusBadge`/`SecondHandBadge`/`Toast`: a genuine **mix**, not
  uniformly "documented exception" as the Fase 4 note implied. Some
  values are exact matches already (`#F0EFEA`=`--canvas`,
  `#56544C`=`--text-2`, `#9B3326`=`--gourmet`, `#F8EEE4`=`--entret-tint`,
  `#EBEFF6`=`--madre-tint` in `Toast`'s `info` row) — DESIGN TOKEN
  DUPLICATION, migratable. Others are genuine near-miss pastels with no
  token (`#2A6B4B`, `#9A4B16`, `#6BB87A`, `#D98A80`, `#E0B48A`,
  `#2E4372`, `#9DB0D0`) — real TOKEN GAP, component-specific state,
  correctly left alone pending a small badge/toast token-group decision
  (as already flagged). Both `StatusBadge` and `Toast` are live (used in
  `ProductCard.tsx`, `ToastProvider.tsx`, `AdminML.tsx`,
  `AdminProducts.tsx`) — not dead code, any change needs care.

**Radius/shadow/spacing — same audit, now with exact-match tables (still
Phase 1, no tokens created, nothing migrated):**
- Radius: 195 px-literal + ~150 bare-number declarations. Exact token
  matches: `7px`/`7` → `--r-input`/`--radius-sm` (32 combined
  occurrences), `9` (bare) → `--r-control` (8), `14px` → `--r-card`/
  `--radius-md` (7), `16px` → `--radius-xl` (6). Everything else — `8px`
  (91, the single largest cluster), `6px` (69), `10px`/`12px` (~39 each),
  `20px` (21), `5px` (25), `4px` (11), `2px` (4) — has **no token at
  all**; this is the real radius debt, not the exact-match set. `999`
  (bare, 6×) is a near-match to `--radius-pill` (100px); functionally
  identical for typical pill/badge heights, worth a naming decision, not
  urgent.
- Shadow: 41 declarations. Exact matches: `0 1px 3px rgba(0,0,0,.05)` →
  `--sh-subtle`/`--shadow-sm` (6 combined, counting the `0.05`/`.05`
  formatting variants), `0 8px 24px rgba(0,0,0,.08)` → `--sh-card`/
  `--shadow-md`/`--shadow-card` (1). The rest are one-off or near-miss
  values (`0 4px 16px rgba(0,0,0,.1)` ×6, `0 1px 4px rgba(0,0,0,.06)` ×5,
  etc.) — no token, genuine debt, mostly single-use.
- Spacing: 268 px-literal `padding`/`margin`/`gap` declarations plus a
  much larger population of rem-string shorthand (`"1rem"`, `"0.75rem"`,
  `"0.5rem 1rem"`, etc. — the actually-dominant idiom in this codebase,
  not px). Exact `--space-*` matches in the px population: `4px`→
  `--space-1` (60), `8px`→`--space-2` (23), `12px`→`--space-3` (6),
  `16px`/`32px`→`--space-4`/`--space-6` (2 each). The larger clusters —
  `2px` (57), `10px` (34), `3px` (21), `6px` (18), `5px` (17), `1px`
  (16) — have no token. The rem-shorthand population is a separate
  problem: `--space-*` tokens are defined in raw px and referenced via
  `var()`, but almost all spacing in `src/app` is written as literal rem
  strings in inline `style={{}}` objects — even where the rem value maps
  cleanly onto the 8px scale (`0.5rem`=8px, `1rem`=16px, `1.5rem`=24px),
  there is no `var()`-based path to it today; migrating would mean
  picking a unit convention, not just substituting a value. Positional
  `top`/`right`/`bottom`/`left` px values (11 found) were kept separate,
  as instructed — these read as layout/coordinate values, not spacing
  scale candidates, and are excluded from the debt count above.

### Status
**Still PROPOSED.** This Fase 5 pass deepened the evidence for all three
original findings (per-occurrence classification instead of aggregate
counts) and added exact-match inventories for radius/shadow/spacing, but
made **no new decision** and touched **no code**. Findings 1–3 each now
have a clearer, evidence-backed direction (see above) but every one still
needs an explicit human call before migration — none of this session's
findings should be read as pre-approval. Does not block DEC-007's closure
or the repo's `TOKEN COMPLIANT WITH EXCEPTIONS` status.

---

## DEC-009 — `api_vault.client_exposed`: flag genérico para credenciales legibles desde el browser

### Fecha
2026-08-22

### Decisión
Se agrega una columna `client_exposed boolean default false` a
`api_vault`, con una policy RLS **aditiva** que permite `SELECT` a
cualquier cliente (autenticado o anónimo) sobre filas marcadas así. No se
implementa como una whitelist de nombres de plataforma en código
(`if platform === 'Mapbox'`): la responsabilidad de qué es seguro exponer
la tiene quien carga la credencial, reforzada por la UI (el toggle en
`ApiVaultPage.tsx` solo se ofrece cuando `type === 'token'`, nunca para
`api_key/secret/oauth/webhook/connection/jwt/cert`).

Se agrega un helper único, `getClientCredential(supabase, platform,
{tenantId?})`, consumido por los 3 lugares que hoy necesitan un token de
Mapbox en el browser (`AddressMap.tsx`, `AddressAutocomplete.tsx`,
`AdminProfile.tsx`), con fallback a `VITE_MAPBOX_TOKEN` si el vault no
tiene nada — dev local sigue andando sin depender de que el vault esté
poblado.

### Reason / motivación
El síntoma original (`AddressMap.tsx` sin token en local) evidenció que
`api_vault` ya tenía pensado un concepto de "credencial global" (columna
`tenant_id`, comentada en el schema real de PROD como "NULL = credencial
global (fallback)", con índice único `api_vault_platform_global_uidx`),
pero el RLS nunca se actualizó para permitir leerla fuera del dueño que
la cargó. El pedido explícito fue resolverlo sin nombres propios en el
diseño — que sirva para Mapbox, Supabase, o cualquier servicio futuro sin
tocar código de nuevo.

### Impact
- Migración nueva: `supabase/migrations/20260822001700_api_vault_client_exposed.sql`.
  Aplicada manualmente por el usuario en Supabase (fuera del control del
  agente) antes de escribirse este archivo — queda versionada/replayable
  para el resto del equipo/CI.
- La policy es aditiva (Postgres combina múltiples policies del mismo
  comando con OR) — no debilita ni reemplaza `"api_vault: usuario lee los
  suyos"`.
- Cualquier fila marcada `client_exposed=true` es pública para cualquier
  visitante del sitio. Nunca usar con secrets server-side (Stripe,
  MercadoPago, OAuth de ML, webhooks firmados, etc.) — ninguna fila
  existente de esas plataformas fue tocada ni marcada así en esta sesión.
- 8 archivos modificados/creados (ver CHANGELOG.md 2026-08-22 para el
  detalle completo). `tsc --noEmit` sin errores nuevos.

### Status
ACTIVE — implementado y verificado (`tsc`), pero la migración fue
aplicada por el usuario, no por el agente; si el CLI local de Supabase no
la reconoce como aplicada, correr `supabase migration repair`.

---

## DEC-010 — API Vault como Credential Provider central (dirección arquitectónica APROBADA AHORA; implementación PENDIENTE)

### Fecha
2026-08-22

### Estado
**PROPOSED / APPROVED NOW — NO IMPLEMENTADO.** Esta entrada registra una
dirección arquitectónica aprobada por el humano en esta sesión de
documentación. No representa un audit ya realizado en una sesión previa:
no existe en este repositorio (ni en este archivo, ni en HANDOFF.md, ni
en CHANGELOG.md, ni en el código bajo `src/lib/core-apivault/`) evidencia
de un audit anterior de API Vault como Credential Provider genérico, de
un audit de integración META, ni de un bug identificado en `ml-webhook`.
El único trabajo de API Vault efectivamente documentado y verificado
antes de esta entrada es **DEC-009** (columna `client_exposed` para
credenciales legibles desde el browser, ver arriba) — DEC-009 no se
reescribe ni se reinterpreta acá; sigue significando exactamente lo que
ya decía.

### Decisión
Se aprueba, como dirección para la próxima fase de implementación, que
**API Vault sea el Credential Provider central** del sistema:

- Los módulos consumidores solicitan credenciales a API Vault en lugar de
  resolver, almacenar, refrescar o administrar credenciales de proveedor
  por su cuenta.
- Ciclo de vida genérico previsto:
  `REQUEST → RESOLVE → ACQUIRE / REFRESH (cuando aplique) → STORE → DELIVER → CONSUMER USE → REPORT → HEALTH UPDATE`.
- No se crean gestores de credenciales independientes por módulo, ni un
  vault paralelo por integración, ni se duplica la lógica de resolución.
- META (cuando se implemente) es un consumidor downstream de este
  contrato — no debe implementar su propia arquitectura de gestión de
  credenciales, y su implementación no debe comenzar antes de que este
  trabajo esté resuelto.

### Alcance de la próxima implementación (PENDIENTE — nada de esto está hecho)
- `RESOLVE` genérico.
- Identificación de la credencial vía `api_vault.id`.
- Resolución tenant → global.
- `DELIVER` genérico.
- `REPORT` genérico.
- Persistencia de health/status de la credencial (incluyendo
  `last_checked_at`, `last_error`).
- Capacidad de lifecycle/refresh donde aplique.
- Reemplazo de los mecanismos de resolución de credenciales duplicados
  existentes.
- Corrección de un bug reportado en `ml-webhook` (uso de una columna
  `provider` en lugar de `platform`). **Nota de verificación:** el
  archivo `ml-webhook` no está incluido en el zip/snapshot con el que se
  trabajó en esta sesión de documentación — no pudo leerse ni
  confirmarse el bug por inspección directa. Este ítem se registra tal
  como fue reportado por el humano; el próximo agente debe **confirmarlo
  leyendo el archivo real** antes de tocarlo, no asumirlo de esta
  entrada.

### Explícitamente fuera de esta sesión (documentación únicamente)
No se implementó nada de lo anterior. No se tocó código de producción,
no se crearon migraciones, no se modificaron secrets, no se tocaron
integraciones de proveedores existentes, no se creó un segundo vault, no
se comenzó META.

### Reason / motivación
El humano definió esta dirección explícitamente en esta sesión de
documentación, como el siguiente paso arquitectónico una vez cerrado
DEC-009. Se registra como decisión nueva, separada de DEC-009, para no
alterar el significado de una decisión ya tomada y verificada.

### Impact
Define el objetivo de la próxima fase de implementación (ver TASK.md /
HANDOFF.md, si existen en el repo completo — no incluidos en este
snapshot). No cambia nada del estado actual del código o la base de
datos.

### Status
PROPOSED / APPROVED — implementación pendiente. Próximo agente debe
comenzar por `RESOLVE` genérico, según el alcance de arriba, y verificar
por lectura directa cualquier ítem (en particular el bug de
`ml-webhook`) antes de asumirlo como cierto.

---

## DEC-011 — API Vault Credential Provider: diseño world-class completo (DESIGNED / APPROVED — IMPLEMENTACIÓN PENDIENTE)

### Fecha
2026-08-22

### Estado
**DESIGNED.** Sesión de diseño puro — sin código, sin migraciones, sin
schema, sin secrets. Full write-up en
`.agent/DEC-011-api-vault-credential-provider-design.md` (30 secciones:
arquitectura, contratos RESOLVE/DELIVER/REPORT, modelo de health y
lifecycle, resolución tenant/global, modelo de seguridad y exposición de
secrets, taxonomía de errores, concurrencia, auditabilidad,
observabilidad, deployment, admin UX, estrategia de migración de ML,
compatibilidad con Mapbox, consumo futuro de META y de un módulo genérico
de importación web, cambios de DB/código requeridos, estrategia de
migración/rollback/testing, y criterios de aceptación).

### Decisión
Se aprueba el diseño como dirección de implementación para DEC-010. No se
reescribe ni se reemplaza DEC-010 (que ya registraba la aprobación de la
dirección general); DEC-011 es el diseño detallado e implementable que
DEC-010 pedía como siguiente paso.

### Reason / motivación — nota crítica de evidencia
El brief de esta sesión pedía leer, entre otros, `MLVaultService`,
`TokenManager`, `OAuthService`, `ml-oauth`, `ml-webhook`,
`extract-catalog` y `apiVaultService.ts`. **Ninguno de esos archivos está
presente en el snapshot/zip con el que se trabajó esta sesión** — se
verificó con una búsqueda exhaustiva del árbol de archivos disponible.
Por lo tanto, todo lo que el diseño dice sobre el comportamiento actual
de ML es contexto reportado (vía DECISIONS.md/CHANGELOG.md previos), no
evidencia leída directamente esta sesión — el documento lo marca
explícitamente en su sección 0 y en la sección 20 (estrategia de
migración de ML, marcada LOW CONFIDENCE). Lo que sí se leyó y verificó
directamente: la migración `20260822001700_api_vault_client_exposed.sql`,
`apiVaultTypes.ts`, `getClientCredential.ts`, `index.ts`, partes de
`ApiVaultPage.tsx`, y los 3 consumidores de Mapbox. El diseño del
contrato genérico (RESOLVE/DELIVER/REPORT/HEALTH/LIFECYCLE) es
independiente de los detalles de ML — es implementable sin ellos —, pero
la migración concreta de ML hacia ese contrato NO debe iniciarse sin que
el próximo agente lea esos archivos primero.

### Impact
Ningún archivo de `src/`, `supabase/migrations/`, `package.json` o
secrets fue tocado. Los únicos archivos modificados son de documentación:
este archivo, el nuevo
`.agent/DEC-011-api-vault-credential-provider-design.md`,
`.agent/HANDOFF.md` y `.agent/CHANGELOG.md`.

### Status
DESIGNED / APPROVED — PENDING IMPLEMENTATION. El documento de diseño
completo es la fuente de verdad para la implementación; esta entrada es
solo el puntero y el resumen de contexto/evidencia.
