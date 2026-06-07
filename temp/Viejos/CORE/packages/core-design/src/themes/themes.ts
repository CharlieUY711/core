// ═══════════════════════════════════════════════════════════════
// CORE Design System — Themes v1.0
// 
// ARQUITECTURA:
//   2 estéticas  ×  2 definiciones de color  =  combinaciones flexibles
//
// ESTÉTICA 1 — dark/corporate (core.com.uy, Biblioteca, workspace, Foundation)
// ESTÉTICA 2 — light/marketplace (market.core.com.uy, second)
//
// DEFINICIÓN 1 — CORE colors (navy, blue, gold, green)
// DEFINICIÓN 2 — Secondary colors (green primario, teal, white)
//
// USO ACTUAL:
//   core.com.uy     → estética 1 + definición 1
//   market          → estética 2 + definición 1
//   second          → estética 2 + definición 2
// ═══════════════════════════════════════════════════════════════

// ── DEFINICIÓN 1 — CORE Colors ───────────────────────────────
export const colorsCORE = {
  // Primario
  primary:        '#1b5ac4',   // azul CORE
  primaryHover:   '#3b82f6',
  primaryLight:   '#7db8f7',
  primaryPale:    'rgba(27,90,196,0.15)',

  // Acento gold
  accent:         '#c9993a',
  accentLight:    '#f5c870',
  accentPale:     'rgba(201,153,58,0.1)',

  // Verde — líneas, badges activos, estados positivos
  green:          '#1D9E75',
  greenHover:     '#16845F',
  greenLight:     '#4ECBA0',
  greenPale:      'rgba(29,158,117,0.1)',
  greenBorder:    'rgba(29,158,117,0.3)',

  // Fondos dark
  bg:             '#0A1F3D',
  bgCard:         'rgba(15,56,117,0.12)',
  bgCardHover:    'rgba(27,90,196,0.22)',
  bgSurface:      '#1e2d42',

  // Bordes
  border:         '#1e3354',
  borderHover:    'rgba(59,130,246,0.4)',

  // Texto
  text:           '#ffffff',
  textSecond:     '#8fa3bf',
  textMuted:      '#4a6080',

  // Semánticos
  success:        '#4ade80',
  danger:         '#ef4444',
  warning:        '#f5c870',
} as const

// ── DEFINICIÓN 2 — Secondary Colors (Second Hand / Marketplace verde) ─
export const colorsSECOND = {
  // Primario — verde
  primary:        '#1D9E75',
  primaryHover:   '#16845F',
  primaryLight:   '#4ECBA0',
  primaryPale:    'rgba(29,158,117,0.08)',
  primaryDark:    '#0D6B4E',

  // Acento — teal
  accent:         '#0D7377',
  accentLight:    '#14A085',
  accentPale:     'rgba(13,115,119,0.1)',

  // Azul CORE — secundario en esta definición
  blue:           '#1b5ac4',
  blueHover:      '#3b82f6',

  // Fondos light
  bg:             '#f0f4f8',   // fondo body marketplace
  bgCard:         '#ffffff',
  bgCardHover:    '#f8fffe',
  bgSurface:      '#ffffff',

  // Bordes
  border:         '#e2e8f0',
  borderHover:    'rgba(29,158,117,0.4)',

  // Texto
  text:           '#0D2B55',   // navy para texto en fondo claro
  textSecond:     '#4a6080',
  textMuted:      '#94a3b8',

  // Semánticos
  success:        '#1D9E75',
  danger:         '#ef4444',
  warning:        '#f59e0b',
} as const

