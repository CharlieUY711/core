You are continuing work on CORE-Market.

Read AGENTS.md first.

## UPDATE 6 (2026-08-22, sesión de diseño — DEC-011, API Vault Credential Provider: DISEÑO COMPLETO, IMPLEMENTACIÓN PENDIENTE)
Sesión de diseño puro, sin código/migraciones/schema/secrets. Documento
completo: `.agent/DEC-011-api-vault-credential-provider-design.md`
(30 secciones, ver DEC-011 en DECISIONS.md para el resumen).

**Antes de implementar, el próximo agente DEBE:**
1. Leer `apiVaultService.ts` (no estaba en el snapshot de esta sesión) y
   reconciliar cualquier función resolve-shaped que ya exista ahí con la
   sección 6 del diseño, en vez de crear una segunda.
2. Leer la migración base de `api_vault` (`20260607_api_vault.sql`, no
   incluida en este snapshot) para confirmar el schema/RLS reales más
   allá de lo que agregó `20260822001700_api_vault_client_exposed.sql`.
3. Leer `MLVaultService`, `TokenManager`, `OAuthService`, `ml-oauth`,
   `ml-webhook`, `extract-catalog` — **ninguno de estos archivos estuvo
   disponible en esta sesión**; todo lo que el diseño dice sobre ML
   (sección 20) es contexto reportado, no verificado, y está marcado como
   tal explícitamente en el documento. No tocar código de ML sin esa
   lectura directa.
4. Confirmar por lectura directa el bug reportado de `ml-webhook`
   (`.eq("provider", ...)` vs. columna real `platform`) antes de
   corregirlo — mismo punto que ya señalaba DEC-010, repetido acá porque
   es donde el próximo implementador realmente va a buscarlo.

El contrato genérico del Vault (RESOLVE/DELIVER/REPORT/HEALTH/LIFECYCLE,
secciones 5-19 del documento) SÍ es implementable con la evidencia
disponible esta sesión — no depende de los archivos de ML. Orden de
implementación sugerido: sección 26 del documento de diseño.

`getClientCredential.ts` y los 3 consumidores de Mapbox (`AddressMap.tsx`,
`AddressAutocomplete.tsx`, `AdminProfile.tsx`) quedan sin cambios — el
diseño los usa como el ejemplo de referencia ya correcto, no como algo a
migrar.

META sigue bloqueado hasta que este contrato esté implementado y
verificado.

## UPDATE 5 (2026-08-22, sesión de documentación — DEC-010, API Vault Credential Provider: APROBADO, NO IMPLEMENTADO)
Esta sesión fue **documentación únicamente**. No se tocó código, no se
crearon migraciones, no se modificaron secrets.

Se registró **DEC-010**: dirección arquitectónica aprobada ahora para que
API Vault sea el Credential Provider central del sistema (ciclo REQUEST →
RESOLVE → ACQUIRE/REFRESH → STORE → DELIVER → CONSUMER USE → REPORT →
HEALTH UPDATE). Full detail en `.agent/DECISIONS.md`, DEC-010.

**Importante para el próximo agente:**
- DEC-010 es una dirección **aprobada**, no un audit ya ejecutado. No
  existe en este repo evidencia de un audit previo de API Vault como
  Credential Provider, ni de un audit de META, ni de un bug confirmado en
  `ml-webhook` — ese archivo ni siquiera está presente en el snapshot con
  el que se armó esta documentación. Verificar por lectura directa antes
  de asumir cualquiera de esos puntos como cierto.
- La implementación (RESOLVE genérico, DELIVER, REPORT, health/status
  persistido, tenant→global, fix de `ml-webhook`, etc.) está **PENDIENTE**
  en su totalidad — ver el alcance completo en DEC-010.
- META queda downstream de este trabajo: no debe comenzar hasta que API
  Vault como Credential Provider esté implementado.
- Esta actualización **no reemplaza ni reinterpreta** UPDATE 4 / DEC-009
  (el flag `client_exposed` para Mapbox) — son decisiones separadas.
  DEC-009 sigue significando exactamente lo que decía.
