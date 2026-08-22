# Active Task

## Objective
**Design-token enforcement** (started 2026-08-22, IN PROGRESS). Migrate
hardcoded visual CSS in `src/app` onto `src/styles/brand.css` /
`src/styles/theme.css` tokens. Full brief and audit results: DEC-007 in
DECISIONS.md and the 2026-08-22 entry in CHANGELOG.md.

### Done
- Full-repo audit: 1,651 hardcoded hex colors / 198 rgba() calls / 5
  inline `<style>` / ~50 files with `style={{`.
- `AdjustPanel.tsx`, `Navbar.tsx`, `AdminCargaMasiva.tsx` migrated for
  every value with an exact token match. Verified via `tsc --noEmit`
  (zero new errors).

### Fase 4 — AUDIT CLOSED 2026-08-22 (no code changed)
Final compliance check on DEC-007's Fase 3 work: 0 undocumented residue,
all exceptions verified intact, `tsc`/`build` unchanged. **Final status:
TOKEN COMPLIANT WITH EXCEPTIONS.** Surfaced DEC-008 (PROPOSED, 3 new
findings, none migrated — see DECISIONS.md and the Fase 4 CHANGELOG
entry): `#FF6835` (undocumented accent, 13 files), Tailwind-default
semantic colors duplicating `--color-danger/warning/success/info`, and
`"DM Sans"` vs `--font-base` as a duplicate font-family system.

### DEC-007 — RESOLVED 2026-08-22 (Fase 3)
Human approval received in the Fase 3 task brief; implemented Option A.
499 hex + 36 rgba occurrences across 34 files migrated to existing
tokens. 2 permanent carve-outs (`TransformPanel.tsx` `BG_COLORS`
literals) + 1 new exception needing its own follow-up decision
(`Brand.tsx` Toast `#6BB87A`, see DECISIONS.md). Full detail: 2026-08-22
CHANGELOG entry.

### Still open — independent of DEC-007
The remaining ~30 files (never used the ODDY palette, so untouched by
Fase 3) still contain bucket-1-style hardcodes (values that already have
an exact token match, same pattern as `AdjustPanel.tsx`/`Navbar.tsx`/
`AdminCargaMasiva.tsx` done earlier). Those can be migrated file-by-file
right now using the same method: grep hex → check against
brand.css/theme.css → substitute only exact matches → `tsc --noEmit` to
confirm no regression.

### New, smaller follow-ups surfaced by Fase 3
1. `Brand.tsx`'s `Toast` component: one `#6BB87A` left unmigrated because
   its 3 sibling values (error/warn/info rows) have no token match either
   — needs a decision on whether to define a small `Toast`/status-color
   token group, not a one-off swap.
2. `Brand.tsx`'s `BRAND` object still duplicates brand.css's hex values
   in JS instead of consuming the CSS custom properties (flagged by
   DEC-007's Fase 2 analysis, still unresolved).

### Fase 5 — DEC-008 deep-evidence pass, 2026-08-22 (analysis-only, none implemented)
Deepened all 3 DEC-008 findings from aggregate counts to per-occurrence
evidence; added exact-match inventories for radius/shadow/spacing; split
`Brand.tsx`. DEC-008 stays PROPOSED. Full detail: DECISIONS.md ("Fase 5"
under DEC-008), CHANGELOG.md, and `DEC-008-informe-final.md`. Headline
changes vs. the Fase 4 summary below: `#FF6835` is 3 different things,
not 1 (external-brand data / DB default / likely-deliberate storefront
accent — new context: the app still ships under the live "ODDY"
production domain, does not reopen DEC-007); Tailwind semantic colors are
3 separate decisions, not 1 (danger/warning/success vs. an unrelated
categorical catalog-depth scheme vs. neutral greys); DM Sans evidence is
now strong enough to be "same shape as the already-accepted ODDY case."

### New findings from Fase 4 (DEC-008, PROPOSED — none implemented; see
Fase 5 above for the deepened version of the same 3 findings)
3. `#FF6835` — an undocumented accent color in 13 files (checkout result
   pages, dashboard stat cards, error boundaries). Needs the same kind of
   evidence-gathering DEC-007 did for the ODDY trio before any decision.
4. Tailwind-default semantic colors (`#EF4444`/`#dc2626`/red family,
   `#F59E0B`/amber family, `#166534`/`#f0fdf4`/green family,
   `#3B82F6`/`#06B6D4`/`#8B5CF6`/blue-cyan-violet family, plus neutral
   greys) duplicate existing `--color-danger/warning/success/info` and
   `--text-2`/`--border`/`--gray-*` tokens across a large, not-yet-fully-
   enumerated file set. Needs its own DEC-007-style semantic mapping pass.
5. `"DM Sans, sans-serif"` used as the actual UI font in 20+ files
   (including `AdminLayout.tsx`'s root, `ErrorBoundary.tsx`, checkout
   result pages), parallel to and undocumented against `--font-base`
   (`'Archivo'`). Needs a decision on which font is current before either
   gets migrated to the other.
