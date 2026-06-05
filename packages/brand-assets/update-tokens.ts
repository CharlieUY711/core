// ═══════════════════════════════════════════════════════════════
// CORE Design System — tokens v1.2
// Actualizado con valores reales de core.com.uy
// ═══════════════════════════════════════════════════════════════

export const colors = {

  // ── Brand — extraídos de core.com.uy ─────────────────────
  // Fondo principal de la landing
  bgDeep:      '#0A1F3D',   // fondo hero y página
  bgDark:      '#1e2d42',   // cards, navbar scrolled
  bgCard:      'rgba(15,56,117,0.12)',  // cards con tinte blue
  bgCardHover: 'rgba(27,90,196,0.22)', // cards hover

  // Blues
  blue:        '#1b5ac4',   // CTA principal, botones
  blueHover:   '#3b82f6',   // hover sobre blue
  blueLight:   '#7db8f7',   // textos secundarios azules, subtítulos
  bluePale:    'rgba(59,130,246,0.15)', // fondos info

  // Borders / separadores
  border:      '#1e3354',   // bordes de cards
  borderHover: 'rgba(59,130,246,0.4)', // bordes hover

  // Gold / Amber — acento
  gold:        '#c9993a',   // acento principal
  goldLight:   '#f5c870',   // gradiente gold claro
  goldPale:    'rgba(201,153,58,0.1)', // fondos gold

  // Textos
  textPrimary: '#ffffff',
  textSecond:  '#8fa3bf',   // textos secundarios
  textMuted:   '#4a6080',   // textos muy tenues

  // Semánticos
  success:     '#4ade80',   // verde live / positivo
  danger:      '#ef4444',
  warning:     '#f5c870',

  // Legacy (mantener compatibilidad)
  navy:        '#0A1F3D',
  navyDark:    '#0D2B55',

} as const

export const typography = {
  family: {
    base:    "'Geist', 'Inter', system-ui, sans-serif",
    mono:    "'Geist Mono', 'Courier New', monospace",
    display: "'Geist', system-ui, sans-serif",
  },
  weight: {
    light:    300,
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    black:    800,
  },
  size: {
    xs:      '0.6rem',
    sm:      '0.75rem',
    md:      '0.875rem',
    base:    '1rem',
    lg:      '1.125rem',
    xl:      '1.25rem',
    '2xl':   '1.5rem',
    '3xl':   '2rem',
    '4xl':   '3rem',
    '5xl':   '4rem',
    hero:    'clamp(3rem, 7vw, 5rem)',
  },
  letterSpacing: {
    tight:   '-0.02em',
    normal:  '0',
    mono:    '0.15em',   // para labels mono uppercase
    wide:    '0.05em',
    wider:   '0.08em',
  },
} as const

export const spacing = {
  0:  '0',     1:  '4px',   2:  '8px',
  3:  '12px',  4:  '16px',  5:  '20px',
  6:  '24px',  7:  '28px',  8:  '32px',
  10: '40px',  12: '48px',  16: '64px',
  20: '80px',  24: '96px',  28: '112px',
} as const

export const radius = {
  none:   '0',
  sm:     '4px',
  md:     '8px',
  lg:     '12px',
  xl:     '16px',
  '2xl':  '24px',
  pill:   '9999px',
} as const

export const shadows = {
  none:     'none',
  card:     '0 2px 8px rgba(0,0,0,.2)',
  cardHover:'0 8px 24px rgba(0,0,0,.3)',
  blue:     '0 8px 24px rgba(27,90,196,.3)',
  gold:     '0 8px 24px rgba(201,153,58,.2)',
  focus:    '0 0 0 3px rgba(27,90,196,.4)',
} as const

export const motion = {
  duration: {
    fast:    '150ms',
    normal:  '200ms',
    slow:    '300ms',
    slower:  '500ms',
  },
  easing: {
    default: 'ease-in-out',
    spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const

export const breakpoints = {
  sm:   '640px',
  md:   '768px',
  lg:   '1024px',
  xl:   '1280px',
  '2xl':'1536px',
} as const

export const layout = {
  maxWidth:     '1280px',  // max-w-7xl de la landing
  sidebarWidth: '220px',
  navbarHeight: '56px',
  paddingX:     spacing[6],
} as const

// ── Identidad por producto ────────────────────────────────────
export const products = {
  core:         { name: 'CORE',        initial: 'C', bg: '#1b5ac4', byline: 'Global Supply. Regional Growth.' },
  market:       { name: 'MARKET',      initial: 'M', bg: '#1b5ac4', byline: 'by CORE' },
  biblio:       { name: 'BIBLIOTECA',  initial: 'B', bg: '#0A1F3D', byline: 'by CORE' },
  foundation:   { name: 'FOUNDATION',  initial: 'F', bg: '#0A1F3D', byline: 'by CORE' },
  hub:          { name: 'HUB',         initial: 'H', bg: '#0A1F3D', byline: 'by CORE' },
  marketing:    { name: 'MARKETING',   initial: 'M', bg: '#1b5ac4', byline: 'by CORE' },
  logistics:    { name: 'LOGISTICS',   initial: 'L', bg: '#1b5ac4', byline: 'by CORE' },
  customs:      { name: 'CUSTOMS',     initial: 'C', bg: '#0A1F3D', byline: 'by CORE' },
  intelligence: { name: 'INTELLIGENCE',initial: 'I', bg: '#1b5ac4', byline: 'by CORE' },
  finance:      { name: 'FINANCE',     initial: 'F', bg: '#0A1F3D', byline: 'by CORE' },
} as const

export const tokens = {
  colors, typography, spacing, radius,
  shadows, motion, breakpoints, layout, products,
} as const

export type Tokens = typeof tokens
