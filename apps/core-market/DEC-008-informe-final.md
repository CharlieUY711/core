# DEC-008 — Informe Final (Fase 1: Análisis Únicamente)
**Proyecto:** `C:\CORE\apps\core-market` · **Fecha:** 2026-08-22
**DEC-007:** IMPLEMENTED (confirmado, no reabierto) · **Estado del proyecto:** TOKEN COMPLIANT WITH DOCUMENTED EXCEPTIONS
**Este informe:** análisis exclusivamente. Ningún archivo de `src/app`, `package.json`, configuración o assets fue modificado.

---

## A. #FF6835

**24 apariciones en 13 archivos.** No se encontraron variantes `rgb()`/`rgba()` equivalentes (255,104,53) ni mayúsculas/minúsculas adicionales — todas las apariciones son literales `#FF6835` en `style={{}}`.

Este color **no es una sola cosa**. Se dividió en tres grupos con función visual distinta:

| Grupo | Ocurrencias | Archivos | Clasificación |
|---|---|---|---|
| Badge de canal externo (`SourceBadge`, junto a MercadoPago `#009EE3`, PayPal `#003087`, MercadoLibre `#FFE600`) | 1 | `AdminOrders.tsx` | **DATA / ASSET** (identidad de marca externa — nunca tokenizar) |
| Valor por defecto insertado en `departamentos.color` al crear un departamento | 1 | `AdminCatalog.tsx` (`addDepto`) | **DATA** (default de dato editable por usuario, no chrome) |
| CTA/acento de header y botones en pantallas de cara al cliente (checkout, dashboard, orden) | 22 | `ErrorBoundary.tsx`, `AdminOrders.tsx`, `AdminCatalog.tsx` (stat card), `AdminDashboard.tsx`, `AdminProducts.tsx`, `DashboardLayout.tsx`, `DashboardPage.tsx`, `DashboardPerfil.tsx`, `DashboardOrdenes.tsx`, `OrdenPage.tsx`, `SuccessPage.tsx`, `FailurePage.tsx`, `PendingPage.tsx` | **BRAND** (probable acento deliberado, secundario al `--brand-madre` admin) — ver hallazgo abajo |

**¿Existe token equivalente?** No. El más cercano es `--brand-madre` (`#3D5689`), un tono completamente distinto (azul vs. naranja) — no es un caso de "mismo rol, distinto valor" como el trío ODDY de DEC-007; es un color sin ningún candidato de reemplazo exacto ni cercano.

**Hallazgo nuevo, relevante pero que NO reabre DEC-007:** el dominio de producción sigue siendo `market.oddy.com.uy` (`.env`/Edge Functions), el remitente de emails es `noreply@market.oddy.com.uy`, y `docs/legado/` titula el proyecto "ODDY Marketplace Builder". **"ODDY" no es un nombre muerto — es el nombre de marca externo/productivo bajo el que la app sigue publicada.** Esto no contradice DEC-007: la paleta *visual* ODDY que DEC-007 migró está confirmada independientemente como superada (el propio header de `brand.css` fecha el rebrand a Archivo en junio 2026, y `core-storefront.css` ya tiene su `--accent` alineado a `#3D5689`). Lo que este hallazgo aporta es que `#FF6835` podría ser, específicamente, el acento vigente de la experiencia de **storefront/checkout** (distinto del acento de **admin**), no un simple hardcode sin dueño. Migrar los 22 usos "CTA" a `--brand-madre` cambiaría visualmente cada botón de checkout — sería un rediseño, no una sustitución mecánica.

---

## B. Colores semánticos Tailwind

No es un solo hallazgo — son **tres sistemas distintos** mezclados bajo un mismo rótulo en la auditoría previa:

| Familia | Archivos / ocurrencias | Rol real | Duplica |
|---|---|---|---|
| Rojo (`#EF4444`/`#dc2626`/`#fef2f2`) | 19 archivos / 58+24+18 | **A. UI semantic state** (danger) — confirmado en `ToastProvider.tsx`, `SectionErrorBoundary.tsx`, `AddressCard.tsx`, `AdminArticulos.tsx` | `--color-danger` (rol, no valor exacto) |
| Ámbar (`#F59E0B`/`#92400e`/`#fffbeb`) | 9 archivos / 17+11+9 | **A. UI semantic state** (warning) | `--color-warning` (rol, no valor exacto) |
| Verde (`#166534`/`#f0fdf4`) | 18 archivos / 23+20 | **A. UI semantic state** (success) — un *segundo* verde, distinto del ya migrado `#1DC878` | `--color-success` (rol, no valor exacto) |
| Azul/violeta/cian (`#3B82F6`/`#8B5CF6`/`#06B6D4`) | 6+4+2 archivos | **D. categórico / tipo de nodo** — mapea profundidad de catálogo (`department`/`category`/`subcategory`/`node`) en `TreeNode.tsx`. **No hay librería de gráficos en el repo** (`recharts` ausente); es una codificación categórica hecha a mano, no un duplicado semántico | Ninguno — no confunde con danger/warning/success |
| Neutrales (`#374151`/`#F3F4F6`/`#D1D5DB`/`#EAECF0`/`#CBD5E1`/`#FAFAFA`/`#f1f5f9`) | 9–18 archivos c/u | **B. visual/content** (bordes, texto mute, superficies claras) | `--text-2`/`--border`/`--gray-*` (rol, no valor exacto — CORE usa neutros cálidos, Tailwind usa neutros fríos) |

No se asumió que "todo color Tailwind debe desaparecer": el grupo azul/violeta/cian **no debería migrarse a los tokens semánticos** — es un sistema distinto que, si se decide tokenizar, necesita su propio grupo de tokens categóricos, no una fusión con danger/warning/success/info.

---

## C. DM Sans

**14 archivos en `src/app`** (recuento de esta fase — la cifra "20+" previa incluía, sin distinguirlo, ~20 declaraciones adicionales *dentro* de `src/styles/core-storefront.css`, que es un archivo de estilos, no un componente).

| Ubicación | Uso | Es global | Duplica `--font-base` |
|---|---|---|---|
| `src/styles/fonts.css` | `body { font-family: 'Archivo', ... }` | **Sí — este es el default real de toda la app** | Es la fuente que `--font-base` representa |
| `src/styles/core-storefront.css` (self-titulado "ODDY Storefront — oddy.css") | ~20 selectores con `'DM Sans'` (+ `'Bebas Neue'`, `'JetBrains Mono'`) | Solo donde este stylesheet aplica | Sí, en paralelo |
| 14 componentes de `src/app` (`ErrorBoundary.tsx`, `AdminLayout.tsx` raíz, `EditorPage.tsx`, `AdminArticulos.tsx`, `AdminPublicaciones.tsx`, `AdminMisPublicaciones.tsx`, `AdminImport.tsx`, `PendingPage.tsx`, `DashboardLayout.tsx`, `MisPublicacionesPage.tsx`, `FailurePage.tsx`, `DashboardPage.tsx`, `SuccessPage.tsx`, `OrdenPage.tsx`) | `fontFamily: "DM Sans, sans-serif"` inline | Root-level en varios (incluido `AdminLayout.tsx`, la raíz del shell admin) | Sí — y como es inline, **gana la cascada sobre `body`**, o sea esas pantallas se renderizan en DM Sans hoy, no en Archivo |

**¿Qué fuente representa `--font-base` hoy?** `'Archivo'` — confirmado por `fonts.css`'s regla global y por el propio header de `brand.css` ("Rebrand: azul madre multirrubro · Archivo · Junio 2026", fechado). No se modificó `--font-base`.

**Evidencia de origen:** misma forma que el caso ODDY que DEC-007 ya aceptó — un archivo legado se auto-titula "ODDY Storefront" y usa la tipografía anterior al rebrand, mientras el token system documenta explícitamente la tipografía posterior al rebrand. Esto no decide el caso (sigue siendo Fase 1), pero es evidencia fuerte, no ambigüedad sin resolver.

---

## D. Brand.tsx

Auditado en su totalidad (`src/app/components/brand/Brand.tsx`, 134 líneas). **No es una única excepción documentada** — es una mezcla de tres categorías distintas:

**DESIGN TOKEN DUPLICATION (coincidencia exacta, migrable mecánicamente):**
- `BRAND.primary/.secondary/.accent/.gourmet` → `--brand-madre`/`--brand-navy`/`--color-success`/`--gourmet` (exactos)
- `LOGO_BG.tech/.home/.vestimenta/.entret/.servicios/.second/.gourmet` → `--tech`/`--home`/`--vestimenta`/`--entret`/`--servicios`/`--second`/`--gourmet` (exactos)
- En `StatusBadge`/`Toast`: `#F0EFEA`=`--canvas`, `#56544C`=`--text-2`, `#9B3326`=`--gourmet`, `#F8EEE4`=`--entret-tint`, `#EBEFF6`=`--madre-tint` (todos exactos)

**COMPONENT-SPECIFIC STATE (sin token, pasteles genuinamente sin equivalente):**
- `StatusBadge`: `#2A6B4B`, `#9A4B16` (colores de texto sobre fondo pastel, sin match)
- `Toast`: `#6BB87A` (ya señalado en DEC-007 como excepción), `#D98A80`, `#E0B48A`, `#2E4372`, `#9DB0D0`

**BRAND DATA:**
- `BRAND.name/.nameShort/.secondHand/.secondHandFull/.slogan` — texto, no color; sin relación con tokens.

Los tres componentes (`StatusBadge`, `SecondHandBadge`, `Toast`) están **vivos** (usados en `ProductCard.tsx`, `ToastProvider.tsx`, `AdminML.tsx`, `AdminProducts.tsx`) — cualquier cambio futuro debe preservar la coherencia visual del set de badges/toasts, no solo sustituir valor por valor. No se modificó el archivo.

---

## E. Radius debt

**195 declaraciones px-literal + ~150 con número sin unidad** (React `borderRadius: N`).

| Valor | Ocurrencias combinadas | Token exacto | Recomendación |
|---|---|---|---|
| `7px` / `7` | 32 | `--r-input` / `--radius-sm` | MIGRATE (candidato mecánico) |
| `9` (bare) | 8 | `--r-control` | MIGRATE (candidato mecánico) |
| `14px` | 7 | `--r-card` / `--radius-md` | MIGRATE (candidato mecánico) |
| `16px` | 6 | `--radius-xl` | MIGRATE (candidato mecánico) |
| `999` (bare, pill) | 6 | `--radius-pill` (100px) — no exacto pero funcionalmente idéntico | NEW DECISION REQUIRED (¿estandarizar 999→100px?) |
| `8px` | **91** | ninguno | TOKEN GAP — el clúster más grande, ninguna decisión tomada |
| `6px` | 69 | ninguno | TOKEN GAP |
| `10px` / `12px` | ~39 c/u | ninguno | TOKEN GAP |
| `20px` | 21 | ninguno | TOKEN GAP |
| `5px` | 25 | ninguno | TOKEN GAP |
| `4px` | 11 | ninguno | TOKEN GAP |
| `2px` | 4 | ninguno | TOKEN GAP |

No se crearon tokens ni se modificó código.

---

## F. Shadow debt

**41 declaraciones `boxShadow`/`box-shadow`.**

| Valor | Ocurrencias | Token exacto | Recomendación |
|---|---|---|---|
| `0 1px 3px rgba(0,0,0,.05)` (incl. variantes `0.05`) | 6 | `--sh-subtle` / `--shadow-sm` | MIGRATE (candidato mecánico) |
| `0 8px 24px rgba(0,0,0,.08)` | 1 | `--sh-card` / `--shadow-md` / `--shadow-card` | MIGRATE (candidato mecánico) |
| `0 4px 16px rgba(0,0,0,.1)` (+variantes) | 6 | ninguno | TOKEN GAP |
| `0 1px 4px rgba(0,0,0,.06)` (+variantes) | 5+2 | ninguno | TOKEN GAP |
| Resto (18 valores, mayormente únicos) | 1 c/u | ninguno | TOKEN GAP, mayormente sombras estructurales de un solo componente |