- `CURRENT.md` y `TASK.md` no están incluidos en el zip/snapshot usado
  para esta sesión de documentación, por lo que no fueron actualizados
  acá — si existen en el repo completo, actualizarlos para reflejar
  DEC-010 (dirección aprobada, implementación no iniciada) es trabajo
  pendiente.

## UPDATE 4 (2026-08-22, sesión aparte — Mapbox token vía API Vault, DEC-009)
Nada que ver con el trabajo de design-tokens de abajo (DEC-007/DEC-008),
no se tocó ningún archivo de esa migración. Se diagnosticó y resolvió por
qué `AddressMap.tsx` no tenía token de Mapbox en local, y a pedido
explícito se implementó una solución genérica (no solo el fix de
`.env.local`): un flag `client_exposed` en `api_vault` + helper
`getClientCredential` + los 3 componentes que usan Mapbox reescritos para
leer del vault primero, con fallback a `VITE_MAPBOX_TOKEN`. Detalle
completo, con lista de archivos y razones de seguridad: DEC-009 en
DECISIONS.md y la entrada 2026-08-22 "vault genérico client_exposed" en
CHANGELOG.md. `tsc --noEmit`: sin errores nuevos. La migración SQL
(`20260822001700_api_vault_client_exposed.sql`) ya fue aplicada por el
usuario directamente en Supabase — si el CLI local no la reconoce,
correr `supabase migration repair`.


Then read:
.agent/CURRENT.md
.agent/TASK.md
.agent/DECISIONS.md      (DEC-007 is the live one; DEC-002...DEC-006 are older, still valid)
.agent/HANDOFF.md (this file)

Do not read the rest of the repository until you've read the above.

---

# CORE-Market — Agent Handoff

## UPDATE 3 (2026-08-22, Fase 5 — DEC-008 deep-evidence pass, analysis-only, no code touched)
Brief was explicit: "PHASE 1: ANALYSIS ONLY." Did the evidence-gathering
each DEC-008 finding had already flagged as its own next step (grep,
semantic-role check, exact-vs-near-match, cross-file context) — same
method DEC-007 used. **No new decision made, no code touched, DEC-008
stays PROPOSED.** Full write-up: DECISIONS.md's DEC-008 "Fase 5"
subsection, CHANGELOG.md, and a standalone `DEC-008-informe-final.md`.

