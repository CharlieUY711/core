# CORE-Market — Current State

## Project
CORE-Market

## Repository
`C:\CORE\apps\core-market` — **canonical** (DEC-002).
`C:\Charlie\apps\market` is a frozen 2026-07-02 fossil. Do not edit it.

## Contrato y Source of Truth (Fase 1.5 — congelado 2026-08-22)
- **Source of Truth comercial:** `catalog_*`. No crear modelos paralelos de
  producto, listings, precios, stock ni sincronizacion.
- **Legacy/Compatibility:** `articulos` (la leen carritoApi, AdminExport,
  AdminImport y AdminMisPublicaciones) y las 13 `zz_deprecated_*`. No se borran.
- **Contrato de modulo:** C1-C9 del CVE. core-market esta **fuera del ambito de
  evaluacion** (excepcion E-1), no incumple.
- **F-1 CERRADO** (2026-08-22): `is_admin()` lee `profiles.role`, columna
  server-side protegida por `trg_profiles_protect_role`. Nadie puede
  promoverse a si mismo. Antes leia `raw_user_meta_data`, escribible por el
  propio usuario.
- **F-2 CERRADO**: el DDL real esta versionado en `supabase/schema/`. Queda
  pendiente, como higiene y no como bloqueo, la cadena de migraciones
  replayable.
- Deuda abierta: las funciones `admin_*` conservan `authenticated`. Ahora el
  guarda interno `is_admin()` si es confiable, asi que el riesgo bajo mucho,
  pero conviene revocarlas igual.
- Detalle completo en `.agent/AUDIT_PUBLICACIONES.md`, seccion FASE 1.5.

## Current Phase
DESIGN-TOKEN ENFORCEMENT — **DEC-007 IMPLEMENTED (Fase 3), AUDITED CLOSED
(Fase 4), and DEC-008 given a deep-evidence pass (Fase 5, 2026-08-22,
analysis-only, no code touched).** Final compliance status unchanged:
**TOKEN COMPLIANT WITH EXCEPTIONS.** DEC-008 (still **PROPOSED**, not
implemented) now has per-occurrence evidence, not just aggregate counts,
for its 3 findings: (1) `#FF6835` — split into external-brand data (1
occurrence, never touch), a DB-row default (1), and 22 consistent
customer-facing CTA/accent occurrences that look like a deliberate
second, storefront-specific accent color (new context: the app still
ships under the live "ODDY" production domain/emails — does not reopen
DEC-007, whose migrated *visual* palette is independently confirmed
superseded); (2) Tailwind-default colors — split into genuine
danger/warning/success role-duplication vs. an unrelated categorical
blue/violet/cyan catalog-depth color scheme vs. neutral-grey role
duplication — three separate decisions, not one; (3) `"DM Sans"` (14
files, recounted) vs. `--font-base` (`'Archivo'`) — strong new evidence
(global `body` rule in `fonts.css`, `brand.css`'s own rebrand-date
header, `core-storefront.css` self-labelled as legacy "ODDY Storefront")
makes this the same evidentiary shape DEC-007 already accepted. Also this
session: `Brand.tsx` split into exact-match (mechanically migratable)
vs. genuine token-gap pastels; radius/shadow/spacing given exact-match
inventories against `--r-*`/`--sh-*`/`--space-*`. None of this is
implemented — every item still needs a human decision. Full report:
`DEC-008-informe-final.md`. The bucket-1 backlog (~30 unrelated files
with exact-token-match hardcodes never touched by DEC-007) is still
open, independent of all of the above. Architecture map unchanged this
session — still per CORRECTIONS C1–C5 in ARCHITECTURE.md.

## Current Objective
DEC-007 is closed and audited. Full detail (file list, substitution counts,
exceptions, validation) is in the 2026-08-22 "Fase 3" CHANGELOG entry
and DEC-007's updated Status section in DECISIONS.md — do not re-derive
it. Next agent's options:
1. Bucket-1 mechanical pass on the remaining ~30 files (same method:
   grep hex → match against brand.css/theme.css → substitute exact
   matches only → `tsc --noEmit` to confirm zero new errors).
2. Follow-up decision on `Brand.tsx`'s `Toast` status-color object (one
   `#6BB87A` left as an exception — needs its own token-group decision,
   not a silent swap).