6. (Lower priority, not urgent) Border-radius (208 non-token values),
   box-shadow (~40 with literal `rgba(0,0,0,X)`), and spacing (781
   non-token declarations) hardcodes — never in DEC-007's scope, now
   counted for the first time. A few are exact token matches and could be
   mechanically migrated the same way DEC-007's bucket 1 was, if/when this
   scope is picked up.

### Known unrelated blocker
`npx vite build` fails: `theme.css` imports `tw-animate-css`, not in
`package.json`/lockfile. Pre-existing, not caused by token work, not
fixed here (package.json changes outside `agent:*` scripts are out of
this layer's scope per AGENTS.md §7).

---

## Previous task (CLOSED)
The delegated decision task below is CLOSED. Before picking up
product/feature work unrelated to tokens, someone still needs to make
the four calls listed under "Blocked on a human decision" (unchanged,
independent of the token work above).

## Completed Tasks

### 1. Architecture confirmation pass — CLOSED
See CHANGELOG 2026-08-21. Note: partially superseded — see the
CORRECTIONS section of `.agent/ARCHITECTURE.md`.

### 2. Remove dead `AdminAnalytics` import (DEC-001) — CLOSED 2026-08-21
See CHANGELOG 2026-08-21.

### 3. Two delegated decisions — CLOSED 2026-08-22
**Scope:** the human said "confío en tu criterio para las dos cosas,"
delegating (a) which core-market copy is canonical and (b) what to do
about the missing lint/test/typecheck tooling.

**Outcome:**
- (a) → DEC-002. `C:\CORE\apps\core-market` is canonical, on git
  evidence: own repo, HEAD today, clean tree, cleanup landed. The
  Charlie copy traces entirely to one 2026-07-02 commit and no active
  build depends on it.
- (b) → DEC-003. `typecheck:full` added as a reporting script, not a
  gate, because the measured backlog (374 errors / 64 files) would have
  made a gate red on day one. Promotion criteria recorded.
- Side effects, both documented: DEC-004 (repaired `Sidebar.tsx`;
  recommended deleting `CoreStorefront.tsx`) and a real bug fix in
  `scripts/agent-handoff.js`.

**Acceptance criteria — all met:**
- [x] Both decisions made with evidence, not preference.
- [x] Recorded as sticky DECISIONS entries per AGENTS.md §4.
- [x] `agent:verify` → PASS after the changes.
- [x] ARCHITECTURE.md corrected where `tsc` contradicted it.
- [x] Nothing committed; working tree left for human review.

## Blocked on a human decision (not started)
1. **Delete `src/app/public/CoreStorefront.tsx`?** DEC-004 item 2.
   Recommended. Until it goes, `typecheck:full` masks ~367 errors.
   Recovery if regretted:
   `git show 446872f:src/app/public/CoreStorefront.tsx > <path>`
2. **`/admin` role policy.** The guard checks only for a session, never
   for `isAdmin` (ARCHITECTURE C3). Needs an intended-behavior call:
   redirect, 403 view, or per-route granularity.
3. **What should `API` be in `MensajePage.tsx`?** (ARCHITECTURE C4) The
   `/m/:token` route throws until this is answered. Which Edge Function
   or external service serves `/etiquetas/...`?
4. **Resurrect or delete the ventas/documentos island?**
   (ARCHITECTURE C1) Both are defensible; ambiguity is not.

## Out of Scope (task 3)
- Any change to framework, database, Supabase config, design system,
  branding, APIs, or business logic.
- Fixing the four findings above — surfacing and documenting them was in
  scope; changing behavior was not.
- Deleting source files (blocked, and a product call regardless).

## Relevant Files
- .agent/DECISIONS.md (DEC-002, DEC-003, DEC-004)
- .agent/ARCHITECTURE.md (CORRECTIONS C1–C5)
- .agent/CURRENT.md
- package.json, scripts/agent-handoff.js
- src/dashboard/layout/Sidebar.tsx
- src/app/public/CoreStorefront.tsx (pending deletion)

## Status
- [x] Analysis
- [x] Implementation
- [x] Verification (`agent:verify` → PASS)
- [x] Handoff

## Pendiente — Configuración de impuestos (planteado 2026-08-22)

Requisito del dueño: la configuración fiscal debe ser **fácil, accesible y
visible**. Debe permitir elegir si los precios se muestran con impuestos
incluidos o sin ellos, y soportar **distintas tasas**.

Estado actual, verificado:
- El IVA está quemado en un único lugar: `packages/core-commerce/src/CarritoModule.tsx:968`
  → `const iva = subtotal * 0.22`.
- **Incoherencia ya presente:** la línea 1219 muestra "IVA (22 %)" *sumándolo*
  al subtotal, mientras la 1364 dice "IVA incluido". La UI afirma ambas cosas.
- **La base no tiene ninguna estructura fiscal**: cero tablas, cero columnas de
  impuesto. `catalog_prices` guarda `amount` y `currency` sin campo fiscal.

Consecuencia de diseño: decidir si el impuesto es atributo del precio
(`catalog_prices`), del artículo, de la tienda, o del territorio — existen
`countries` y `territories` con datos. Esa decisión define si un mismo producto
puede tener distintas tasas por canal o por destino.

NO empezar sin resolver antes esa pregunta: define el modelo de datos.
