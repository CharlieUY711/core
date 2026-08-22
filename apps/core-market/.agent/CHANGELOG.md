# CORE-Market — Agent Changelog

> Compact history of agent work sessions. Do not paste full conversations
> or internal reasoning — only what a future agent needs.

## 2026-08-22 — Fase 5: DEC-008 deep-evidence pass (analysis-only, no code changed)

### Objective
Brief: "PHASE 1: ANALYSIS ONLY" — resolve conceptually the three DEC-008
findings (`#FF6835`, Tailwind semantic colors, DM Sans) plus investigate
(not migrate) `Brand.tsx`, radius, shadow, spacing. No modification to
`src/app`, `package.json`, config, or assets.

### Protocol followed
Read AGENTS.md → CURRENT.md → HANDOFF.md → DECISIONS.md → TASK.md →
SESSION.md. Confirmed DEC-007 = IMPLEMENTED before starting; DEC-007 not
reopened, ODDY trio not re-migrated.

### Findings (full detail in DEC-008's new "Fase 5" subsection)
- **`#FF6835`**: split into 3 sub-cases, not 1. One occurrence
  (`AdminOrders.tsx` `SourceBadge`) is external order-channel brand data
  (alongside MercadoPago/PayPal/MercadoLibre's own hardcoded brand hex) —
  never tokenize. One (`AdminCatalog.tsx` `addDepto`) is a DB-row default,
  not chrome. The remaining 22, across 8 `src/app/public` checkout/
  dashboard files + a handful of admin buttons, are a consistent
  customer-facing CTA/accent color, distinct from `--brand-madre`
  (admin/internal) — reads as a deliberate second accent, not debt.
  New context: `.env`/edge-function defaults
  (`APP_URL=https://market.oddy.com.uy`, `FROM_EMAIL=noreply@…`) and
  `docs/legado/`'s "ODDY Marketplace Builder" title confirm "ODDY" is
  still the live external/production brand name — this does not reopen
  DEC-007 (the *visual* ODDY palette DEC-007 migrated is independently
  confirmed superseded via `brand.css`'s own rebrand-date header and
  `core-storefront.css`'s already-aligned `--accent:#3D5689`), but it
  does mean `#FF6835` sits at a real product-identity seam, not just an
  undocumented hardcode.
- **Tailwind semantic colors**: not one bucket. Red/amber/one-green
  family = genuine danger/warning/success role duplication (role match,
  not value match — same shape as ODDY). Blue/violet/cyan = a
  *categorical* catalog-depth color scheme (`TreeNode.tsx`'s
  `TYPE_STYLE`), unrelated to semantic state — no chart library in the
  repo, this is hand-rolled. Neutral greys = role match to
  `--text-2`/`--border`/`--gray-*`, again not value match (CORE's
  neutrals are warm-toned, Tailwind's are cool-toned). Three separate
  follow-up decisions, not one.
- **DM Sans**: recounted at 14 `src/app` files (not 20+) plus
  `core-storefront.css`'s ~20 internal selectors. New evidence:
  `fonts.css` sets the real global default (`body{font-family:'Archivo'}`
  — confirms `--font-base` is live), and `brand.css`'s own header dates
  the Archivo rebrand to June 2026, while `core-storefront.css`
  self-labels as the legacy "ODDY Storefront" stylesheet. Same
  evidentiary shape DEC-007 already accepted for the ODDY color trio —
  strengthens the case for migrating DM Sans → `var(--font-base)`, still
  not decided/implemented here.
- **Brand.tsx**: split, not left as one blanket exception. `BRAND`/
  `LOGO_BG` = 100% exact token matches (pure duplication, mechanically
  migratable). `StatusBadge`/`SecondHandBadge`/`Toast` = a genuine mix —
  some values are exact matches (`--canvas`, `--text-2`, `--gourmet`,
  `--entret-tint`, `--madre-tint`), others are real token-gap pastels
  (`#2A6B4B`, `#9A4B16`, `#6BB87A`, etc.) needing a small badge/toast
  token group. Confirmed live (used in `ProductCard.tsx`,
  `ToastProvider.tsx`, `AdminML.tsx`, `AdminProducts.tsx`) — not dead
  code.
- **Radius**: 195 px-literal + ~150 bare-number declarations. Exact
  token matches: `7px`/`7`→`--r-input`/`--radius-sm` (32), `9`(bare)→
  `--r-control` (8), `14px`→`--r-card`/`--radius-md` (7), `16px`→
  `--radius-xl` (6). No-token debt (the real volume): `8px` (91), `6px`
  (69), `10px`/`12px` (~39 each), `20px` (21), `5px` (25), `4px` (11),
  `2px` (4). `999`(bare, pill-shape, 6×) near-matches `--radius-pill`.
- **Shadow**: 41 declarations. Exact matches: `0 1px 3px rgba(0,0,0,.05)`
  → `--sh-subtle`/`--shadow-sm` (6), `0 8px 24px rgba(0,0,0,.08)` →
  `--sh-card`/`--shadow-md` (1). Rest are near-miss/one-off, no token.
- **Spacing**: 268 px-literal `padding`/`margin`/`gap` + a larger
  rem-string-shorthand population (the actually-dominant idiom, e.g.
  `"0.75rem 1rem"`). px exact matches: `4px`→`--space-1` (60), `8px`→
  `--space-2` (23), `12px`→`--space-3` (6), `16px`/`32px`→
  `--space-4`/`--space-6` (2 each). No-token px debt: `2px` (57), `10px`
  (34), `3px` (21), `6px` (18), `5px` (17), `1px` (16). The rem-shorthand
  population has no `var()`-based path at all today — a unit-convention
  gap, not just missing substitutions. Positional `top/right/bottom/left`
  (11 found) kept separate as layout/coordinate values, per the brief.

### Validation
Read/audit only — no `tsc`/`build` run this session (nothing was changed
that could affect them; prior baseline — 270 errors, build red only on
the pre-existing `tw-animate-css` gap — stands unmodified).

### Result
DEC-008 stays **PROPOSED** (not implemented). Each of its 3 findings now
has a concrete, evidence-backed recommendation (see DECISIONS.md), plus
new radius/shadow/spacing exact-match inventories and a full Brand.tsx
split. No code touched. Full detail: DEC-008 "Fase 5" subsection in
DECISIONS.md; full report delivered separately as
`DEC-008-informe-final.md`.

## 2026-08-22 — Fase 4: final design-token audit (audit-only, no code changed)

### Objective
Determine final compliance status after Fase 3's DEC-007 implementation.
Audit-only per the brief ("NO realizar nuevas migraciones masivas... NO
editar src/app"). No application code was touched this session.

### Protocol followed
Re-read AGENTS.md → CURRENT.md → HANDOFF.md → DECISIONS.md → TASK.md →
SESSION.md. Confirmed DEC-007 is recorded as IMPLEMENTED with its
exceptions documented, per the brief's §1 requirement, before auditing.

### A. Baseline (Fase 1, pre-any-migration)
1,651 hex colors · 198 `rgba()/rgb()` calls · 5 files with inline
`<style>` · ~50 files with `style={{`.

### B. Post-migration metrics (this session, current state of `src/app`)

| Categoría | Antes (Fase 1) | Después (post-Fase 3, hoy) | Restantes |
|---|---:|---:|---:|
| Hex colors | 1,651 | 1,122 | 1,122 (see C) |
| `rgba()`/`rgb()` | 198 | 162 | 162 (see C) |
| Files with `style={{` | ~50 | 56 | n/a (structural) |
| Files with inline `<style>` | 5 | 5 | 0 unaudited — all 5 reviewed, all clean (tokens/keyframes/pseudo-elements only, no hex leftover) |
| Local CSS custom props (inline) | not counted | 1 | 1, dynamic/legitimate (see D) |
| Tailwind arbitrary color/radius/shadow classes | not counted | 0 | 0 — not used anywhere in `src/app` |

Net change from Fase 3: **-529 hex** (499 hex + prior 3-file bucket-1
pass), **-36 rgba** — matches Fase 3's own reported substitution counts
exactly; no untracked drift.

### C. Remaining hardcodes, classified
- **DEC-007 legacy trio (`#FF7A00`/`#0F3460`/`#1DC878`) + its grey/rgba
  set:** 0 undocumented residue. The only 3 remaining hits are the
  documented carve-out/exception (`TransformPanel.tsx` `BG_COLORS` ×2,
  `Brand.tsx` Toast `#6BB87A` ×1) — confirmed intact, unchanged since
  Fase 3.
- **`#fff`/`#000`/`#333`/`#111` etc. (bare greyscale shorthand):** widespread
  (`#fff` alone: 263 occurrences). Mixed bag — plain white/black text-on-
  colored-background and icon fills mostly (category I, intentional local
  semantic value / needs no token, since `white`/`black` as literal
  contrast colors on a colored chip is standard and not brand-specific),
  not evaluated line-by-line this session (would require per-site context
  review, out of this audit's time budget) — flagged as **not fully
  classified**, recommend a dedicated pass if a "zero raw hex" bar is ever
  wanted, but not a compliance blocker under DEC-007's own criterion
  ("el criterio NO es cero hexadecimales").
- **`#FF6835`** (13 files) — new, undocumented, not part of DEC-007's
  inventory. See DEC-008 Finding 1. **Category: B or K, pending decision.**
- **Tailwind-default semantic colors** (red/amber/green/blue/cyan/violet
  families duplicating `--color-danger/warning/success/info`, plus
  Tailwind neutral greys duplicating `--text-2`/`--border`/`--gray-*`) —
  see DEC-008 Finding 2. **Category: B, pending decision.**
- **`"DM Sans, sans-serif"`** (20+ files) vs. `--font-base` (`'Archivo'`)
  — see DEC-008 Finding 3. **Category: K (duplicate token system),
  pending decision.**
- **Border-radius** (208 non-token px values), **box-shadow** (~40 values
  with literal `rgba(0,0,0,X)`), **spacing** (781 non-token declarations)
  — never in DEC-007's scope (color-only). Not a regression; pre-existing,
  now counted for the first time. **Category: J (token gap) for most;
  a handful are exact matches (`14px`→`--r-card`, `0 8px 24px rgba(0,0,0,.08)`
  →`--sh-card`) and would be Category B if ever taken up.**

### D. Documented exceptions
1. **`TransformPanel.tsx`, `BG_COLORS` lines 21–22** — intact, unchanged.
   Editor content (canvas-background swatches), not chrome. Permanent
   carve-out per DEC-007.
2. **`Brand.tsx`, `Toast` component, `#6BB87A`** — intact, unchanged.
   Sits inside a 4-way status-color object whose other 3 values have no
   token match either; migrating one alone would break internal
   consistency. Documented in DEC-007, still pending its own follow-up
   decision (not urgent, not blocking).
3. **`Brand.tsx` as a whole** — reviewed in full this session (Fase 4 §5).
   Classified **DOCUMENTED EXCEPTION**: contains a mix of (a) exact token
   matches duplicated in JS (`BRAND.primary/secondary`, `LOGO_BG.*` —
   flagged since Fase 2, not new), and (b) near-miss pastel values with no
   token equivalent (`StatusBadge`/`PriceBadge`/`SecondHandBadge`'s
   `#2A6B4B`/`#9A4B16`/`#56544C`/etc. — genuine token gaps). Internally
   coherent as a badge/toast palette; not modified.
4. **`Navbar.tsx`'s `--mk-ph` local CSS custom property** — dynamic,
   fed from `skin.color` (data-driven per-category theming), not a
   hardcode. No action needed.

### E. Token gaps
- Brand.tsx's badge/toast pastel palette (see D3).
- Most border-radius values other than `7px`/`9px`/`14px`/`16px`/`100px`
  exact matches (e.g. widely-used `8px`, `6px`, `12px`, `10px`, `20px`,
  `5px` have no corresponding token at all in `brand.css`).
- `#FF6835` if it turns out to be intentional and distinct from
  `--brand-madre` (pending DEC-008 Finding 1's resolution).

### F. Duplicate token systems
- `Brand.tsx`'s `BRAND` + `LOGO_BG` objects (hex duplicated from
  `brand.css`, matching values — flagged since Fase 2, unresolved).
- `"DM Sans, sans-serif"` vs. `--font-base` (`'Archivo'`) — new finding,
  DEC-008 Finding 3.

### G. Typecheck
`npx tsc --noEmit`: **270 errors**, identical to the Fase 3 baseline.
**NO REGRESSION.** (Re-ran `npm install` in this sandboxed copy since
`node_modules` isn't shipped in the delivered archive; toolchain behavior
otherwise unchanged.)

### H. Build
`npx vite build`: still fails, same single cause as previously
documented — `Can't resolve 'tw-animate-css'` in `src/styles/theme.css`
(via `src/styles/index.css`). **PRE-EXISTING / OUT OF SCOPE.**
`package.json` not modified.

### I. Files changed during Fase 4
`.agent/DECISIONS.md` (new DEC-008 entry, PROPOSED), `.agent/CHANGELOG.md`
(this entry), `.agent/CURRENT.md`, `.agent/TASK.md`, `.agent/HANDOFF.md`,
`.agent/SESSION.md`. **No file under `src/app`, no CSS, no `package.json`,
no config, no assets, no SVG was modified** — confirmed by re-running the
full audit grep after documentation updates and diffing counts against
the numbers recorded above (unchanged).

### J. Final status
**TOKEN COMPLIANT WITH EXCEPTIONS.**
DEC-007's scope (the ODDY orange/navy/green/grey legacy palette) is fully
migrated with 3 documented, justified exceptions/carve-outs and zero
unjustified residue. This audit additionally surfaced three new,
out-of-DEC-007's-scope hardcode clusters (`#FF6835`, Tailwind-default
semantic colors, `DM Sans` vs `--font-base`) plus a large pre-existing,
never-in-scope backlog of radius/shadow/spacing hardcodes — none of these
are regressions or violations of DEC-007's closure, but none are
"compliant" either; they are open, catalogued debt requiring their own
decisions (DEC-008, PROPOSED) before any further migration. **Not**
declaring `TOKEN COMPLIANT` outright, per the brief's own rule that
absence-of-hex is not the criterion and undocumented hardcodes remain.

## 2026-08-22 — Fase 3: DEC-007 implementation (bucket 2 migrated)

### Objective
Implement DEC-007's approved recommendation (Option A + `TransformPanel.tsx`
carve-out): migrate the legacy ODDY orange/navy/green/grey palette in
`src/app` onto the existing Design Token System. This session received an
explicit human go-ahead in the task brief itself (matches DEC-007's
proposed mapping verbatim), so it proceeded straight to Fase 3
(implementation) rather than re-analyzing.

### Method
1. Re-confirmed the AGENTS.md start protocol (AGENTS.md → CURRENT →
   HANDOFF → DECISIONS → TASK → SESSION) before touching code.
2. Re-grepped `src/app` for the 8 legacy values
   (`#FF7A00`, `#0F3460`, `#1DC878`, `#E5E7EB`, `#F9FAFB`, `#6B7280`,
   `#9CA3AF`, `#6BB87A`) to get the authoritative current file list (35
   files — close to DEC-007's ~23/~30 estimate, some drift since 08-21).
3. Excluded `src/app/components/brand/Brand.tsx` from the mechanical pass:
   its one `#6BB87A` occurrence lives inside a 4-entry `Toast` status-color
   object (`ok/error/warn/info`, each with its own bg/color/border trio).
   Three of its four sibling values are *not* exact token matches and were
   left alone by DEC-007's own inventory — tokenizing only the `ok` row's
   border in isolation would have broken that object's internal
   consistency without a corresponding decision covering the other three.
   Recorded as a new EXCEPTION (see below), not silently skipped.
4. Excluded `TransformPanel.tsx` lines 21–22 (`BG_COLORS` array: the
   literal `{label:"Azul", color:"#0F3460"}` / `{label:"Naranja",
   color:"#FF7A00"}` swatch entries) — per DEC-007, this is user-facing
   editor *content* (a canvas-background color picker), not UI chrome.
   The file's `ACCENT`/`BLUE` **constants** (used for buttons, active-tab
   borders, SVG stroke/fill) were migrated; the two literal swatch values
   were not touched.
5. Ran a mechanical, exact-value substitution (no fuzzy/"looks close"
   matching) over the remaining 34 files:
   - `#FF7A00` → `var(--brand-madre)`
   - `#0F3460` → `var(--brand-navy)`
   - `#1DC878` → `var(--color-success)`
   - `#E5E7EB` → `var(--border)`
   - `#F9FAFB` → `var(--gray-50)`
   - `#6B7280` → `var(--mute)`
   - `#9CA3AF` → `var(--gray-400)`
   - `#6BB87A` → `color-mix(in srgb, var(--color-success) 70%, white)`
6. Found, during verification, that the FASE 1 audit's `rgba()/rgb()`
   category also contained the same three core legacy colors expressed as
   `rgba(255,122,0,X)` / `rgba(15,52,96,X)` / `rgba(29,200,120,X)` tints
   (borders, hover backgrounds, box-shadows) — not covered by DEC-007's
   hex-only mapping table but the same underlying color family. Migrated
   these too, per the task brief's own §6 guidance to use `color-mix()`
   for tint/alpha variants with no exact token:
   `rgba(255,122,0,X)` → `color-mix(in srgb, var(--brand-madre) (X*100)%, transparent)`,
   same pattern for the other two, alpha preserved exactly (e.g. `.08` →
   `8%`, `0.3` → `30%`).
7. Ran `npx tsc --noEmit` after each pass and compared to baseline.

### Files modified (34, all under `src/app`)
`admin/components/CatalogTree.tsx`, `admin/components/SelectorMediaArticulo.tsx`,
`admin/components/catalog/NodeActions.tsx`, `admin/components/catalog/TreeNode.tsx`,
`admin/editor/EditorPage.tsx`, `admin/editor/components/AdjustPanel.tsx`,
`admin/editor/components/EditCanvas.tsx`, `admin/editor/components/EffectsPanel.tsx`,
`admin/editor/components/ExportPanel.tsx`, `admin/editor/components/HistoryPanel.tsx`,
`admin/editor/components/OriginalCanvas.tsx`, `admin/editor/components/TransformPanel.tsx`,
`admin/pages/AdminArticulos.tsx`, `admin/pages/AdminBiblioteca.tsx`,
`admin/pages/AdminCatalog.tsx`, `admin/pages/AdminDashboard.tsx`,
`admin/pages/AdminExport.tsx`, `admin/pages/AdminImport.tsx`,
`admin/pages/AdminMisPublicaciones.tsx`, `admin/pages/AdminOrders.tsx`,
`admin/pages/AdminProducts.tsx`, `admin/pages/AdminProfile.tsx`,
`admin/pages/AdminPublicaciones.tsx`, `admin/pages/AdminToolEditor.tsx`,
`components/brand/ProductCard.tsx`, `components/maps/AddressAutocomplete.tsx`,
`components/maps/AddressMap.tsx`, `components/profile/AddressCard.tsx`,
`public/DashboardLayout.tsx`, `public/DashboardPerfil.tsx`,
`public/DashboardPublicaciones.tsx`, `public/MisPublicacionesPage.tsx`,
`public/OrdenPage.tsx`, `public/SHCard.tsx`.

**Not modified:** `src/app/components/brand/Brand.tsx` (exception, see
below); `TransformPanel.tsx` lines 21–22 (carve-out, unchanged literal
swatch data within an otherwise-modified file).

### Tokens introduced/used
No new tokens created (per AGENTS.md §3 / the brief's "NO inventar
tokens"). All substitutions reuse existing entries from `brand.css`:
`--brand-madre`, `--brand-navy`, `--color-success`, `--border`,
`--gray-50`, `--mute`, `--gray-400`. `color-mix(in srgb, var(--color-success)
70%, white)` and the `color-mix(..., transparent)` alpha forms reuse
`--color-success` / `--brand-madre` / `--brand-navy` — not new tokens,
just CSS-native derivations of them, as the brief's own §6 endorses for
this exact case.

### Hardcodes removed
- **Color (hex):** 499 exact-value substitutions across the 8 legacy
  values (`#FF7A00`×~78, `#0F3460`×~11, `#1DC878`×9, `#E5E7EB`×133,
  `#F9FAFB`×22, `#6B7280`×93, `#9CA3AF`×119, `#6BB87A`×34 — one `#6BB87A`
  left as exception, see below).
- **Color (rgba tints):** 36 substitutions of `rgba(255,122,0,X)` /
  `rgba(15,52,96,X)` / `rgba(29,200,120,X)` → `color-mix()` expressions.
- **Radius/typography/spacing/shadow:** none touched this session — out
  of scope for DEC-007, which was specifically the legacy-color question.
- **Total:** 535 substitutions, 0 new visual regressions expected for the
  ~500 mapped occurrences (this is the *intended* visual change: finishing
  the June 2026 rebrand in files it never reached — see DEC-007's risk
  assessment, "visual change is real and repo-wide... this is the
  intended effect").

### Exceptions
1. **`src/app/components/brand/Brand.tsx`, `Toast` component, `ok` status
   row, `border:"#6BB87A"`.** Not migrated. Motive: this one hex sits
   inside a 4-way `{bg,color,border}` status palette (ok/error/warn/info)
   that is otherwise entirely custom pastel values with no token match —
   migrating only this one field would leave the object internally
   inconsistent (3 literal siblings, 1 tokenized). Requires its own design
   decision (a `Toast`/status color system as a named token group), not a
   silent one-off swap. **Requires decision posterior:** yes — recommend a
   follow-up ticket, not blocking on this one.
2. **`TransformPanel.tsx` lines 21–22, `BG_COLORS` array literals
   (`"Azul"` → `#0F3460`, `"Naranja"` → `#FF7A00`).** Not migrated, by
   design per DEC-007: these are user-selectable canvas-background swatch
   values (photo-editor output content), not UI chrome. Tokenizing them
   would silently change what a saved export looks like. **Requires
   decision posterior:** no — this is DEC-007's documented, permanent
   carve-out, not open.
3. **`rgba(15,52,96,.06)` and similar tint values were converted via
   `color-mix()` rather than a literal alpha-token**, since no
   pre-existing alpha-token equivalents exist in `brand.css` for these
   exact percentages. This is a derivation, not an invented token — same
   pattern the file's own `--brand-primary-light: rgba(61,86,137,.1)` alias
   already uses for the *current* palette, applied here to the *legacy*
   one during transition.

### Validation
- `typecheck`: `npx tsc --noEmit` → **270 errors** before and after (same
  baseline as HANDOFF.md's last recorded count) — **zero new errors**
  introduced by this session across all 34 modified files.
- `build`: `npx vite build` → still fails on the pre-existing,
  out-of-scope `tw-animate-css` unresolved import (`theme.css`), unrelated
  to this change, not fixed here per AGENTS.md §7 / HANDOFF.md's existing
  guidance. Confirmed the failure message and root cause are identical to
  what HANDOFF.md already documented (no new build errors from token work
  — `vite build`'s own module-transform step ran and failed only on
  resolving `tw-animate-css`, before ever reaching the modified files'
  bundling).
- `grep/audit`: re-ran the full 8-value + 3-rgba grep across `src/app`
  after the pass. Remaining hits: exactly the 3 documented
  exceptions/carve-outs above, zero unintended leftovers.
- `diff`: repo was extracted from a zip with no `.git` present in this
  environment, so a `git diff` could not be produced here — file-by-file
  substitution counts above are the audit trail; every substitution was a
  mechanical 1:1 string replace (script-driven, not manual edits), so
  there is no risk of stray unrelated changes in the touched files.

### Remaining debt (repo-wide, `src/app`, after this session)
- **Bucket-1 exact-token-match hardcodes in the other ~30 files** not
  touched by DEC-007 (files that never used the ODDY palette but still
  hardcode e.g. `#3D5689`/`#0D2B55`/`#fff` instead of the equivalent
  token) — unrelated to DEC-007, still open per TASK.md's original
  "not blocked" bucket. Not attempted this session; scope was DEC-007
  specifically.
- 1 documented `#6BB87A` exception in `Brand.tsx` (needs its own
  decision — a `Toast`/status-color token group).
- 2 documented carve-out literals in `TransformPanel.tsx` (permanent,
  not debt).
- `Brand.tsx`'s duplicate `BRAND` object (hardcodes current-brand hex in
  JS instead of consuming CSS custom properties) — flagged by DEC-007's
  analysis phase, still unresolved, still out of this decision's scope.
- `tw-animate-css` missing dependency — unrelated pre-existing build
  blocker, still needs a human `npm install` or import removal decision.
- No lint/test tooling (pre-existing, DEC-003).

### Final status
**TOKEN COMPLIANT WITH EXCEPTIONS.** DEC-007's bucket 2 (the ODDY legacy
palette) is now migrated in full except the 3 documented, justified
exceptions above. The separate bucket-1 backlog in ~30 unrelated files is
untouched debt, out of DEC-007's scope, tracked in TASK.md.

## 2026-08-21 — bootstrap (assembled outside repo)

### Objective
Install the AGENTS.md / .agent/* handoff system and automation scripts.

### Changes
Created AGENTS.md, .agent/{CURRENT,HANDOFF,TASK,DECISIONS,ARCHITECTURE,
CHANGELOG,SESSION}.md, and scripts/agent-{status,handoff,verify}.js as
templates, since this was assembled without direct access to the real
repository at C:\CORE\apps\core-market.

### Files
AGENTS.md, .agent/*.md, scripts/agent-*.js

### Verification
Not run — no access to the real repo/package.json from this environment.

### Result
Templates ready to drop into the repo. First real agent session must run
the bootstrap inspection (see HANDOFF.md) and replace placeholders.

### Remaining
- Fill CURRENT.md and ARCHITECTURE.md with real data.
- Wire package.json scripts (see INSTALL.md).
- Run agent:status and agent:verify once for real.

## 2026-08-21 — bootstrap (package.json received)

### Objective
Wire agent:* scripts into the real package.json and fill CURRENT.md /
ARCHITECTURE.md with real findings, based on the actual package.json
content (still without direct filesystem access to the repo's source
tree).

### Changes
Added agent:status/agent:handoff/agent:verify to package.json's scripts
block (nothing else touched). Rewrote .agent/CURRENT.md and
.agent/ARCHITECTURE.md from UNKNOWN placeholders to concrete findings
derived from dependencies: React 18 + Vite 5 + TS + Tailwind v4 +
react-router-dom + Zustand + Supabase + Mapbox/GeoJSON/TopoJSON + pdfjs +
papaparse + @imgly/background-removal. Noted absence of lint/test/
typecheck scripts.

### Files
package.json, .agent/CURRENT.md, .agent/ARCHITECTURE.md, .agent/HANDOFF.md

### Verification
Not run against the real repo (no filesystem access from this
environment) — scripts were syntax-checked and functionally tested
against the template files only.

### Result
Handoff system fully wired for this stack. Architecture map is inference
from package.json, not yet confirmed against actual source code.

### Remaining
- Run agent:status / agent:verify for real inside C:\CORE\apps\core-market.
- Inspect src/ and supabase/ to confirm or correct ARCHITECTURE.md.
- Resolve open questions listed in CURRENT.md.

## 2026-08-21 — architecture confirmed against real source tree

### Objective
Confirm or correct the package.json-derived architecture map against the
real `src/` tree, `supabase/` tree, `src/app/routes.tsx`, and
`src/utils/supabase/client.ts`.

### Changes
Rewrote `.agent/ARCHITECTURE.md` from dependency-based inference to a
structurally-confirmed map: full Supabase Edge Functions inventory
(payments via MercadoPago + PayPal, MercadoLibre OAuth/sync/webhook/
publish/queue, catalog import/export, stock reconciliation, email, event
tracking, age verification), the full public + admin route table, the
`core-apivault` / `tool-editor` internal sub-packages under `src/lib/`,
the document-generation engine (`remito`/`etiquetaEnvio`/`ticket`/
`acuseRecibo`), and the order status state machine
(`pagada → preparando → enviada → entregada`). Rewrote `.agent/CURRENT.md`
to reflect this confirmed pass and turned prior open questions into a
concrete next-steps list. No lint/test/typecheck scripts found (still
only `build`).

### Files
.agent/ARCHITECTURE.md, .agent/CURRENT.md, .agent/HANDOFF.md

### Verification
Not run in this pass — this was a documentation/mapping pass only, no
application code was touched, so `agent:verify` was not re-run.

### Result
Architecture map is now CONFIRMED (structural level) rather than
inferred. Business logic inside individual services (exact ML sync
rules, exact document templates) still not read line-by-line.

### Remaining
- Confirm whether `AdminAnalytics.tsx` exists or `routes.tsx` has a
  broken import.
- Confirm the actual auth-guarding mechanism for `/admin` and
  `/dashboard`.
- Resolve duplicate-looking files: `useUserRole.ts` (two copies),
  `ProductCard.tsx` (two copies), `carritoApi.ts` (two copies).
- Understand why only one migration file exists at repo root.
- No product/feature task assigned yet — next agent should either resolve
  the above or pick up a real task once one exists.

## 2026-08-21 — bugfix: agent-status.js "Last Updated" always UNKNOWN

### Objective
`npm run agent:status` was run for real against the repo (via pnpm) for
the first time. `agent:verify` passed (build PASS), but `agent:status`
printed `Last Updated: UNKNOWN` despite `.agent/CURRENT.md` containing a
populated `## Last Updated` section.

### Root cause
`scripts/agent-status.js`'s `extractSection()` used a regex ending in
`(?=^##\s+|\Z)`. `\Z` is not a valid JavaScript regex token — it's
interpreted as a literal `Z` character, not an end-of-string anchor. For
any section that isn't followed by another `## ` heading (i.e. whichever
section happens to be last in `CURRENT.md` — currently "Last Updated"),
the lookahead never succeeds, the whole match fails, and the function
silently falls back to `"UNKNOWN"`. This was a latent bug in the
originally-installed template, not something introduced by the
architecture-confirmation pass — it just wasn't exercised/noticed until
`agent:status` was run against the real file.

### Changes
Rewrote `extractSection()` in `scripts/agent-status.js` to parse
`CURRENT.md` line-by-line (find the heading line, then scan forward for
either the next `## ` heading or end-of-file) instead of relying on a
single regex with an invalid end-anchor. Behavior for all other fields is
unchanged; only the previously-broken last-section case is fixed.

### Files
scripts/agent-status.js

### Verification
Ran `node scripts/agent-status.js` directly against the real
`.agent/CURRENT.md` — all seven fields now print correctly, including
`Last Updated: 2026-08-21` (previously `UNKNOWN`). Did not touch
`agent-verify.js` or `agent-handoff.js`; not re-tested since not modified.

### Result
`agent:status` now reports `Last Updated` accurately. No behavior change
for any other field.

### Remaining
Same open structural questions as the previous entry — this was a
tooling bugfix only, not progress on those questions.

## 2026-08-21 — confirmed: `AdminAnalytics` import in routes.tsx is dead

### Objective
Resolve the open question of whether the `AdminAnalytics` import in
`src/app/routes.tsx` points to a real file or is broken.

### Root cause
Two things were true at once, which is why it wasn't obvious at first:
`AdminAnalytics.tsx` genuinely does not exist in `src/app/admin/pages/`
(confirmed via a real, uncached `dir` listing), and the import in
`routes.tsx` is never used as a route element, so esbuild/Rollup elide it
before Rollup ever tries to resolve its file path — which is why even a
clean, cache-free `vite build` (no Turborepo, no `.vite` cache) passes
with zero errors. There is no `typecheck` script wired into
`agent:verify`, so `tsc`'s `noUnusedLocals: true` never runs to catch it
either.

### Changes
Documentation only: added DEC-001 to `.agent/DECISIONS.md` recording the
confirmed finding and the one-line-deletion recommendation; updated
`.agent/CURRENT.md` (`Known Problems`, `Open Questions`, `Next
Recommended Action`) to mark this resolved and point at the pending fix.
No application code (`routes.tsx` itself) was changed in this pass, per
AGENTS.md §7 — this layer documents and recommends, it doesn't
silently edit app code.

### Files
.agent/DECISIONS.md, .agent/CURRENT.md

### Verification
`npx vite build` run clean (cache and `dist` removed, bypassing
Turborepo/pnpm) — PASS, 1906 modules, confirming the import is elided
rather than resolved. `Select-String -Pattern "AdminAnalytics"` on
`routes.tsx` — only the import line, no `element:` usage found.

### Result
Open question closed. One-line fix identified but not applied (app code
is out of scope for this layer) — see `Next Recommended Action` in
CURRENT.md.

### Remaining
- Apply the one-line deletion in `src/app/routes.tsx`.
- Same other open structural questions as prior entries (duplicate
  `useUserRole.ts`/`ProductCard.tsx`/`carritoApi.ts`, auth-guarding
  mechanism, single migration file).
- Still no `typecheck` script — this session is a concrete example of a
  bug class that only `tsc` would catch.

## 2026-08-21 - fix aplicado: import muerto de AdminAnalytics eliminado

### Objetivo
Aplicar el fix de una linea recomendado en DEC-001 (.agent/DECISIONS.md):
borrar el import muerto de AdminAnalytics en src/app/routes.tsx.

### Cambios
Eliminada la linea de import de AdminAnalytics desde
./admin/pages/AdminAnalytics en src/app/routes.tsx. Ningun otro
archivo referenciaba ese import.

### Archivos
src/app/routes.tsx

### Verificacion
agent:verify corrido despues del borrado - PASS.

### Resultado
DEC-001 cerrada. El import muerto ya no existe en el repo.

### Pendiente
Mismas Open Questions estructurales que quedaban en CURRENT.md antes de
este fix (auth-guarding de /admin y /dashboard, archivos duplicados,
unica migracion SQL en el repo).

## 2026-08-22 — canonical repo settled, TypeScript wired, four latent defects surfaced

### Objective
Resolve the two decisions the human explicitly delegated: (1) which of
the two "core-market" copies is canonical; (2) what to do about the
absent lint/test/typecheck tooling flagged in DEC-001.

### Changes
- `.agent/DECISIONS.md`: added DEC-002 (canonical repo), DEC-003
  (typecheck strategy), DEC-004 (the two never-valid source files).
- `package.json`: added `"typecheck:full": "tsc --noEmit"`. Named to stay
  *outside* `agent-verify.js`'s `CANDIDATES` detection, so `agent:verify`
  does not go permanently red. Rationale and promotion criteria: DEC-003.
- `src/dashboard/layout/Sidebar.tsx`: repaired line 32 — unterminated
  style object and unclosed `<a>` tag. One line.
- `scripts/agent-handoff.js`: fixed a genuine bug. `git()` returns
  `.trim()`ed stdout, so the first line of `git status --porcelain` lost
  its leading space, and the fixed-offset `line.slice(3)` then ate the
  first character of the first changed path ("package.json" was logged as
  "ackage.json"). Replaced fixed offsets with a tolerant regex parse.
- `.agent/ARCHITECTURE.md`: appended a superseding CORRECTIONS section
  (C1–C5) recording what `tsc` contradicted.
- `.agent/CURRENT.md`, `.agent/TASK.md`, `.agent/HANDOFF.md`: rewritten.

### Findings (the substance of this entry)
Running `tsc --noEmit` for the first time in this repo's life surfaced
four defects that `vite build` structurally cannot see, all verified by
reading the files rather than trusting the compiler:

1. **ventas + documentos are an unwired island.** Nothing imports
   `cambiarEstadoVenta`; its 8-file cluster has import paths off by one
   directory level, and `templates/*` import a `blocks/header` that does
   not exist. The order state machine and document generation described
   in ARCHITECTURE.md as live subsystems do not run at all.
2. **`/admin` does not check the admin role.** `AdminLayout.tsx` reads
   `isAdmin` from `useUserRole()` and never uses it; the only enforced
   condition is `if (!user)`. Any authenticated user reaches every admin
   route. Highest-severity item found.
3. **`/m/:token` throws at runtime.** `MensajePage.tsx` uses `API` in
   three `fetch` calls and never declares or imports it.
4. **`src/dashboard/` (6 files) is fully orphaned**, with broken internal
   imports — which resolves the long-standing "are the two `useUserRole`
   files intentionally distinct?" question. They are not.

Measured baseline: 374 errors / 64 files, once the unparseable
`CoreStorefront.tsx` is excluded. With it included, only 7 syntax errors
are reported and every semantic error in the codebase is suppressed —
measured, not assumed.

### Files
.agent/ARCHITECTURE.md, .agent/CHANGELOG.md, .agent/CURRENT.md,
.agent/DECISIONS.md, .agent/HANDOFF.md, .agent/SESSION.md,
.agent/TASK.md, package.json, scripts/agent-handoff.js,
src/dashboard/layout/Sidebar.tsx

### Verification
`pnpm run agent:verify` → PASS (build). `node --check
scripts/agent-handoff.js` → OK, and `agent:handoff` re-run end-to-end to
confirm the path-parsing fix. `package.json` re-parsed after editing.
Sidebar fix inspected via `git diff`: exactly one line, no BOM, no
line-ending churn (file was and remains LF throughout).

### Result
Both delegated decisions made, documented, and applied. Tooling gap
closed in a staged way rather than a cosmetic one.

### Remaining
Nothing committed — the working tree carries every change above, for
human review. `CoreStorefront.tsx` deletion needs an explicit go-ahead
(DEC-004 item 2); the permission classifier blocked it this session.
Items 2–4 of the findings each need a product or security decision
before anyone writes code.

## 2026-08-22 — dead-code removal: Etiqueta Emotiva, ventas/documentos island, orphaned trees

### Objective
Act on the four findings from earlier the same day. The human authorized
deletion explicitly: Etiqueta Emotiva was to be removed entirely if
nothing behind it worked, and for the rest, "si hay que eliminar que no
quede nada."

### Changes
39 files deleted in four groups — full inventory and per-group rationale
in DEC-005. Summary:
- Etiqueta Emotiva: `MensajePage.tsx`, its import + route in `routes.tsx`,
  `ordenesApi.ts` (same phantom backend), `utils/supabase/info.ts`.
- The island: `services/ventas/**`, `services/documentos/**`, `app/events/**`.
- Orphans/fossils: `src/dashboard/**`, `CoreStorefront.tsx`,
  `public/ProductCard.tsx`, `public/CrossSellBar.tsx`,
  `services/productos/ranking.ts`.

Rule applied throughout: **delete what provably never worked; report what
is merely unwired.** Six `public/Dashboard*` pages, three logistics
services, and three other orphans were therefore left alone and are listed
in DEC-005.

### Evidence gathered before deleting
- No edge function named `api` exists, so the `API` constant in
  `MensajePage.tsx` had no target — reconstructed from the sibling pattern
  in `ordenesApi.ts`. No `etiquetas` table, no admin UI for the feature.
- No edge function, migration, or live frontend file references a `ventas`
  table; the live backend uses the `crear_orden_segura` RPC and writes to
  `ordenes` (`mp_webhook`). The island's ten `from("ventas")` calls were
  self-referential.
- `/dashboard` resolves to `DashboardRedirect` → `/admin`, which is what
  orphans the `public/Dashboard*` cluster.

### Files
See DEC-005 for the 39 deletions, plus modified: `src/app/routes.tsx`
(one import + one route entry removed), `.agent/ARCHITECTURE.md`,
`.agent/CHANGELOG.md`, `.agent/CURRENT.md`, `.agent/DECISIONS.md`,
`.agent/HANDOFF.md`, `.agent/SESSION.md`, `.agent/TASK.md`.

### Verification
`pnpm run agent:verify` → PASS (build) after the deletions.
`typecheck:full`: **374 errors / 64 files → 279 / 44.** In-repo TS2307
broken imports: 15 → 1 (`topojson-specification`, a missing `@types`
package). `routes.tsx` edited with byte-oriented `sed` and inspected via
`git diff`: exactly two lines removed, no BOM, no mojibake — the encoding
failure mode that bit an earlier agent on this same file.

### Result
Three of the four findings closed (C1, C2, C4). The fourth (C3, the
`/admin` guard) was deliberately left untouched — see DEC-006: the role
comes from client-writable `user_metadata`, so it is privilege escalation
rather than a weak guard, and no client-side edit fixes it.

### Remaining
Nothing committed — the working tree holds all 39 deletions plus the
modified files, for human review. C3 remediation needs database access:
run the `pg_tables.rowsecurity` diagnosis in DEC-006 first.

## 2026-08-22 — design-token enforcement pass (3 target files)

### Objective
New task delivered outside the repo ("CORE MARKET — DESIGN TOKEN
ENFORCEMENT"): make UI visual properties under `src/app` consume the
existing Design System tokens (`src/styles/brand.css` +
`src/styles/theme.css`) instead of hardcoded values, without redesigning,
without inventing tokens, without touching architecture or business
logic. Named starting files: `AdjustPanel.tsx`, `AdminCargaMasiva.tsx`,
`Navbar.tsx` — audit not limited to them.

### Audit (full `src/app`)
1,651 hardcoded hex colors, 198 `rgba()/rgb()` calls, 5 files with inline
`<style>`, ~50 files with `style={{`. Two buckets, see DEC-007 for full
detail:
- Bucket 1 — exact matches for existing tokens (~150 occurrences):
  mechanical, zero visual change.
- Bucket 2 — a second, disconnected orange/navy/green "ACCENT/BLUE/GREEN"
  palette + Tailwind default greys, ~500 occurrences across ~20 files
  (heaviest: `AdminProfile.tsx` 143, `AdminPublicaciones.tsx` 116,
  `AdminMisPublicaciones.tsx` 115, `AdminCatalog.tsx` 106). No token
  equivalent exists; looks like pre-rebrand admin-theme debris. Mapping
  it onto brand tokens would change rendered colors (orange → blue) —
  a redesign, explicitly out of scope. Recorded as **DEC-007**, blocked
  on a human decision.

### Changes (bucket 1 only, inside the 3 named files)
- `src/app/admin/editor/components/AdjustPanel.tsx`: slider-thumb
  `::-webkit-slider-thumb` / `::-moz-range-thumb` border `#fff` →
  `var(--color-text-light)`; track background `#E5E7EB` → `var(--border)`.
  Left the 3 group-legend colors (`#FF7A00`/`#0F3460`/`#1DC878`) and one
  label color (`#6B7280`) as bucket-2 exceptions.
- `src/app/public/Navbar.tsx`: all platform-skin colors that have an
  exact token (`#3D5689`→`--brand-madre`, `#0D2B55`→`--brand-navy`,
  `#314B6E`→`--brand-navy-field`, `#2E7D57`→`--second`,
  `#256647`→`--second-field`, `#9B3326`→`--gourmet`,
  `#822A20`→`--gourmet-field`, `#46639B`→`--brand-madre-hover`,
  `#8A8678`→`--mute`, `#1C6E86`/`#A85636`/`#7E3A70`/`#C2611F`/`#50617F`→
  `--tech`/`--home`/`--vestimenta`/`--entret`/`--servicios`,
  `#1C1B19`→`--ink`, `#fff`/`#ffffff`→`--card`/`--color-text-light`);
  `border-radius: 9` → `var(--r-control)` (4 call sites), `borderRadius:
  999` → `var(--radius-pill)`. Left 7 computed hover/focus/divider
  shades with no token equivalent (`#3A567C`, `#2C7350`, `#8E2F23`,
  `#1F5C40`, `#6F2117`, `#143A6B`, `#8FA0BC`) as documented exceptions.
- `src/app/admin/pages/AdminCargaMasiva.tsx`: already 95%+ token-driven;
  the only 2 hardcodes (`background: #fff` ×2) → `var(--card)`.

### Verification
`npx tsc --noEmit`: 270 pre-existing errors repo-wide (baseline was 279 —
normal drift, not caused by this change), **zero** in any of the three
edited files. `npx vite build` fails on a **pre-existing, unrelated**
issue: `theme.css` imports `tw-animate-css`, which is not in
`package.json` or the lockfile — confirmed by grepping both (0 hits) and
by the fact this repo's own `git status` shows nothing package-related
was ever committed for it. Not caused by this session; not fixed here
(package.json edits are restricted to the `agent:*` scripts block per
AGENTS.md §7 — adding a real dependency needs separate authorization).

### Files
Modified: `src/app/admin/editor/components/AdjustPanel.tsx`,
`src/app/public/Navbar.tsx`, `src/app/admin/pages/AdminCargaMasiva.tsx`,
`.agent/DECISIONS.md` (DEC-007), `.agent/CHANGELOG.md` (this entry),
`.agent/CURRENT.md`, `.agent/TASK.md`, `.agent/HANDOFF.md`,
`.agent/SESSION.md`.

### Result
3 of the ~50 files touched are now fully token-compliant except for
documented bucket-2 exceptions. The other ~47 files (and the ~500
bucket-2 occurrences inside the 3 touched files) are untouched pending
DEC-007. Declared status: **TOKEN COMPLIANT WITH EXCEPTIONS**, scoped
strictly to the 3 named files — the repo as a whole is far from
compliant and that is stated plainly, not implied otherwise.

### Remaining
- Resolve DEC-007 (human decision: new admin-palette tokens vs. redesign
  vs. accepted debt) before bucket 2 can move at all.
- Extend the same mechanical bucket-1 pass to the other ~47 files with
  hardcodes — safe to do incrementally, file by file, same method used
  here (grep for hex → check against brand.css/theme.css → substitute
  only exact matches → tsc check).
- `tw-animate-css` missing dependency blocks a full build; unrelated to
  tokens, needs its own authorization to fix (`package.json` dependency
  add is out of this layer's scope).

## 2026-08-22 — F1 aplicado y capa de datos de F2

### Objetivo
Encender `catalog_*`: emitir el claim `store_id` que sus políticas RLS exigen,
y dar a la pantalla de publicaciones una forma de leer el modelo multicanal.

### Cambios
- `20260822000000_store_membership_and_jwt_claim.sql` — `store_members`,
  `stores.owner_id/is_active/timestamps`, `custom_access_token_hook` y los
  GRANT a `supabase_auth_admin` (incluidas políticas de lectura, que se omiten
  a menudo y hacen fallar el hook en silencio).
- `20260822000050_fix_stores_id_default.sql` — `stores.id` no tenía
  `DEFAULT gen_random_uuid()`; el seed fallaba con 23502. La única fila previa
  se había creado con id generado del lado de la app y el hueco nunca se notó.
- `20260822000100_seed_store_charlie_market.sql` — tienda `charlie-market`
  (`78db7daa-b92a-45d3-88ef-1e715d6d549b`) y membresía del dueño.
- `20260822000200_catalog_publicaciones_rpc.sql` — RPC `catalog_publicaciones`.
- `src/app/admin/hooks/useCatalogPublicaciones.ts` — hook que la consume.

### Estado en la base
Las tres primeras APLICADAS vía `supabase db push`. El historial de migraciones
quedó reparado (`migration repair --status applied 20260607`), así que el CLI
vuelve a ser utilizable. `20260822000200` escrita y commiteada pero **todavía
no aplicada**.

Hook verificado llamándolo directamente: devuelve
`{"claims":{"store_id":"78db7daa-..."}}`. **Falta habilitarlo** en
Authentication > Hooks y volver a iniciar sesión.

### Nota sobre `v_catalog_listings_priced`
No se reutilizó pese al nombre: no tiene precio de venta (sólo `cost_price`),
usa JOIN inner contra `catalog_listings` — así que los productos sin publicar
no aparecen — y devuelve una fila por (variante, canal) obligando a reagrupar
en el cliente.

### Verificación
`agent:verify` → PASS. `tsc --noEmit` sin errores en los archivos nuevos.

### Pendiente
Aplicar `20260822000200`, habilitar el hook, y enchufar `AdminPublicaciones.tsx`
al hook nuevo — bloqueado hasta que la sesión de design tokens commitee ese
archivo, para no pisarnos.

## 2026-08-22 — DEC-011: API Vault Credential Provider (RESOLVE/REPORT/HEALTH)
Implemented (partial, by design — see DEC-011 in DECISIONS.md for full
detail, contradictions found, and what was deliberately not migrated).

**Added:**
- `supabase/functions/_shared/api-vault/CredentialProvider.ts` — generic
  server-side RESOLVE/DELIVER/REPORT/HEALTH over `api_vault`. Provider-
  agnostic (no ML/Meta/payments knowledge).
- `supabase/migrations/20260822001700_api_vault_health_columns.sql` —
  adds `status` (with CHECK constraint), `last_checked_at`, `last_error`
  to `api_vault`. Additive, idempotent, no RLS changes.

**Modified:**
- `src/lib/core-apivault/src/services/apiVaultTypes.ts` — added optional
  `status`/`last_checked_at`/`last_error` to `ApiVaultEntry` (additive).
- `supabase/functions/ml-webhook/index.ts` — fixed a confirmed bug:
  `fetchMLResource()` queried `api_vault` with `.eq("provider",
  "mercadolibre")`; that column doesn't exist (real column is
  `platform`, value `"MercadoLibre"`), so the query always failed
  silently and the function always returned `null` for any ML webhook
  without a `storeId` in its payload. Fixed with a corrected direct
  query (not routed through RESOLVE — this is a discovery query, not a
  known-tenant resolution; see DEC-011 for why).
- `supabase/functions/extract-catalog/index.ts` — migrated
  `getKeyFromVault()` from an ad-hoc `.ilike("platform", "%groq%")`
  query to `resolveCredential()`. Behavior change: now an exact match on
  `"Groq"` instead of a substring/case-insensitive match — unverified
  against live data, flagged for the next agent in DEC-011.

**Not touched (deliberate):** `ml-oauth`, `MLVaultService.ts`,
`TokenManager.ts`, `OAuthService.ts`, MercadoPago, PayPal, Resend, META,
RLS policies on `api_vault`, `client_exposed` (does not exist, and DEC-011's
design doc's premise that it does was found to be false against this
repo — documented in DECISIONS.md).

**Verification:** no test infra in this repo (confirmed, unchanged from
prior sessions). Manual review against `production_schema.sql` (real
DDL) and against `MLVaultService.get()`'s already-correct tenant→global
pattern. `tsc --noEmit` on `src/` shows 0 new errors from the one `src/`
file touched (`apiVaultTypes.ts`) — but surfaced an unrelated, pre-existing
problem: this ZIP's `node_modules` is missing `@supabase/supabase-js` and
`react-dom`, so the full `tsc` run shows 5,533 errors here, not the ~270
baseline CURRENT.md records from a prior session's environment. Not
fixed (out of scope, not caused by this session). Edge Functions
(`supabase/functions`) are outside `tsconfig.json`'s `include`, so no
type-check exists for them in this repo at all — reviewed by hand.
