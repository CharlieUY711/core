// ═══════════════════════════════════════════════════════════
// CORE Design System — Brand Theme Template
// Usar como base para themes de clientes
// ═══════════════════════════════════════════════════════════
import { defaultTheme } from './default';

export const brand1Theme = {
  ...defaultTheme,
  name: 'brand-1',

  colors: {
    ...defaultTheme.colors,
    // Override brand colors here
    navBg:   '#YOUR_BRAND_COLOR',
    accent:  '#YOUR_ACCENT_COLOR',
    primary: '#YOUR_PRIMARY_COLOR',
  },
} as const;