3. `Brand.tsx`'s duplicate `BRAND` JS object (hardcodes brand hex instead
   of consuming CSS vars) — flagged, unresolved, its own cleanup ticket.
4. **New (Fase 4): resolve DEC-008's three findings** — each needs its own
   evidence-gathering pass (same method DEC-007 used) before any
   migration: `#FF6835`'s origin/intent, the Tailwind-default
   semantic-color duplication, and which font (`Archivo` vs `DM Sans`) is
   actually current.
The `/admin` privilege-escalation item (DEC-006) is still blocked on
database access and is independent of this task.

## Current Status
`npx tsc --noEmit` → **270 errors / ~44 files** (was 279 — normal
drift), **zero new errors** in any of the 34 files touched in the
2026-08-22 Fase 3 session (same baseline before/after). `npx vite build`
now **fails** — not from token changes, but because `theme.css` imports
`tw-animate-css`, which was never added to `package.json`/lockfile (0
hits in both). This is a pre-existing latent bug, only surfaced because
this session did a clean `rm -rf node_modules && npm install` (the
previous partial `node_modules` apparently had it cached from
somewhere outside this repo's tracked dependency graph). Not fixed here:
package.json edits are restricted to the `agent:*` scripts block per
AGENTS.md §7. Someone needs to `npm install tw-animate-css --save` (or
remove the import if it's dead) before `agent:verify`'s build step will
pass again.

39 files were deleted in the 2026-08-21 session (DEC-005): the Etiqueta
Emotiva feature, the `ventas`/`documentos` island plus `app/events/`, the
orphaned `src/dashboard/` tree, the unparseable `CoreStorefront.tsx`, and
their debris. Nothing deleted had a live caller; everything is
recoverable via `git show ee92871:<path>`.

## The build is currently red
`npx vite build` fails on `Can't resolve 'tw-animate-css'`
(`src/styles/theme.css`). Pre-existing, unrelated to token work, not
fixed (out of this layer's scope — see above). Fix before trusting
`agent:verify`'s build result.

## The one thing that matters right now
**`/admin` is privilege escalation, not a weak guard.** `isAdmin` comes
from `user_metadata`, which the user can write themselves — and this repo
already makes that exact `supabase.auth.updateUser({ data: ... })` call
from the browser in two places. `useAdminOrders` then uses the same flag
to decide whether to scope its query by `user_id`. Full chain, diagnosis
query, and remediation path: **DEC-006**. Not fixable in client code;
needs DB access.

## Last Completed Work
- DEC-002 canonical repo; DEC-003 `typecheck:full` as a staged
  (non-gating) script; DEC-004 `Sidebar.tsx` repair.
- DEC-005: the 39 deletions, each justified by evidence recorded there.
- DEC-006: why the `/admin` guard was deliberately *not* patched.
- Fixed a real bug in `scripts/agent-handoff.js` (`git()` trims stdout, so
  the first `--porcelain` line lost its leading space and `slice(3)` ate a
  character of the first path).

## Files Recently Modified
Modified: `src/app/routes.tsx` (one import + one route removed),
`package.json`, `scripts/agent-handoff.js`, and all of `.agent/*`.
Deleted: 39 files — inventory in DEC-005.
**Nothing is committed.** The working tree holds everything.

## Known Problems
- `/admin` privilege escalation (DEC-006). Highest priority.
- `typecheck:full` is not a gate — 279 errors. Promotion criteria in
  DEC-003. Cheapest wins left: 95 TS6133/TS6196 unused locals, then
  TS2339 (84) and TS18047 (28).
- `MapView.tsx` uses the `google` global with no `@types/google.maps`
  (C5); `CoreGlobe.tsx` needs `topojson-specification` types. Both are
  dependency changes, deliberately not made here.
- Still no `lint` and no `test` tooling.
- A **second** orphaned dashboard survives at `src/app/public/Dashboard*.tsx`
  + `MisPublicacionesPage.tsx`, unreachable because `/dashboard` redirects
  to `/admin`. Left deliberately — see DEC-005 "Deliberately NOT deleted".
- `src/lib/tool-editor/` still holds `.bak`/`.bak2`/`.bak3` files.

## Open Questions
- RESOLVED: the duplicate `useUserRole` (one was in the deleted tree), the
  `/admin` guard mechanism, and the `carritoApi`/`CoreStorefront`
  duplication — all closed by DEC-005/006 or by deletion.
- STILL OPEN: is the `public/Dashboard*` cluster parked work or dead?
- STILL OPEN: are `depositosApi` / `entregasApi` / `inventarioApi` the
  logistics layer waiting to be wired, or abandoned?
- STILL OPEN: only one migration file is tracked
  (`20260607_api_vault.sql`) — the rest of the schema is not in this repo,
  which is exactly why the DEC-006 RLS question cannot be answered here.

## Risks
- **The marketplace has no fulfillment layer.** It can take payment but
  has no shipping state and no document generation. That was already true
  — the island never ran — but it is now visible rather than hidden. Build
  it on `ordenes.estado`; do not reintroduce a second order model.
- Two payment providers (MercadoPago + PayPal), each with its own Edge
  Function pair — any checkout change must consider both.
- MercadoLibre has its own token/vault (`core-mlmp`), separate from the
  frontend's `core-apivault`. Do not conflate them.
- Mapbox token location still not inspected. Never paste secrets into
  `.agent/*.md`.

## Next Recommended Action
1. Run the `pg_tables.rowsecurity` query from DEC-006. Everything about
   the severity of the `/admin` hole depends on the answer.
2. Move the role out of `user_metadata` per DEC-006, using the
   `api_vault` migration as the in-repo RLS precedent.
3. Decide the fate of the `public/Dashboard*` cluster and the three
   logistics services.
4. Burn down `typecheck:full` toward the DEC-003 promotion criteria.

## Last Agent
Session that made DEC-002 through DEC-006: settled the canonical repo,
wired TypeScript, then acted on the resulting findings — 39 files deleted
with evidence, one security item escalated and deliberately left for a
human with DB access. Nothing committed.

## Last Agent (Fase 5, DEC-008 deep-evidence pass)
2026-08-22 session: analysis-only, no code changed, DEC-007 not reopened.
Deepened DEC-008's 3 findings from aggregate counts to per-occurrence
evidence (see DECISIONS.md "Fase 5" subsection and CHANGELOG). Key new
fact: the app still ships under the live "ODDY" production domain/emails
— relevant to the `#FF6835` question, does not reopen or contradict
DEC-007. Added radius/shadow/spacing exact-match inventories and split
`Brand.tsx` into duplication-vs-genuine-gap. DEC-008 stays PROPOSED; no
implementation. Full write-up: `DEC-008-informe-final.md`.

## Last Agent (Fase 4, final audit)
2026-08-22 session: audit-only, no code changed. Re-confirmed DEC-007's
Fase 3 migration is intact (0 undocumented residue of the ODDY trio, all
3 documented exceptions/carve-outs verified unchanged). Ran a full
`src/app` re-audit (hex, rgba, style={{, <style>, local CSS vars,
Tailwind arbitrary classes, border-radius, box-shadow, spacing, font-
family). Surfaced 3 new findings, none touched, recorded as DEC-008
(PROPOSED): `#FF6835` (13 files), Tailwind-default semantic colors
duplicating `--color-*` tokens (widespread), `"DM Sans"` vs
`--font-base` (20+ files). `tsc --noEmit` → 270 errors, unchanged, zero
regression. `vite build` → still fails only on the pre-existing
`tw-animate-css` gap. Final status: **TOKEN COMPLIANT WITH EXCEPTIONS**.
Full detail: 2026-08-22 "Fase 4" CHANGELOG entry, DEC-008 in
DECISIONS.md.

## Last Agent (Fase 3, DEC-007 implementation)
2026-08-22 session: implemented DEC-007's approved Option A. Migrated
499 hex + 36 rgba() legacy-palette occurrences across 34 files to
existing tokens (`--brand-madre`, `--brand-navy`, `--color-success`,
`--border`, `--gray-50`, `--mute`, `--gray-400`, plus `color-mix()`
derivations for alpha/tint variants). Honored the `TransformPanel.tsx`
`BG_COLORS` carve-out. Found and documented one new exception
(`Brand.tsx` Toast `#6BB87A`). Zero new `tsc` errors. Build still red on
the pre-existing, unrelated `tw-animate-css` gap. Nothing committed (no
`.git` present in this working copy — it was extracted from a zip).
Full detail: 2026-08-22 CHANGELOG entry, DEC-007 in DECISIONS.md.

## Last Updated
2026-08-22
