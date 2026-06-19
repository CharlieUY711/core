// src/app/admin/meta-social/types/social-post.types.ts
//
// Tipos para el Generador de Publicaciones RRSS.
// Representa el flujo: producto del catálogo → borrador → publicado.

// ── Canales disponibles ───────────────────────────────────────────────────────

export type SocialChannel = 'instagram' | 'facebook' | 'whatsapp'

// ── Producto del catálogo (lo que se recibe como input) ───────────────────────
// Refleja los campos de v_catalog_variants_full que usamos.

export interface CatalogProduct {
  variantId:    string
  itemId:       string
  storeId:      string
  title:        string
  description:  string | null
  price:        number
  currency:     string           // 'UYU' | 'USD' | etc.
  images:       string[]         // URLs públicas de catalog_media
  attributes:   Record<string, string | number | boolean>
  stock:        number
  sku:          string | null
  permalink?:   string           // URL pública del producto en la tienda
}

// ── Borrador por canal ────────────────────────────────────────────────────────

export interface ChannelDraft {
  channel:   SocialChannel
  text:      string              // caption / mensaje editable
  imageUrl:  string | null       // primera imagen seleccionada
  hashtags:  string[]            // sugeridos por IA, editables
  enabled:   boolean             // ¿el operador quiere publicar en este canal?
}

// ── Estado general del generador ──────────────────────────────────────────────

export type GeneratorStep =
  | 'idle'          // sin producto seleccionado
  | 'generating'    // llamando a Claude API
  | 'review'        // el operador edita el borrador
  | 'publishing'    // publicando en canales
  | 'done'          // todo publicado

export interface PublishResult {
  channel:    SocialChannel
  ok:         boolean
  externalId: string | null      // ID del post en la plataforma
  error:      string | null
}

export interface SocialPostGeneratorState {
  step:         GeneratorStep
  product:      CatalogProduct | null
  drafts:       ChannelDraft[]
  results:      PublishResult[]
  generateError: string | null
}