Headline changes to carry forward:
1. **`#FF6835` is three different things.** One occurrence
   (`AdminOrders.tsx` `SourceBadge`) is external order-channel brand
   data — never tokenize, same class as the MercadoPago/PayPal hex next
   to it. One (`AdminCatalog.tsx` `addDepto`) is a DB-row default, not
   chrome. The other 22 are a consistent customer-facing CTA/accent,
   distinct from `--brand-madre`, that reads like a deliberate second
   accent for the storefront surface, not undocumented debt — new
   context: the app still ships under the live "ODDY" production
   domain/emails (`.env`, edge functions, `docs/legado/`). **This does
   not reopen DEC-007** — the *visual* ODDY palette DEC-007 migrated is
   independently re-confirmed superseded (see `brand.css`'s rebrand-date
   header, `core-storefront.css`'s already-aligned `--accent`). Don't
   conflate the two.
2. **Tailwind semantic colors are 3 separate decisions, not 1.**
   Danger/warning/success (red/amber/one-green) genuinely duplicate
   `--color-*` by role. Blue/violet/cyan are an unrelated *categorical*
   catalog-depth color scheme (`TreeNode.tsx`), not semantic state — no
   chart library exists in this repo. Neutral greys duplicate
   `--text-2`/`--border`/`--gray-*` by role (CORE's neutrals are
   warm-toned, Tailwind's are cool — value mismatch either way).
3. **DM Sans now has strong evidence**, same shape as the already-
   accepted ODDY case: `fonts.css` confirms `body{font-family:'Archivo'}`
   is the real global default, `brand.css`'s own header dates the
   Archivo rebrand to June 2026, and `core-storefront.css` (where most
   of the *stylesheet-level* DM Sans lives) self-labels as legacy "ODDY
   Storefront." 14 `src/app` files (recounted, not 20+) additionally
   hardcode it inline, which wins the cascade over `body`.
4. **`Brand.tsx` isn't one blanket exception.** `BRAND`/`LOGO_BG` are
   100% exact token matches (mechanically migratable). `StatusBadge`/
   `SecondHandBadge`/`Toast` are a genuine mix of exact matches and real
   token-gap pastels — confirmed live, not dead code.
5. Radius/shadow/spacing got exact-match inventories against
   `--r-*`/`--sh-*`/`--space-*` (small clusters) alongside the much
   larger no-token debt (the bulk of all three).

### OBJECTIVE FOR NEXT AGENT (post-Fase-5)
Same as post-Fase-4, unchanged in kind, sharper in detail: get a human
decision on each DEC-008 finding (now with per-occurrence evidence
instead of aggregate counts) before touching any affected file. Bucket-1
backlog and the `tw-animate-css` question remain open and independent.
DEC-006 (`/admin`) remains the highest-severity item overall.

## UPDATE 2 (2026-08-22, Fase 4 — AUDIT CLOSED, no code touched)
Fase 4 was audit-only ("NO realizar nuevas migraciones masivas"). It
re-verified Fase 3's DEC-007 migration is intact (0 undocumented ODDY
residue, all 3 exceptions/carve-outs confirmed unchanged), ran `tsc`
(270 errors, unchanged) and `vite build` (still fails only on the
pre-existing `tw-animate-css` gap), and did a wider `src/app` sweep
(hex/rgba/style={{/<style>/local CSS vars/Tailwind arbitrary classes/
radius/shadow/spacing/font-family). **Final status: TOKEN COMPLIANT
WITH EXCEPTIONS.**

It surfaced **3 new findings, all recorded as DEC-008 (PROPOSED, not
implemented, no code touched)** — each needs its own human decision
before any migration, same method DEC-007 used (grep, semantic-role
check, exact-vs-near-match, git-history evidence where relevant):
1. `#FF6835` — an undocumented accent color, 13 files, no token match.
2. Tailwind-default semantic colors (red/amber/green/blue/cyan/violet)
   duplicating existing `--color-danger/warning/success/info` tokens,
   widespread across many files.
3. `"DM Sans, sans-serif"` used as the real UI font in 20+ files
   (including `AdminLayout.tsx`'s root), parallel to and undocumented
   against `--font-base` (`'Archivo'`) — a duplicate-token-system
   situation for typography.

Also flagged, not a new decision: border-radius/box-shadow/spacing
hardcodes are extensive (never in DEC-007's scope) and `Brand.tsx` was
reviewed in full and classified as a DOCUMENTED EXCEPTION (mix of
already-flagged duplicate-token JS objects and genuine token-gap pastel
values). Full detail: 2026-08-22 "Fase 4" CHANGELOG entry, DEC-008 in
DECISIONS.md.

### OBJECTIVE FOR NEXT AGENT (post-Fase-4)
1. Get a human decision on each of DEC-008's 3 findings before touching
   any of the affected files.
2. Independently, the bucket-1 backlog (~30 files, exact-token-match
   hardcodes unrelated to ODDY) is still open and unblocked — can proceed
   any time.
3. `tw-animate-css` still needs a human call (install or remove the
   import) before trusting a `vite build` PASS.
4. DEC-006 (`/admin` privilege escalation) is still the highest-severity
   open item overall, independent of all token work, needs DB access.

## UPDATE (2026-08-22, Fase 3 — DEC-007 IMPLEMENTED)
The blocking human decision described below has been resolved: the
Fase 3 task brief itself gave the go-ahead, matching DEC-007's proposed
Option A verbatim. Bucket 2 (the ODDY legacy palette) is now migrated —
499 hex + 36 rgba substitutions across 34 files, 3 documented
exceptions/carve-outs, zero new `tsc` errors. Full detail: 2026-08-22
CHANGELOG entry, DEC-007 status in DECISIONS.md, CURRENT.md. Everything
below this line is the **prior** handoff (pre-Fase-3), kept for context
on how bucket 2 was analyzed — do not re-derive it, and note its
"OBJECTIVE FOR NEXT AGENT" item 0 is now done.

## CONTEXT (prior, pre-Fase-3)
2026-08-22, two phases so far:
- **Fase 1**: migrate hardcoded visual CSS in `src/app` onto
  `src/styles/brand.css`/`theme.css` tokens. Done for 3 files
  (`AdjustPanel.tsx`, `Navbar.tsx`, `AdminCargaMasiva.tsx`); the rest
  blocked on DEC-007 (a second, non-token orange/navy/green palette with
  no obvious CORE equivalent).
- **Fase 2** (just completed, THIS update): analysis-only phase to
  resolve DEC-007's ambiguity. No code touched. Found strong evidence
  (a contextual note in the repo's first commit + the fact that
  `AdminLayout.tsx` already migrated away from these exact colors) that
  the palette is **superseded pre-rebrand branding ("ODDY")**, not a
  deliberate admin design language. Proposed **OPTION A** (migrate to
  `--brand-madre`/`--brand-navy`/`--color-success`, with one carve-out
  for a literal color-swatch value in `TransformPanel.tsx`) — recorded
  in DEC-007 as **PROPOSED**, awaiting human approval before Fase 3
  (implementation).

## CURRENT STATE
Audit done for the whole of `src/app`. Migration done for 3 files only.
`tsc --noEmit` → 270 errors repo-wide (baseline was 279; drift, not
regression), zero in the touched files. `vite build` is currently RED —
see "unrelated blocker" below. Nothing is committed.

## WORK COMPLETED THIS SESSION
- Audited `src/app`: 1,651 hardcoded hex colors, 198 `rgba()/rgb()`
  calls, 5 files with inline `<style>`, ~50 with `style={{`.
- Found the hardcodes split into two buckets — full detail in DEC-007:
  - Bucket 1 (~150 occurrences): exact matches for existing tokens.
    Safe, mechanical, zero visual change.
  - Bucket 2 (~500 occurrences, ~20 files): a second orange/navy/green
    "ACCENT/BLUE/GREEN" palette + Tailwind default greys, with NO token
    equivalent. Looks like pre-rebrand admin-theme debris. Converting it
    to the nearest brand token would change rendered colors — a
    redesign, out of scope without a human decision.
- Migrated bucket 1 in `AdjustPanel.tsx`, `Navbar.tsx`,
  `AdminCargaMasiva.tsx` (full list of substitutions in the 2026-08-22
  CHANGELOG entry). Left bucket-2 values and a handful of no-token
  computed shades in place, commented/documented, not silently dropped.
- Recorded the whole bucket-2 ambiguity as **DEC-007**, sticky decision,
  blocked on a human product/design call.

## CURRENT PROBLEM
Two independent problems, don't conflate them:

1. **DEC-007 (token work, this session's task).** ~500 hardcodes across
   ~20 files have no token to migrate to without changing the visible
   UI. Needs a human to pick: (a) new tokens for this second palette,
   (b) accept the redesign and get sign-off, or (c) leave as debt.

2. **`tw-animate-css` (unrelated, pre-existing, newly surfaced).**
   `theme.css` does `@import 'tw-animate-css'` but that package is not in
   `package.json` or the lockfile — confirmed by grep, 0 hits in both.
   This session did a clean `rm -rf node_modules && npm install` (the
   previous partial `node_modules` had only 5 top-level dirs and was
   itself broken — `npm ls` showed every dependency as "invalid"). The
   clean install surfaced this missing dependency; `vite build` now
   fails on it. **Do not add it to package.json as part of token work**
   — that's outside `.agent/*`/`scripts/agent-*`/`package.json`'s
   `scripts` block, the only things this layer may touch per AGENTS.md
   §7. Flag it to a human; it needs its own authorization (either
   `npm install tw-animate-css --save`, or removing the import if the
   animation classes it provides are actually unused).

Neither of these is the `/admin` privilege-escalation issue (DEC-006) —
that one is still open and still needs database access, untouched this
session.

## OBJECTIVE FOR NEXT AGENT
0. **DEC-007 now has a concrete PROPOSED recommendation (Option A +
   `TransformPanel.tsx` `BG_COLORS` carve-out) — it needs a human
   yes/no, not more analysis.** Read the full writeup in
   `.agent/DECISIONS.md` under DEC-007's "Status (2026-08-22, updated by
   FASE 2 analysis)" section before doing anything else. If approved,
   that section already has the exact token mapping to implement
   (Fase 3). Do not re-derive it.
1. If a human has answered DEC-007: implement whichever branch they
   picked (Option A as proposed / a different option / accept debt),
   then resume bucket-2 migration. Remember the carve-out: the
   `BG_COLORS` literal in `TransformPanel.tsx` is editor content, not
   chrome — must NOT be tokenized even under Option A.
2. Regardless of DEC-007: bucket 1 in the other ~47 files is unblocked
   and safe to migrate right now, same method as this session (grep hex
   → match against brand.css/theme.css → substitute exact matches only
   → `tsc --noEmit` to confirm zero new errors). Suggested next targets
   by hardcode volume: `AdminOrders.tsx` (58), `AdminProducts.tsx` (55),
   `EditorPage.tsx` (44) — check each for bucket-1 vs bucket-2 mix first,
   don't assume.
3. Get a human decision on `tw-animate-css` before trusting any future
   `agent:verify` build result.
4. DEC-006 (`/admin`) is still the highest-severity open item overall;
   independent track, needs DB access.

## FILES TO INSPECT
- `.agent/DECISIONS.md` → DEC-007 (full hex/token mapping tables live in
  the 2026-08-22 CHANGELOG entry, not duplicated here).
- `src/styles/brand.css`, `src/styles/theme.css` — the token source of
  truth. Do not create a second one.
- Any file from the "Not blocked" list in TASK.md.

## FILES MODIFIED (this session, uncommitted)
Branch: master. Last commit: `ee92871`.
- Modified: `src/app/admin/editor/components/AdjustPanel.tsx`,
  `src/app/public/Navbar.tsx`, `src/app/admin/pages/AdminCargaMasiva.tsx`,
  and all of `.agent/*`.
- Also present but NOT from this session (carried from 2026-08-21,
  still uncommitted): 39 deletions under DEC-005, `src/app/routes.tsx`,
  `package.json`, `scripts/agent-handoff.js`.
- `node_modules/` and `package-lock.json` were regenerated by
  `rm -rf node_modules && npm install` — lockfile diff should be
  reviewed by a human before commit; it may pick up newer transitive
  versions than whatever generated the original lockfile.

## CONSTRAINTS
Do not change framework, database, Supabase config, Vite/React setup,
Tailwind, design system, branding, APIs, or business logic. See
AGENTS.md. Token substitutions are normalization, not redesign — only
exact-value matches qualify; anything else is DEC-007's problem, not a
license to eyeball a "close enough" replacement.

## DO NOT CHANGE
Anything outside: AGENTS.md, .agent/*, scripts/agent-*.js, and the
`scripts` block of package.json — absent fresh human authorization. This
includes NOT adding `tw-animate-css` to package.json without asking.

## VERIFICATION REQUIRED
`npx tsc --noEmit` → compare error count to 270 (this session's
baseline); any file you touch should add zero.
`npx vite build` → currently fails on `tw-animate-css`; get that
resolved by a human before treating a subsequent failure as your own.

## EXPECTED RESULT
DEC-007 resolved by a human, bucket 2 migrated accordingly; the
remaining ~47 files' bucket-1 hardcodes migrated incrementally; build
restored; `TOKEN COMPLIANT` (not "WITH EXCEPTIONS") once bucket 2 is
closed one way or another and documented.

## INSTRUCTIONS FOR NEXT AGENT
Start at AGENTS.md section 1. Nothing from this or the prior session is
committed: inspect `git status` and `git diff` first and agree with the
human on what to commit before adding to it.