Sombras de componente (modales, overlays con `inset`) tienden a ser únicas; sombras genuinamente estructurales (cards, subtle) son las que sí matchean tokens exactos.

---

## G. Spacing debt

**268 declaraciones px-literal de `padding`/`margin`/`gap`**, más una población más grande — y de hecho **dominante** en este código — de shorthand rem (`"1rem"`, `"0.75rem 1rem"`, etc.). Coordenadas (`top`/`right`/`bottom`/`left`, 11 halladas) se mantuvieron **separadas**, tal como pide el brief — son posicionamiento dinámico, no candidatas de escala de espaciado.

| Población | Detalle |
|---|---|
| **DESIGN SYSTEM — coincidencia exacta** | `4px`→`--space-1` (60), `8px`→`--space-2` (23), `12px`→`--space-3` (6), `16px`/`32px`→`--space-4`/`--space-6` (2 c/u) |
| **DESIGN SYSTEM — sin token (debt)** | `2px` (57), `10px` (34), `3px` (21), `6px` (18), `5px` (17), `1px` (16) |
| **DESIGN SYSTEM — sin `var()` disponible en absoluto** | La población rem-shorthand (la más frecuente del código: `"1rem"` ×54, `"0.5rem"` ×48, `"0.75rem"` ×40, etc.). Aunque muchos valores caen limpio en la escala de 8px (`0.5rem`=8px, `1rem`=16px), hoy no existe ningún camino `var(--space-*)` para expresarlos — es un problema de convención de unidades, no solo de sustitución de valores. |
| **LAYOUT / DYNAMIC — excluido a propósito** | `top`/`right`/`bottom`/`left` (11) — coordenadas, no espaciado de sistema. |

No se intentó tokenizar coordenadas dinámicas, tal como se pidió.

---

## H. Parallel token systems — mapa arquitectónico

```
SYSTEM                          SOURCE OF TRUTH        DUPLICATES                          STATUS
─────────────────────────────────────────────────────────────────────────────────────────────────
Color de marca/marca madre      brand.css --brand-*     Brand.tsx BRAND/LOGO_BG              DUPLICATED (migrable)
Color semántico (success/…)     brand.css --color-*     ToastProvider + ~19 archivos Tailwind ROLE-DUPLICATED (no valor exacto)
Color categórico de catálogo    (no existe)              TreeNode.tsx TYPE_STYLE              SIN SISTEMA — no es duplicado, es hueco
Acento storefront (#FF6835)     (no existe)              22 archivos public/checkout          SIN SISTEMA — candidato a nuevo token
Identidad de canal externo      (no existe, ni debe)      SourceBadge (oddy/MP/PayPal/ML)      CORRECTO tal cual — no tokenizar
Tipografía                      brand.css --font-base    core-storefront.css + 14 archivos    DUPLICATED (evidencia fuerte, no migrado)
Radio                           brand.css --r-*/--radius-* 4 valores exactos + ~250 sin match TOKEN GAP mayoritario
Sombra                          brand.css --sh-*/--shadow-* 2 valores exactos + ~39 sin match TOKEN GAP mayoritario
Espaciado (px)                  brand.css --space-*      ~90 valores exactos + ~150 sin match TOKEN GAP parcial
Espaciado (rem, dominante)      (no existe convención)    rem-string shorthand en toda la app  SIN SISTEMA — hueco de convención
Grises neutros                  brand.css --gray-*        Tailwind neutral hex (7 archivos+)   ROLE-DUPLICATED (no valor exacto)
```

---

## I. Recommendations (por prioridad)

**P0 — decisiones humanas requeridas antes de cualquier migración (bloquean código, no bloquean nada más):**
1. `#FF6835`: ¿es el acento oficial del storefront (nuevo token) o debe unificarse con `--brand-madre` (rediseño)? — 22 ocurrencias en espera.
2. DM Sans → `--font-base`: evidencia fuerte de que es legado pre-rebrand; falta el "sí" humano para migrar 14 archivos + `core-storefront.css`.
3. Danger/warning/success Tailwind → `--color-*`: confirmar si el cambio de valor (rojo/ámbar/verde Tailwind → los tonos CORE) es aceptable visualmente.

