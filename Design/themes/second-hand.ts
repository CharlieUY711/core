// ═══════════════════════════════════════════════════════════
// CORE Design System — Second Hand Theme
// Identidad verde — NO usar colores CORE en este theme
// ═══════════════════════════════════════════════════════════
import { tokens } from '../tokens/tokens';
import { defaultTheme } from './default';

export const secondHandTheme = {
  ...defaultTheme,
  name: 'second-hand',

  colors: {
    ...defaultTheme.colors,

    // Nav verde Second Hand
    navBg:       tokens.colors.sh.primary,

    // Accent verde
    accent:      tokens.colors.sh.primary,
    accentHover: tokens.colors.sh.primaryHover,
    primary:     tokens.colors.sh.primary,
    primaryHover:tokens.colors.sh.dark,

    // Backgrounds
    bg:          tokens.colors.grayLight,
    surface:     tokens.colors.white,
    surfaceAlt:  tokens.colors.sh.pale,

    // Separador opuesto al modo
    separator:   tokens.colors.blue,

    // Button usuario
    userButton:  tokens.colors.sh.soft,
  },

  components: {
    ...defaultTheme.components,
    button: {
      ...defaultTheme.components.button,
    },
    navbar: {
      ...defaultTheme.components.navbar,
      bgSecondHand: tokens.colors.sh.primary,
    },
  },
} as const;

export type SecondHandTheme = typeof secondHandTheme;
