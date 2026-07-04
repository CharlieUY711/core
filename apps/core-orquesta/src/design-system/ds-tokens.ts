// ═══════════════════════════════════════════════════════════════════
//  ORQUESTADOR DESIGN SYSTEM — TOKENS
// ═══════════════════════════════════════════════════════════════════

// ── Colors ─────────────────────────────────────────────────────────
export interface ColorSwatch { shade: string; hex: string; text: string; tag?: string; }
export interface ColorGroup  { name: string; token: string; swatches: ColorSwatch[]; }

export const COLOR_GROUPS: ColorGroup[] = [
  {
    name: "Primario — Azul",
    token: "--color-primary",
    swatches: [
      { shade: "50",  hex: "#EFF6FF", text: "#1D4ED8" },
      { shade: "100", hex: "#DBEAFE", text: "#1D4ED8" },
      { shade: "200", hex: "#BFDBFE", text: "#1D4ED8" },
      { shade: "300", hex: "#93C5FD", text: "#1E40AF" },
      { shade: "400", hex: "#60A5FA", text: "#1E40AF" },
      { shade: "500", hex: "#3B82F6", text: "#ffffff", tag: "info" },
      { shade: "600", hex: "#2563EB", text: "#ffffff", tag: "primary" },
      { shade: "700", hex: "#1D4ED8", text: "#ffffff" },
      { shade: "800", hex: "#1E40AF", text: "#ffffff" },
      { shade: "900", hex: "#1E3A8A", text: "#ffffff" },
    ],
  },
  {
    name: "Secundario — Verde",
    token: "--color-secondary",
    swatches: [
      { shade: "50",  hex: "#ECFDF5", text: "#065F46" },
      { shade: "100", hex: "#D1FAE5", text: "#065F46" },
      { shade: "200", hex: "#A7F3D0", text: "#064E3B" },
      { shade: "300", hex: "#6EE7B7", text: "#064E3B" },
      { shade: "400", hex: "#34D399", text: "#064E3B" },
      { shade: "500", hex: "#10B981", text: "#ffffff", tag: "active" },
      { shade: "600", hex: "#059669", text: "#ffffff", tag: "secondary" },
      { shade: "700", hex: "#047857", text: "#ffffff" },
      { shade: "800", hex: "#065F46", text: "#ffffff" },
      { shade: "900", hex: "#064E3B", text: "#ffffff" },
    ],
  },
  {
    name: "Neutrales — Slate",
    token: "--color-neutral",
    swatches: [
      { shade: "50",  hex: "#F8FAFC", text: "#374151" },
      { shade: "100", hex: "#F3F4F6", text: "#374151", tag: "bg-alt" },
      { shade: "200", hex: "#E5E7EB", text: "#374151", tag: "border" },
      { shade: "300", hex: "#D1D5DB", text: "#374151" },
      { shade: "400", hex: "#9CA3AF", text: "#ffffff" },
      { shade: "500", hex: "#6B7280", text: "#ffffff", tag: "muted" },
      { shade: "600", hex: "#4B5563", text: "#ffffff" },
      { shade: "700", hex: "#374151", text: "#ffffff", tag: "body" },
      { shade: "800", hex: "#1F2937", text: "#ffffff" },
      { shade: "900", hex: "#111827", text: "#ffffff", tag: "heading" },
    ],
  },
  {
    name: "Estado — Éxito",
    token: "--color-success",
    swatches: [
      { shade: "50",  hex: "#F0FDF4", text: "#166534" },
      { shade: "100", hex: "#DCFCE7", text: "#166534" },
      { shade: "500", hex: "#22C55E", text: "#ffffff", tag: "success" },
      { shade: "600", hex: "#16A34A", text: "#ffffff" },
      { shade: "700", hex: "#15803D", text: "#ffffff" },
    ],
  },
  {
    name: "Estado — Advertencia",
    token: "--color-warning",
    swatches: [
      { shade: "50",  hex: "#FFFBEB", text: "#92400E" },
      { shade: "100", hex: "#FEF3C7", text: "#92400E" },
      { shade: "500", hex: "#F59E0B", text: "#ffffff", tag: "warning" },
      { shade: "600", hex: "#D97706", text: "#ffffff" },
      { shade: "700", hex: "#B45309", text: "#ffffff" },
    ],
  },
  {
    name: "Estado — Error",
    token: "--color-error",
    swatches: [
      { shade: "50",  hex: "#FEF2F2", text: "#991B1B" },
      { shade: "100", hex: "#FEE2E2", text: "#991B1B" },
      { shade: "500", hex: "#EF4444", text: "#ffffff", tag: "error" },
      { shade: "600", hex: "#DC2626", text: "#ffffff" },
      { shade: "700", hex: "#B91C1C", text: "#ffffff" },
    ],
  },
  {
    name: "UI Oscura — Dashboard",
    token: "--color-ui",
    swatches: [
      { shade: "bg",     hex: "#0B1120", text: "#94A3B8", tag: "app-bg" },
      { shade: "panel",  hex: "#111827", text: "#94A3B8", tag: "panel" },
      { shade: "card",   hex: "#1A2332", text: "#E2E8F0", tag: "card" },
      { shade: "border", hex: "#1E293B", text: "#E2E8F0", tag: "border" },
      { shade: "hover",  hex: "#243044", text: "#E2E8F0", tag: "hover" },
    ],
  },
];