**P1 — decisiones de sistema, menor urgencia visual:**
4. Esquema categórico azul/violeta/cian de `TreeNode.tsx`: ¿formalizar como grupo de tokens categóricos o dejar como está?
5. Grises neutros Tailwind → `--gray-*`/`--border`/`--text-2`: mismo patrón "rol sí, valor no" que el punto 3.
6. Grupo de tokens badge/toast para los pasteles de `Brand.tsx` (`#2A6B4B`, `#9A4B16`, `#6BB87A`, etc.) — ya señalado, aún sin resolver.

**P2 — migraciones mecánicas de bajo riesgo, listas para ejecutar cuando se autorice el código (no en esta fase):**
7. `Brand.tsx`'s `BRAND`/`LOGO_BG` → reemplazo directo por `var(--token)` (100% coincidencia exacta).
8. Radius: `7px`/`9`(bare)/`14px`/`16px` → tokens exactos.
9. Shadow: `0 1px 3px rgba(0,0,0,.05)` y `0 8px 24px rgba(0,0,0,.08)` → tokens exactos.
10. Spacing px: `4px`/`8px`/`12px`/`16px`/`32px` → `--space-*` exactos.

**P3 — deuda documentada, sin acción propuesta esta fase:**
11. El resto del debt de radius/shadow/spacing sin token (el volumen mayoritario) — requiere decidir si se crean tokens nuevos, no solo sustituir.
12. Convención de unidades para el spacing rem-shorthand dominante.
13. `#FF6835` en `AdminCatalog.tsx` (default de dato) y en `SourceBadge` (dato externo) — **no son candidatos de migración**, se documentan para que no se confundan con los 22 usos de CTA en una futura pasada mecánica.

---

## J. DEC-008

**Estado: PROPOSED.** No implementado. Ningún código fue tocado en esta fase. El detalle completo de evidencia por hallazgo vive en `.agent/DECISIONS.md` (sección "DEC-008 — Fase 5"); este documento es el resumen entregable.

---

## Respuestas al criterio de éxito

1. **¿Qué es #FF6835?** Tres cosas: dato de marca externa (1), default de dato de usuario (1), probable acento deliberado del storefront/checkout (22) — no un hardcode homogéneo.
2. **¿Debe convertirse en token?** Los 22 usos de CTA, probablemente sí — como token *nuevo*, no como migración a `--brand-madre`. Los otros 2 no deben tokenizarse nunca.
3. **¿Qué colores Tailwind son realmente semantic states?** Rojo/ámbar/un verde (danger/warning/success). Azul/violeta/cian **no** — son categóricos. Los neutros duplican rol, no valor.
4. **¿DM Sans pertenece a CORE o es legacy?** Evidencia fuerte de que es legacy pre-rebrand (mismo patrón que el caso ODDY ya aceptado en DEC-007), pendiente de aprobación humana para migrar.
5. **¿Brand.tsx debe seguir existiendo como fuente local?** Sí para `BRAND`/`LOGO_BG` en su forma actual (aunque los valores deberían consumir tokens); los pasteles de badge/toast son legítimamente locales — no tienen equivalente en CSS todavía.
6. **¿Mayores grupos de radius/shadow/spacing duplicados?** `8px` de radius (91 ocurrencias, sin token) es el clúster individual más grande de toda la auditoría; en spacing, el shorthand rem es el volumen dominante y no tiene ningún camino de tokenización hoy.
7. **¿Cuál debe ser la siguiente migración?** Si se prioriza por evidencia + bajo riesgo: DM Sans → `--font-base` (P0, evidencia fuerte) y `Brand.tsx`'s `BRAND`/`LOGO_BG` (P2, coincidencia exacta) son los candidatos más limpios para una Fase 3 futura.
8. **¿Qué NO debe tocarse?** El trío ODDY ya migrado (DEC-007, no reabierto), `SourceBadge`'s colores de canal externo, el default de `AdminCatalog.tsx` (es dato, no chrome), y los pasteles genuinamente sin token de `Brand.tsx`.