// ── ESTÉTICA 1 — Dark / Corporate ────────────────────────────
export const aestheticDark = {
  name:            'dark',
  bodyBg:          colorsCORE.bg,
  bodyColor:       colorsCORE.text,
  fontFamily:      "'Geist', 'Inter', system-ui, sans-serif",
  fontMono:        "'Geist Mono', 'Courier New', monospace",

  navbar: {
    bg:            colorsCORE.bg,
    bgScrolled:    'rgba(10,31,61,0.90)',
    backdropBlur:  true,
    borderBottom:  colorsCORE.border,
    text:          colorsCORE.textSecond,
    textHover:     colorsCORE.text,
    height:        '56px',
  },

  card: {
    bg:            colorsCORE.bgCard,
    bgHover:       colorsCORE.bgCardHover,
    border:        colorsCORE.border,
    borderHover:   colorsCORE.borderHover,
    radius:        '16px',
    shadow:        '0 2px 8px rgba(0,0,0,.2)',
    shadowHover:   '0 8px 24px rgba(0,0,0,.3)',
  },

  input: {
    bg:            '#1e2d42',
    border:        colorsCORE.border,
    borderFocus:   colorsCORE.primary,
    text:          colorsCORE.text,
    placeholder:   colorsCORE.textMuted,
    radius:        '8px',
  },

  button: {
    primary: {
      bg:          colorsCORE.primary,
      bgHover:     colorsCORE.primaryHover,
      text:        '#ffffff',
      shadow:      '0 8px 24px rgba(27,90,196,.3)',
    },
    ghost: {
      bg:          'transparent',
      bgHover:     'rgba(15,56,117,0.18)',
      border:      colorsCORE.border,
      borderHover: 'rgba(59,130,246,0.4)',
      text:        colorsCORE.textSecond,
      textHover:   colorsCORE.text,
    },
  },

  // Separadores decorativos — línea horizontal con gradiente
  divider:         'linear-gradient(90deg, transparent, rgba(27,90,196,0.3), transparent)',
  // Verde como línea de acento (debajo del logo, indicadores activos)
  accentLine:      colorsCORE.green,
} as const

// ── ESTÉTICA 2 — Light / Marketplace ─────────────────────────
export const aestheticLight = {
  name:            'light',
  bodyBg:          colorsSECOND.bg,
  bodyColor:       colorsSECOND.text,
  fontFamily:      "'Geist', 'Inter', system-ui, sans-serif",
  fontMono:        "'Geist Mono', 'Courier New', monospace",

  navbar: {
    // El color de la navbar varía según la definición de color activa
    // Definición 1 (MARKET): verde #1D9E75
    // Definición 2 (SECOND): navy #0D2B55
    bg:            colorsSECOND.primary,   // verde para MARKET
    bgDef1:        colorsCORE.green,       // verde con def1
    bgDef2:        colorsSECOND.primaryDark, // verde oscuro con def2
    text:          '#ffffff',
    height:        '56px',
    borderBottom:  'none',
  },

  card: {
    bg:            colorsSECOND.bgCard,
    bgHover:       colorsSECOND.bgCardHover,
    border:        colorsSECOND.border,
    borderHover:   colorsSECOND.borderHover,
    radius:        '12px',
    shadow:        '0 1px 4px rgba(0,0,0,.08)',
    shadowHover:   '0 4px 16px rgba(0,0,0,.12)',
  },

  input: {
    bg:            '#ffffff',
    border:        colorsSECOND.border,
    borderFocus:   colorsSECOND.primary,
    text:          colorsSECOND.text,
    placeholder:   colorsSECOND.textMuted,
    radius:        '6px',
  },

  button: {
    primary: {
      bg:          colorsSECOND.blue,      // azul CORE para CTA principal
      bgHover:     '#3b82f6',
      text:        '#ffffff',
      shadow:      'none',
    },
    accent: {
      bg:          colorsSECOND.primary,   // verde para acciones secundarias
      bgHover:     colorsSECOND.primaryHover,
      text:        '#ffffff',
      shadow:      'none',
    },
    ghost: {
      bg:          'transparent',
      bgHover:     colorsSECOND.primaryPale,
      border:      colorsSECOND.border,
      text:        colorsSECOND.textSecond,
      textHover:   colorsSECOND.text,
    },
  },

  divider:         `1px solid ${colorsSECOND.border}`,
  accentLine:      colorsSECOND.primary,
} as const

// ── COMBINACIONES OFICIALES ───────────────────────────────────
export const themes = {
  // core.com.uy — dark + CORE colors
  'core':        { aesthetic: aestheticDark,  colors: colorsCORE   },
  // Biblioteca, workspace, Foundation — dark + CORE colors
  'internal':    { aesthetic: aestheticDark,  colors: colorsCORE   },
  // market.core.com.uy — light + CORE colors (verde navbar)
  'market':      { aesthetic: aestheticLight, colors: colorsCORE   },
  // second — light + Secondary colors (verde más prominente)
  'second':      { aesthetic: aestheticLight, colors: colorsSECOND },
} as const

export type ThemeName = keyof typeof themes
export type AestheticDark  = typeof aestheticDark
export type AestheticLight = typeof aestheticLight
export type ColorsCORE     = typeof colorsCORE
export type ColorsSECOND   = typeof colorsSECOND


