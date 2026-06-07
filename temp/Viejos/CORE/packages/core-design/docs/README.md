# @core/design

Fuente única de verdad visual del ecosistema CORE.

**Regla fundamental:** Ninguna app define colores, tipografías, logos ni favicons propios. Todo viene de aquí.

---

## Estructura

```
packages/core-design/
├── public/
│   ├── favicon.svg       ← favicon oficial (C azul navy)
│   ├── logo.svg          ← logotipo completo
│   └── logo-white.svg    ← logotipo para fondos oscuros
├── src/
│   ├── tokens/
│   │   └── tokens.ts     ← colores, tipografía, espaciado, etc.
│   ├── themes/
│   │   ├── brand.ts      ← identidad de marca CORE
│   │   ├── default.ts    ← tema light
│   │   └── second-hand.ts← tema submarca Second Hand
│   ├── globals/
│   │   └── globals.css   ← CSS base único para todas las apps
│   └── index.ts          ← exports públicos
├── sync-assets.ps1        ← sincroniza assets a todas las apps
└── docs/
    ├── design-system.md
    └── custom-themes.md
```

---

## Uso en una app

### 1. Importar tokens en TypeScript

```ts
import { tokens, brand, colors } from '@core/design'

// Usar colores
const primary = colors.navy        // #1B3A6B
const accent  = colors.gold        // #C9A84C

// Usar brand
const appName = brand.name         // 'CORE'
const favicon = brand.assets.favicon // '/favicon.svg'
```

### 2. Importar CSS global

En el `globals.css` de cada app, reemplazar todo el contenido con:

```css
@import '@core/design/globals';
```

O si la app usa Tailwind directamente:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
@import '@core/design/globals';
```

### 3. Sincronizar assets visuales

Desde la raíz del monorepo (`C:\CORE`):

```powershell
.\packages\core-design\sync-assets.ps1
```

Esto copia `favicon.svg`, `logo.svg` y `logo-white.svg` a `public/` de todas las apps.

---

## Paleta de colores principal

| Token | Hex | Uso |
|---|---|---|
| `colors.navy` | `#1B3A6B` | Identidad principal, favicon |
| `colors.navyDark` | `#0D2B55` | Navbar, headers |
| `colors.gold` | `#C9A84C` | Acento, badges, highlights |
| `colors.blue` | `#1A4F9C` | Links, CTAs |
| `colors.success` | `#1D9E75` | Estados positivos |
| `colors.danger` | `#C0392B` | Errores, alertas |

---

## Actualizar un asset

1. Modificar el archivo en `packages/core-design/public/` o `src/`
2. Ejecutar `sync-assets.ps1` desde `C:\CORE`
3. Commitear en el monorepo raíz: `git add packages/ && git commit -m "design: ..."`

---

v1.1 — 2026 | CORE
