// ═══════════════════════════════════════════════════════════
// CORE Design System — Default Theme (CORE Market)
// ═══════════════════════════════════════════════════════════
import { tokens } from '../tokens/tokens';

export const defaultTheme = {
  name: 'core-market',

  colors: {
    // Backgrounds
    bg:          tokens.colors.grayLight,
    surface:     tokens.colors.white,
    navBg:       tokens.colors.navy,

    // Text
    text:        tokens.colors.navy,
    textMuted:   tokens.colors.grayMid,
    textInverse: tokens.colors.white,

    // Accents
    accent:      tokens.colors.gold,
    accentHover: tokens.colors.goldDark,
    primary:     tokens.colors.blue,
    primaryHover:tokens.colors.navy,

    // Borders
    border:      tokens.colors.grayBorder,
    borderFocus: tokens.colors.blueLight,

    // States
    error:       tokens.colors.red,
    errorBg:     tokens.colors.redLight,
    success:     tokens.colors.green,
    successBg:   tokens.colors.greenLight,
    warning:     tokens.colors.amber,
    warningBg:   tokens.colors.amberLight,

    // Separador entre header y menu
    separator:   tokens.colors.sh.primary,
  },

  typography: tokens.typography,
  spacing:    tokens.spacing,
  radius:     tokens.radius,
  shadows:    tokens.shadows,
  motion:     tokens.motion,
  components: tokens.components,
  breakpoints:tokens.breakpoints,
} as const;

export type DefaultTheme = typeof defaultTheme;
