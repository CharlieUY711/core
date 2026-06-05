# CORE Design System v1.0

**Versión:** 1.0 · Junio 2026 · Confidencial — Uso interno

---

## 1. Filosofía

- **Un único origen de verdad** — todos los valores visuales viven en `tokens.ts`
- **Sin colores hardcodeados** — ninguna app importa hexadecimales directamente
- **Themes extensibles** — cada tienda o cliente puede tener su propio theme
- **Second Hand preservado** — identidad verde completamente separada

---

## 2. Estructura

```
C:\CORE\
├── Design/
│   ├── tokens/
│   │   └── tokens.ts          ← fuente de verdad
│   ├── themes/
│   │   ├── default.ts         ← CORE Market
│   │   ├── second-hand.ts     ← Second Hand verde
│   │   └── brand-1.ts         ← template para clientes
│   └── docs/
│       ├── design-system.md   ← este archivo
│       └── custom-themes.md   ← guía de customización
│
└── packages/
    ├── core-design/           ← @core/design
    │   └── src/index.ts
    └── core-ui/               ← @core/ui
        └── src/
            ├── index.ts
            └── components/
                ├── Button.tsx
                ├── Card.tsx
                ├── Input.tsx
                └── Badge.tsx
```

---

## 3. Tokens

Los tokens se organizan en 8 categorías:

| Categoría | Descripción |
|-----------|-------------|
| `colors` | Paleta completa CORE + Second Hand |
| `typography` | Familias, pesos, tamaños, line-height |
| `spacing` | Escala 4/8/12/16/24/32px |
| `radius` | sm/md/lg/xl/pill |
| `shadows` | soft/medium/strong/card/focus |
| `motion` | Duraciones, easings, transiciones |
| `components` | Tokens por componente (button, card, input...) |
| `breakpoints` | sm/md/lg/xl/2xl |

---

## 4. Themes

Cada theme extiende los tokens base y sobreescribe solo lo necesario:

```typescript
import { tokens } from '../tokens/tokens';
import { defaultTheme } from './default';

export const myTheme = {
  ...defaultTheme,
  name: 'my-theme',
  colors: {
    ...defaultTheme.colors,
    navBg: '#MY_COLOR',
    accent: '#MY_ACCENT',
  },
};
```

---

## 5. @core/ui

Importar componentes:

```typescript
import { Button, Card, Input, Badge } from '@core/ui';
import { tokens, defaultTheme, secondHandTheme } from '@core/design';
```

---

## 6. Integración por app

### core-market
```typescript
import { tokens } from '@core/design';
// Usar tokens.colors.navy en lugar de '#0D2B55'
```

### core-landing
```typescript
import { defaultTheme } from '@core/design';
const bg = defaultTheme.colors.bg;
```

---

## 7. Second Hand

Todo lo de Second Hand usa `secondHandTheme` o `tokens.colors.sh.*`:

```typescript
import { secondHandTheme, tokens } from '@core/design';

const navColor = secondHandTheme.colors.navBg; // #1D9E75
const btnColor = tokens.colors.sh.soft;         // #4ECBA0
```

**Regla:** nunca usar `tokens.colors.navy` o `tokens.colors.gold` en Second Hand.

---

*CORE Design System v1.0 · Junio 2026*
