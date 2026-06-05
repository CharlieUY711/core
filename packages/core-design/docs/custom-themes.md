# CORE Custom Themes — Guía de Customización

---

## Crear un theme nuevo

1. Crear `C:\CORE\Design\themes\mi-cliente.ts`
2. Importar `defaultTheme`
3. Sobreescribir solo los valores necesarios

```typescript
import { defaultTheme } from './default';

export const miClienteTheme = {
  ...defaultTheme,
  name: 'mi-cliente',
  colors: {
    ...defaultTheme.colors,
    navBg:   '#2C3E50',
    accent:  '#E74C3C',
    primary: '#2980B9',
  },
};
```

---

## Asignar a una tienda

En la base de datos, agregar `theme_code` a la tabla `entities`:

```sql
UPDATE entities SET metadata = jsonb_set(metadata, '{theme}', '"mi-cliente"') WHERE code = 'MI_CLIENTE';
```

En el frontend, cargar el theme según el `entity_id` del seller.

---

## Extender tokens

```typescript
import { tokens } from '@core/design';

export const extendedTokens = {
  ...tokens,
  colors: {
    ...tokens.colors,
    brand: '#FF6B6B',
  },
};
```

---

## Sobreescribir colores

Solo sobreescribir en el theme, nunca en los tokens base.

---

## Mantener compatibilidad

- Siempre extender con spread `...defaultTheme`
- Nunca eliminar keys existentes
- Nuevas keys van al final

---

*CORE Custom Themes Guide v1.0 · Junio 2026*
