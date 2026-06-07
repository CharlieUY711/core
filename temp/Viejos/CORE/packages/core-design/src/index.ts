// ═══════════════════════════════════════════════════════════════
// @core/design — Public API v1.2
// ═══════════════════════════════════════════════════════════════

// Tokens base
export { tokens, colors, typography, spacing, radius, shadows, motion, breakpoints, layout, products } from './tokens/tokens'
export type { Tokens } from './tokens/tokens'

// Sistema de temas
export { 
  colorsCORE, 
  colorsSECOND, 
  aestheticDark, 
  aestheticLight, 
  themes 
} from './themes/themes'
export type { 
  ThemeName, 
  AestheticDark, 
  AestheticLight, 
  ColorsCORE, 
  ColorsSECOND 
} from './themes/themes'

// Brand
export { brand } from './themes/brand'
export type { Brand } from './themes/brand'

/*
  USO EN CADA APP:
  
  — core.com.uy / portales internos:
    import '@core/design/globals/globals-dark.css'
  
  — market.core.com.uy:
    <html data-theme="market">
    import '@core/design/globals/globals-light.css'
  
  — second:
    <html data-theme="second">
    import '@core/design/globals/globals-light.css'
*/

