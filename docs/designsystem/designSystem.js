/**
 * ToolEditor — Design System
 * Repositorio: CharlieUY711/tool-editor
 * Path local:  C:\Core\tools\tool-editor\src\design\
 *
 * Archivo único con TODAS las definiciones de diseño extraídas del componente.
 * Importar donde se necesite:
 *   import { COLORS, TYPOGRAPHY, SPACING, COMPONENTS, FILTERS, TOOLS, ... } from '../design/designSystem.js'
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. COLOR TOKENS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const COLORS = {

  // ── Superficies ──────────────────────────────────────────
  surface: {
    app:         "#f0efea",   // fondo general de la app
    panel:       "#fff",      // paneles laterales, topbar, statusbar
    canvas:      "#e8e6e0",   // área de trabajo del canvas
    input:       "#f5f5f3",   // inputs, botones secundarios, cards
    aiBanner:    "#faf5ff",   // banner sección IA (remove BG)
  },

  // ── Bordes ───────────────────────────────────────────────
  border: {
    default:     "#e0ddd5",   // bordes generales de paneles
    input:       "#e0ddd5",   // bordes de inputs y botones ghost
    checker:     "#ddd",      // patrón tablero del canvas
    aiBanner:    "#e9d5ff",   // borde banner IA
  },

  // ── Texto ────────────────────────────────────────────────
  text: {
    primary:     "#222",      // texto principal
    secondary:   "#555",      // texto secundario en botones fmtBtn
    muted:       "#888",      // labels de sliders, labels informativos
    faint:       "#aaa",      // valores de zoom, nombres de archivo
    placeholder: "#bbb",      // texto drop zone
    disabled:    "#999",      // estados deshabilitados
    sectionLabel:"#444",      // headers de sección (MAYÚSCULAS)
    tabInactive: "#bbb",      // tabs no activas
  },

  // ── Marca / Acento principal ──────────────────────────────
  accent: {
    primary:     "#00d4aa",   // acento principal (teal)
    primaryText: "#fff",      // texto sobre acento primario
  },

  // ── Botones primarios ────────────────────────────────────
  action: {
    primary:     "#111",      // fondo botón primario (negro)
    primaryText: "#fff",      // texto botón primario
    ghost:       "#f5f5f3",   // fondo botón ghost
    ghostText:   "#888",      // texto botón ghost
    ghostBorder: "#e0ddd5",   // borde botón ghost
  },

  // ── Semánticos ───────────────────────────────────────────
  semantic: {
    success:     "#16a34a",   // tamaño estimado, confirmaciones
    successBg:   "#f0fdf4",
    error:       "#dc2626",   // errores, cancelar
    errorBg:     "#fef2f2",
    warning:     "#f59e0b",
    warningBg:   "#fffbeb",
    info:        "#00d4aa",   // dimensiones, zoom
  },

  // ── IA / Purple ──────────────────────────────────────────
  ai: {
    accent:      "#7c3aed",   // color principal IA
    accentLight: "#a78bfa",   // texto sobre fondo oscuro
    bg:          "#f3e8ff",   // fondo badge IA
    border:      "#d8b4fe",   // borde badge IA
    bannerBg:    "#faf5ff",   // fondo banner IA
    bannerBorder:"#e9d5ff",   // borde banner IA
    sliderColor: "#7c3aed",   // accentColor del slider tolerancia
  },

  // ── Herramienta activa ───────────────────────────────────
  tool: {
    activeBg:    "#111",      // fondo herramienta seleccionada
    activeText:  "#fff",      // icono herramienta seleccionada
    inactiveText:"#aaa",      // icono herramienta no seleccionada
  },

  // ── Tab activa ───────────────────────────────────────────
  tab: {
    activeBorder:"#00d4aa",   // underline tab activa
    activeText:  "#00d4aa",   // texto tab activa
  },

  // ── Slider ───────────────────────────────────────────────
  slider: {
    accent:      "#00d4aa",   // accentColor sliders de ajuste
    value:       "#00d4aa",   // color del número de valor
  },

  // ── Shadows ──────────────────────────────────────────────
  shadow: {
    topbar:      "0 1px 0 rgba(0,0,0,.04)",
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. TIPOGRAFÍA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TYPOGRAPHY = {

  // ── Familias ─────────────────────────────────────────────
  fontFamily: {
    ui:        "'SF Mono', 'Fira Code', monospace",   // toda la UI
    logo:      "'SF Mono', 'Fira Code', monospace",   // mismo que UI
  },

  // ── Tamaños (px) ─────────────────────────────────────────
  fontSize: {
    logo:         13,   // TOOLEDITOR en topbar
    body:         12,   // base de la app
    button:       11,   // botones topbar, apply buttons
    label:        10,   // labels de sliders, stat items
    sectionLabel:  9,   // headers de sección (UPPERCASE)
    tab:           9,   // tabs del panel derecho
    filterName:    8,   // nombre debajo de filter thumb
    badge:         8,   // badge "IA"
    subLabel:      8,   // subtítulos en format buttons
    sizeNote:      8,   // notas de dimensiones en format presets
    dimLabel:      9,   // etiquetas ANCHO / ALTO
    statusItem:   10,   // items de status bar
    zoomPct:      10,   // porcentaje de zoom
    zoomBtn:      12,   // +/- zoom buttons
    zoomFitBtn:    9,   // botón "fit"
    infoNote:     10,   // notas JPG/PNG/WebP
    sizeEstimate: 10,   // texto "Tamaño estimado"
    sizeValue:    10,   // valor del tamaño estimado
    dimValue:     10,   // valor de dimensiones
  },

  // ── Pesos ────────────────────────────────────────────────
  fontWeight: {
    logo:        700,
    aspectLabel: 600,   // "16:9", "1:1" en format presets
    sizeVal:     500,   // valores de tamaño y dimensiones
    normal:      400,
  },

  // ── Letter spacing ───────────────────────────────────────
  letterSpacing: {
    logo:         2,    // "TOOLEDITOR"
    sectionLabel: 1.5,  // "LUZ", "COLOR", etc.
    tab:          0.5,  // tabs
    badge:        0,
  },

  // ── Line height ──────────────────────────────────────────
  lineHeight: {
    infoNote:    1.9,   // notas JPG/PNG/WebP
    statusBar:   1,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. ESPACIADO Y DIMENSIONES DE LAYOUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SPACING = {
  // Gaps generales
  gap: {
    xs:  2,
    sm:  4,
    md:  6,
    lg:  8,
    xl: 16,
  },

  // Padding internos
  padding: {
    topbarH:      "0 8px",
    panelSection: "10px 10px 20px",
    sectionTop:   12,    // margin-top de cada SectionHeader
    logo:         "0 14px",
    statusbar:    "0 14px",
    tbGroup:      "0 8px",
    tab:          "8px 2px",
    aiBanner:     10,
    sliderBottom: 5,     // margin-bottom de cada SliderRow
  },

  // Margin entre elementos
  margin: {
    sectionHeaderBottom: 6,
    sectionHeaderTop:    12,
    applyBtnTop:         10,
    applyBtnGhostTop:    4,
    filterGridGap:       4,
    formatGridGap:       4,
    socialGridGap:       4,
    dimLabelBottom:      3,
    sizeCardTop:         4,
    infNoteMargin:       "10px 0",
    bgPreviewBottom:     8,
    toleranceBottom:     6,
    bgStatusBottom:      6,
    aiBtnBottom:         4,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. DIMENSIONES DE COMPONENTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DIMENSIONS = {
  // Alturas fijas
  topbar:        46,    // px
  statusbar:     36,    // px
  filterThumb:   46,    // px — canvas dentro de filter thumb

  // Anchos fijos
  toolsPanel:    46,    // px — barra izquierda de herramientas
  rightPanel:   222,    // px — panel derecho

  // Elementos de herramientas
  toolBtn: {
    width:       34,
    height:      34,
    borderRadius: 5,
    iconSize:    16,
  },

  // Zoom buttons
  zoomBtn: {
    width:       22,
    height:      22,
    borderRadius: 3,
  },

  // Inputs
  sliderHeight:   3,    // px — track del range input
  numInputPad:   "4px 6px",

  // Border radius global
  borderRadius: {
    xs:  2,
    sm:  3,
    md:  4,
    lg:  5,
    xl:  6,
  },

  // Border widths
  borderWidth: {
    default:    "1px",
    tabActive:  "2px",
    filterActive: "1.5px",
  },

  // Checkerboard del canvas
  checker: {
    size:       "14px 14px",
    positions:  "0 0, 0 7px, 7px -7px, -7px 0",
  },

  // Preview remove BG
  bgPreview: {
    height:      76,
    borderRadius: 4,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. COMPONENTES — OBJETO S (estilos React inline completos)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const S = {
  root:          { display:"flex", flexDirection:"column", height:"100vh",
                   background:"#f0efea", color:"#222",
                   fontFamily:"'SF Mono','Fira Code',monospace",
                   fontSize:12, overflow:"hidden" },

  topbar:        { height:46, background:"#fff",
                   borderBottom:"1px solid #e0ddd5",
                   display:"flex", alignItems:"center",
                   gap:4, padding:"0 8px", flexShrink:0,
                   boxShadow:"0 1px 0 rgba(0,0,0,.04)" },

  logo:          { fontSize:13, fontWeight:700, letterSpacing:2,
                   color:"#111", padding:"0 14px",
                   borderRight:"1px solid #e0ddd5" },

  logoAccent:    { color:"#00d4aa" },    // span dentro del logo

  tbGroup:       { display:"flex", alignItems:"center", gap:2,
                   padding:"0 8px", borderRight:"1px solid #e0ddd5" },

  tbBtn:         { background:"none", border:"none", color:"#666",
                   padding:"4px 9px", borderRadius:4,
                   cursor:"pointer", fontSize:11, fontFamily:"inherit" },

  tbBtnAccent:   { background:"#00d4aa", color:"#fff" },
  tbBtnDanger:   { color:"#dc2626" },
  tbBtnDim:      { opacity: 0.35 },

  btnPrimary:    { background:"#111", color:"#fff", border:"none",
                   borderRadius:4, padding:"5px 12px",
                   cursor:"pointer", fontSize:11, fontFamily:"inherit" },

  btnAccent:     { background:"#00d4aa", marginLeft:4 },

  main:          { display:"flex", flex:1, overflow:"hidden" },

  toolsPanel:    { width:46, background:"#fff",
                   borderRight:"1px solid #e0ddd5",
                   display:"flex", flexDirection:"column",
                   alignItems:"center", padding:"8px 0",
                   gap:2, flexShrink:0 },

  toolBtn:       { width:34, height:34, border:"none", background:"none",
                   color:"#aaa", borderRadius:5, cursor:"pointer",
                   fontSize:16, transition:"all .15s" },

  toolActive:    { background:"#111", color:"#fff" },

  canvasWrap:    { flex:1, background:"#e8e6e0",
                   display:"flex", alignItems:"center",
                   justifyContent:"center",
                   position:"relative", overflow:"auto" },

  checker:       { position:"absolute", inset:0,
                   backgroundImage: [
                     "linear-gradient(45deg,#ddd 25%,transparent 25%)",
                     "linear-gradient(-45deg,#ddd 25%,transparent 25%)",
                     "linear-gradient(45deg,transparent 75%,#ddd 75%)",
                     "linear-gradient(-45deg,transparent 75%,#ddd 75%)",
                   ].join(","),
                   backgroundSize:"14px 14px",
                   backgroundPosition:"0 0,0 7px,7px -7px,-7px 0",
                   pointerEvents:"none" },

  dropZone:      { position:"absolute", inset:0,
                   display:"flex", flexDirection:"column",
                   alignItems:"center", justifyContent:"center", gap:8 },

  cropOverlay:   { position:"absolute", border:"2px solid #00d4aa",
                   background:"rgba(0,212,170,.05)",
                   pointerEvents:"none" },

  cropThirdH:    { position:"absolute", top:0, bottom:0,
                   borderLeft:"1px solid rgba(255,255,255,.25)" },

  cropThirdV:    { position:"absolute", left:0, right:0,
                   borderTop:"1px solid rgba(255,255,255,.25)" },

  rightPanel:    { width:222, background:"#fff",
                   borderLeft:"1px solid #e0ddd5",
                   display:"flex", flexDirection:"column",
                   flexShrink:0, overflow:"hidden" },

  panelTabs:     { display:"flex", borderBottom:"1px solid #e0ddd5",
                   flexShrink:0 },

  ptab:          { flex:1, background:"none", border:"none", color:"#bbb",
                   padding:"8px 2px", cursor:"pointer", fontSize:9,
                   letterSpacing:.5, textTransform:"uppercase",
                   borderBottom:"2px solid transparent",
                   transition:"all .15s" },

  ptabActive:    { color:"#00d4aa", borderBottomColor:"#00d4aa" },

  panelScroll:   { padding:"10px 10px 20px", overflowY:"auto", flex:1 },

  // ── Sección IA ───────────────────────────────────────────
  aiBanner:      { background:"#faf5ff", border:"1px solid #e9d5ff",
                   borderRadius:6, padding:10, marginBottom:4 },

  aiBadge:       { fontSize:8, background:"#f3e8ff", color:"#7c3aed",
                   border:"1px solid #d8b4fe",
                   padding:"2px 6px", borderRadius:3 },

  bgPreview:     { width:"100%", height:76, borderRadius:4,
                   border:"1px solid #e0e0e0", overflow:"hidden",
                   marginBottom:8,
                   background:"repeating-conic-gradient(#ddd 0% 25%,#f5f5f5 0% 50%) 0 0/12px 12px" },

  // ── Botones de acción ────────────────────────────────────
  applyBtn:      { width:"100%", background:"#111", color:"#fff",
                   border:"none", borderRadius:4, padding:7,
                   cursor:"pointer", fontSize:11, fontFamily:"inherit" },

  applyBtnGhost: { background:"#f5f5f3", color:"#888",
                   border:"1px solid #e0ddd5" },

  applyBtnAI:    { background:"#7c3aed" },

  // ── Format buttons ───────────────────────────────────────
  fmtBtn:        { background:"#f5f5f3", border:"1px solid #e0ddd5",
                   color:"#555", borderRadius:4, padding:"6px 4px",
                   cursor:"pointer", fontSize:10, textAlign:"center" },

  fmtBtnLabel:   { fontSize:11, fontWeight:600, color:"#222" },
  fmtBtnSub:     { fontSize:8, color:"#aaa" },

  // ── Output format buttons ────────────────────────────────
  outBtn:        { flex:1, background:"#f5f5f3", border:"1px solid #e0ddd5",
                   color:"#888", borderRadius:3, padding:5,
                   cursor:"pointer", fontSize:10, textAlign:"center" },

  outBtnActive:  { background:"#111", borderColor:"#111", color:"#fff" },

  // ── Cards de info ────────────────────────────────────────
  sizeCard:      { fontSize:10, color:"#888", background:"#f5f5f3",
                   padding:"6px 8px", borderRadius:3,
                   display:"flex", justifyContent:"space-between",
                   alignItems:"center" },

  sizeCardValue:         { color:"#16a34a", fontWeight:500 },  // tamaño estimado
  sizeCardValueAccent:   { color:"#00d4aa", fontWeight:500 },  // dimensiones

  // ── Inputs numéricos ────────────────────────────────────
  numInput:      { width:"100%", background:"#f5f5f3",
                   border:"1px solid #e0ddd5", color:"#222",
                   borderRadius:3, padding:"4px 6px",
                   fontSize:10, fontFamily:"inherit" },

  // ── Status bar ──────────────────────────────────────────
  statusbar:     { height:36, background:"#fff",
                   borderTop:"1px solid #e0ddd5",
                   display:"flex", alignItems:"center",
                   padding:"0 14px", gap:16, flexShrink:0 },

  statItem:      { fontSize:10, color:"#3a3a3a",
                   display:"flex", gap:4 },

  statValue:     { color:"#666" },

  // ── Zoom controls ───────────────────────────────────────
  zoomCtrl:      { marginLeft:"auto", display:"flex",
                   gap:4, alignItems:"center" },

  zoomBtn:       { background:"none", border:"1px solid #e0ddd5",
                   color:"#aaa", width:22, height:22,
                   borderRadius:3, cursor:"pointer",
                   fontSize:12, lineHeight:1, fontFamily:"inherit" },

  zoomFitBtn:    { width:"auto", padding:"0 8px", fontSize:9 },

  zoomPct:       { fontSize:10, color:"#aaa",
                   minWidth:36, textAlign:"center" },

  // ── Slider row ──────────────────────────────────────────
  sliderRow:     { display:"flex", alignItems:"center",
                   gap:6, marginBottom:5 },

  sliderLabel:   { fontSize:10, color:"#777",
                   width:72, flexShrink:0 },

  sliderValue:   { fontSize:10, color:"#00d4aa",
                   width:26, textAlign:"right", flexShrink:0 },

  // ── Section header ──────────────────────────────────────
  sectionHeader: { display:"flex", alignItems:"center",
                   justifyContent:"space-between",
                   marginBottom:6, marginTop:12 },

  sectionLabel:  { fontSize:9, letterSpacing:1.5,
                   color:"#444", textTransform:"uppercase" },

  resetBtn:      { background:"none", border:"none", color:"#444",
                   cursor:"pointer", fontSize:9, padding:"2px 4px" },

  // ── Filter thumb ────────────────────────────────────────
  filterThumb:        { background:"#f5f5f3",
                        border:"1.5px solid #ddd",
                        borderRadius:5, cursor:"pointer",
                        overflow:"hidden", transition:"border-color .15s" },

  filterThumbActive:  { border:"1.5px solid #00d4aa",
                        boxShadow:"0 0 0 1px #00d4aa" },

  filterCanvas:       { width:"100%", height:46, display:"block" },

  filterName:         { fontSize:8, textAlign:"center",
                        padding:"3px 0", color:"#999" },

  filterNameActive:   { color:"#00d4aa" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. DATOS — FILTROS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FILTERS = [
  { name:"Original", id:"none",   css:"none" },
  { name:"Vivid",    id:"vivid",  css:"saturate(1.8) contrast(1.1)" },
  { name:"Fade",     id:"fade",   css:"opacity(0.9) saturate(0.65) brightness(1.12)" },
  { name:"Noir",     id:"noir",   css:"grayscale(1) contrast(1.35) brightness(0.95)" },
  { name:"Warm",     id:"warm",   css:"sepia(0.35) saturate(1.2) brightness(1.05)" },
  { name:"Cool",     id:"cool",   css:"hue-rotate(20deg) saturate(1.15) brightness(1.02)" },
  { name:"Chrome",   id:"chrome", css:"contrast(1.2) saturate(1.4) brightness(0.92)" },
  { name:"Matte",    id:"matte",  css:"contrast(0.88) saturate(0.75) brightness(1.08)" },
  { name:"Retro",    id:"retro",  css:"sepia(0.5) saturate(1.3) contrast(1.05)" },
  { name:"Lomo",     id:"lomo",   css:"saturate(1.6) contrast(1.25) brightness(0.88)" },
  { name:"Analog",   id:"analog", css:"sepia(0.2) saturate(1.1) contrast(1.05) brightness(1.02)" },
  { name:"Cinema",   id:"cinema", css:"contrast(1.25) saturate(0.85) brightness(0.93)" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. DATOS — HERRAMIENTAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TOOLS = [
  { id:"select", icon:"⬚", label:"Selección",       cursor:"default"   },
  { id:"crop",   icon:"✂",  label:"Cortar",          cursor:"crosshair" },
  { id:"rmbg",   icon:"🪄", label:"Quitar fondo IA", cursor:"cell"      },
  { id:"brush",  icon:"✏",  label:"Pincel borrar",   cursor:"cell"      },
  { id:"hand",   icon:"✋", label:"Mano",            cursor:"grab"      },
  { id:"zoom",   icon:"⊕",  label:"Zoom",            cursor:"zoom-in"   },
  { id:"fx",     icon:"✦",  label:"Efectos",         cursor:"default"   },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. DATOS — PRESETS DE FORMATO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ASPECT_PRESETS = [
  { label:"1:1",  w:1,  h:1,  tag:"Cuadrado"  },
  { label:"16:9", w:16, h:9,  tag:"Wide HD"   },
  { label:"4:3",  w:4,  h:3,  tag:"Clásico"   },
  { label:"3:2",  w:3,  h:2,  tag:"DSLR"      },
  { label:"21:9", w:21, h:9,  tag:"Cine"       },
  { label:"9:16", w:9,  h:16, tag:"Story"      },
  { label:"4:5",  w:4,  h:5,  tag:"Instagram"  },
  { label:"2:3",  w:2,  h:3,  tag:"Retrato"    },
  { label:"3:1",  w:3,  h:1,  tag:"Panorama"   },
];

export const SOCIAL_PRESETS = [
  { label:"IG Post",  w:1080, h:1080 },
  { label:"IG Story", w:1080, h:1920 },
  { label:"FB Post",  w:1200, h:630  },
  { label:"Twitter",  w:1500, h:500  },
  { label:"YT Thumb", w:1280, h:720  },
  { label:"LinkedIn", w:1200, h:627  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. DATOS — AJUSTES (defaults y rangos)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ADJ_DEFAULTS = {
  exposure:0, contrast:0, brightness:0, shadows:0, highlights:0,
  saturation:0, temperature:0, tint:0, vibrance:0,
  sharpness:0, clarity:0, noise:0, vignette:0,
};

export const ADJ_RANGES = {
  // [ min, max, label, grupo ]
  exposure:    [-100, 100, "Exposición",  "light"  ],
  contrast:    [-100, 100, "Contraste",   "light"  ],
  brightness:  [-100, 100, "Brillo",      "light"  ],
  shadows:     [-100, 100, "Sombras",     "light"  ],
  highlights:  [-100, 100, "Altas luces", "light"  ],
  saturation:  [-100, 100, "Saturación",  "color"  ],
  temperature: [-100, 100, "Temperatura", "color"  ],
  tint:        [-100, 100, "Tinte",       "color"  ],
  vibrance:    [-100, 100, "Vibración",   "color"  ],
  sharpness:   [   0, 100, "Nitidez",     "detail" ],
  clarity:     [-100, 100, "Claridad",    "detail" ],
  noise:       [   0, 100, "Ruido",       "detail" ],
  vignette:    [-100, 100, "Viñeta",      "detail" ],
};

export const ADJ_GROUPS = {
  light:  ["exposure","contrast","brightness","shadows","highlights"],
  color:  ["saturation","temperature","tint","vibrance"],
  detail: ["sharpness","clarity","noise","vignette"],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. DATOS — TABS DEL PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PANEL_TABS = [
  { id:"adjust",  label:"Ajustes"  },
  { id:"format",  label:"Formato"  },
  { id:"filters", label:"Filtros"  },
  { id:"export",  label:"Export"   },
];

export const OUTPUT_FORMATS = [
  { id:"jpeg", label:"JPG", note:"Compresión alta, sin transparencia"  },
  { id:"png",  label:"PNG", note:"Sin pérdida, soporta transparencia"  },
  { id:"webp", label:"WebP",note:"Mejor ratio calidad/tamaño"          },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. TEXTOS UI (labels, placeholders, mensajes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const UI_TEXT = {
  logo:                 "TOOLEDITOR",
  logoAccentPart:       "EDITOR",      // parte en color acento
  logoBasePart:         "TOOL",

  dropTitle:            "ARRASTRA TU IMAGEN AQUÍ",
  dropSub:              "o usa el botón + cargar",
  dropBtn:              "+ cargar imagen",

  btnOpen:              "📂 abrir",
  btnUndo:              "↩ deshacer",
  btnRedo:              "↪ rehacer",
  btnRotateL:           "↺ −90°",
  btnRotateR:           "↻ +90°",
  btnFlipH:             "⇄ H",
  btnFlipV:             "⇅ V",
  btnCommit:            "✓ aplicar todo",
  btnCropApply:         "✂ aplicar corte",
  btnCropCancel:        "✕ cancelar",
  btnLoad:              "+ cargar",
  btnExport:            "⬇ exportar",

  aiBadgeLabel:         "IA",
  aiBannerTitle:        "Quitar fondo",
  toleranceLabel:       "Tolerancia",
  btnRemoveBG:          "🪄 quitar fondo con IA",
  btnRemoveBGLoading:   "⟳ procesando...",
  btnRestoreBG:         "↩ restaurar original",

  btnApplyAdj:          "✓ aplicar y congelar",
  btnResetAdj:          "↺ resetear ajustes",
  btnApplyFilter:       "✓ aplicar filtro",
  btnResize:            "↕ redimensionar",
  btnDownload:          "⬇ descargar imagen",
  btnCopyClipboard:     "📋 copiar al portapapeles",

  sizeEstLabel:         "Tamaño estimado",
  dimsLabel:            "Dimensiones",
  widthLabel:           "ANCHO (px)",
  heightLabel:          "ALTO (px)",
  qualityLabel:         "Calidad",
  formatLabel:          "Formato de salida",
  aspectLabel:          "Relaciones de aspecto",
  socialLabel:          "Redes sociales",
  customSizeLabel:      "Tamaño personalizado",
  filtersLabel:         "Filtros clásicos",

  statTool:             "herramienta",
  statDim:              "dimensión",
  statZoom:             "zoom",
  statFilter:           "filtro",
  statHistory:          "historial",

  noImage:              "sin imagen",
  noSize:               "—",
  noDims:               "— × —",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. TRANSICIONES Y ANIMACIONES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TRANSITIONS = {
  default:      "all .15s",
  toolBtn:      "all .15s",
  filterThumb:  "border-color .15s",
  tab:          "all .15s",
  tbBtn:        "all .15s",
};

export const ANIMATIONS = {
  // keyframe definida en <style> inyectado en el componente
  spin: "@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 13. CONSTANTES FUNCIONALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FUNCTIONAL = {
  zoom: {
    step:    0.25,
    min:     0.05,
    max:     8,
    default: 1,
    fitMargin: 40,     // px de margen al hacer fit
  },
  quality: {
    default: 90,
    min:     10,
    max:     100,
  },
  tolerance: {
    default: 30,
    min:     5,
    max:     80,
  },
  crop: {
    minSize: 10,       // px mínimos para aplicar crop
  },
  filterThumb: {
    width:   60,
    height:  46,
  },
  exportFileName: "tool-editor-export",
  canvasExportQuality: 0.8,  // calidad JPEG para enviar a Claude Vision
};