// ── Typography ─────────────────────────────────────────────────────
export interface TypeScale { name: string; size: string; remSize: string; weight: string; lineHeight: string; letterSpacing?: string; sample: string; mono?: boolean; }

export const TYPE_SCALE: TypeScale[] = [
  { name: "Display",  size: "36px",  remSize: "2.25rem", weight: "700", lineHeight: "1.2",  sample: "Orquestador Intelligence Suite" },
  { name: "H1",       size: "30px",  remSize: "1.875rem",weight: "600", lineHeight: "1.3",  sample: "Panel de Motores Enchufables" },
  { name: "H2",       size: "24px",  remSize: "1.5rem",  weight: "600", lineHeight: "1.35", sample: "Configuración del Motor" },
  { name: "H3",       size: "20px",  remSize: "1.25rem", weight: "600", lineHeight: "1.4",  sample: "Señales Detectadas" },
  { name: "H4",       size: "16px",  remSize: "1rem",    weight: "600", lineHeight: "1.5",  sample: "TechCorp Uruguay S.A." },
  { name: "Body",     size: "14px",  remSize: "0.875rem",weight: "400", lineHeight: "1.6",  sample: "El motor detectó 3 nuevas señales en los últimos 30 minutos durante el ciclo de análisis." },
  { name: "Small",    size: "12px",  remSize: "0.75rem", weight: "400", lineHeight: "1.5",  sample: "Última ejecución: hace 5 minutos · Intervalo: 15min · Versión 2.4.1" },
  { name: "Caption",  size: "11px",  remSize: "0.6875rem",weight: "500",lineHeight: "1.4",  letterSpacing: "0.08em", sample: "MOTOR ACTIVO · SEÑALES: 12 · VERSIÓN 2.4.1" },
  { name: "Mono / Logs", size: "12px", remSize: "0.75rem", weight: "400", lineHeight: "1.7", sample: "[17:42:05] ✓ Señal procesada: TechCorp — serie B $12M detectada", mono: true },
];

// ── Spacing ────────────────────────────────────────────────────────
export interface SpacingToken { name: string; px: number; rem: string; token: string; use: string; }

export const SPACING_SCALE: SpacingToken[] = [
  { name: "1",  px: 4,   rem: "0.25rem", token: "space-1",  use: "Micro: íconos, indicadores" },
  { name: "2",  px: 8,   rem: "0.5rem",  token: "space-2",  use: "Pequeño: padding inline" },
  { name: "3",  px: 12,  rem: "0.75rem", token: "space-3",  use: "Base: gaps entre elementos" },
  { name: "4",  px: 16,  rem: "1rem",    token: "space-4",  use: "Estándar: padding de cards" },
  { name: "6",  px: 24,  rem: "1.5rem",  token: "space-6",  use: "Medio: separación de secciones" },
  { name: "8",  px: 32,  rem: "2rem",    token: "space-8",  use: "Grande: gaps de layout" },
  { name: "12", px: 48,  rem: "3rem",    token: "space-12", use: "XL: padding de paneles" },
  { name: "16", px: 64,  rem: "4rem",    token: "space-16", use: "XXL: espaciado de secciones" },
];

// ── Border Radius ──────────────────────────────────────────────────
export interface RadiusToken { name: string; px: number; class: string; use: string; }

export const RADIUS_SCALE: RadiusToken[] = [
  { name: "radius-none", px: 0,   class: "rounded-none",  use: "Sin radio — tablas, bordes" },
  { name: "radius-sm",   px: 4,   class: "rounded",       use: "Pequeño — badges, chips" },
  { name: "radius-md",   px: 6,   class: "rounded-md",    use: "Medio — inputs, botones sm" },
  { name: "radius-lg",   px: 8,   class: "rounded-lg",    use: "Estándar — botones, inputs" },
  { name: "radius-xl",   px: 12,  class: "rounded-xl",    use: "Grande — cards, modales" },
  { name: "radius-2xl",  px: 16,  class: "rounded-2xl",   use: "XL — paneles, toasts" },
  { name: "radius-3xl",  px: 24,  class: "rounded-3xl",   use: "XXL — avatares grandes" },
  { name: "radius-full", px: 9999,class: "rounded-full",  use: "Circular — avatares, pills" },
];

// ── Shadows / Elevation ────────────────────────────────────────────
export interface ElevationToken { name: string; level: number; class: string; css: string; use: string; }

export const ELEVATION_SCALE: ElevationToken[] = [
  { name: "Ninguna",     level: 0, class: "shadow-none", css: "none",                                                                       use: "Elementos planos, tablas" },
  { name: "Sutil",       level: 1, class: "shadow-sm",   css: "0 1px 2px 0 rgb(0 0 0 / 0.05)",                                             use: "Inputs, chips, badges" },
  { name: "Base",        level: 2, class: "shadow",      css: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",            use: "Cards, dropdowns" },
  { name: "Media",       level: 4, class: "shadow-md",   css: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",         use: "Cards destacadas" },
  { name: "Alta",        level: 8, class: "shadow-lg",   css: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",       use: "Menús flotantes" },
  { name: "Modal",       level:16, class: "shadow-xl",   css: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",      use: "Modales, drawers" },
  { name: "Overlay",     level:24, class: "shadow-2xl",  css: "0 25px 50px -12px rgb(0 0 0 / 0.25)",                                       use: "Dialogs críticos" },
];

// ── Nav structure ──────────────────────────────────────────────────
export interface NavItem  { id: string; label: string; }
export interface NavGroup { group: string; emoji: string; items: NavItem[]; }

export const DS_NAV: NavGroup[] = [
  {
    group: "Fundamentos",
    emoji: "⬡",
    items: [
      { id: "identity",   label: "Identidad Visual" },
      { id: "colors",     label: "Colores" },
      { id: "typography", label: "Tipografía" },
      { id: "spacing",    label: "Espaciado" },
      { id: "elevation",  label: "Sombras & Elevación" },
    ],
  },
  {
    group: "Recursos",
    emoji: "◈",
    items: [
      { id: "icons",      label: "Iconografía" },
    ],
  },
  {
    group: "Componentes",
    emoji: "◻",
    items: [
      { id: "buttons",    label: "Botones" },
      { id: "inputs",     label: "Inputs & Formularios" },
      { id: "cards",      label: "Cards" },
      { id: "modals",     label: "Modales" },
      { id: "tabs",       label: "Tabs" },
      { id: "tables",     label: "Tablas" },
      { id: "timeline",   label: "Timeline" },
      { id: "alerts",     label: "Alertas" },
      { id: "console",    label: "Consola / Logs" },
    ],
  },
  {
    group: "Sistema Orquestador",
    emoji: "◎",
    items: [
      { id: "motor-states",  label: "Estados de Motor" },
      { id: "doc-states",    label: "Estados de Documento" },
      { id: "signal-states", label: "Estados de Señal" },
    ],
  },
];
