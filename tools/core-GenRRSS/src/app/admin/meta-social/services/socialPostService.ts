// src/app/admin/meta-social/services/socialPostService.ts
//
// Servicio del Generador de Publicaciones RRSS.
//
// Responsabilidades:
//   1. generateDrafts()  — llama a Claude API (Anthropic) para crear borradores
//      con el texto e hashtags para cada canal, a partir de los datos del producto.
//   2. publishToInstagram() / publishToFacebook() / publishToWhatsApp()
//      — delega en los servicios de canal ya existentes.
//
// NO almacena estado — toda la lógica de estado vive en useSocialPostGenerator.

import type { CatalogProduct, ChannelDraft, SocialChannel, PublishResult } from '../types/social-post.types'
import type { InstagramCredentials, FacebookCredentials, WhatsAppCredentials } from '../types/meta.types'
import { instagramService } from './instagramService'
import { facebookService }  from './facebookService'
import { whatsappService }  from './whatsappService'

// ── Generación de borradores con Claude API ───────────────────────────────────

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

function buildPrompt(product: CatalogProduct, channels: SocialChannel[]): string {
  const price = `${product.currency} ${product.price.toLocaleString('es-UY')}`
  const attrs = Object.entries(product.attributes)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join('\n')
  const stock = product.stock > 0
    ? `${product.stock} unidades disponibles`
    : 'Sin stock actualmente'

  const channelList = channels.join(', ')

  return `Eres un experto en marketing digital para eCommerce latinoamericano.
Tenés que redactar publicaciones para redes sociales a partir de los datos de un producto.

PRODUCTO:
- Título: ${product.title}
- Descripción: ${product.description ?? '(sin descripción)'}
- Precio: ${price}
- Stock: ${stock}
- SKU: ${product.sku ?? 'N/A'}
${attrs ? `- Atributos:\n${attrs}` : ''}
${product.permalink ? `- URL: ${product.permalink}` : ''}

CANALES SOLICITADOS: ${channelList}

INSTRUCCIONES:
- Redactá un texto atractivo para cada canal solicitado.
- El texto debe estar en el idioma implícito del producto (si el título está en español, escribir en español).
- Para Instagram: caption emotivo y visual, máximo 2200 caracteres, incluí 10-15 hashtags relevantes.
- Para Facebook: texto más completo y conversacional, máximo 500 caracteres, 3-5 hashtags.
- Para WhatsApp: mensaje directo y cálido, máximo 200 caracteres, sin hashtags (usar emojis en su lugar).
- Los hashtags deben ser relevantes al producto, al nicho y al mercado latinoamericano.
- No inventés características que no estén en los datos del producto.
- Si hay URL del producto, podés incluirla solo en el texto de Facebook y WhatsApp.

Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, con este esquema exacto:
{
  "instagram": { "text": "...", "hashtags": ["...", "..."] },
  "facebook":  { "text": "...", "hashtags": ["...", "..."] },
  "whatsapp":  { "text": "...", "hashtags": [] }
}

Solo incluí los canales solicitados. Si un canal no fue solicitado, omití la clave.`
}

export interface GenerateDraftsOptions {
  product:  CatalogProduct
  channels: SocialChannel[]
}

export interface GenerateDraftsResult {
  drafts: ChannelDraft[]
  error:  string | null
}

export async function generateDrafts(
  options: GenerateDraftsOptions
): Promise<GenerateDraftsResult> {
  const { product, channels } = options
  if (!channels.length) {
    return { drafts: [], error: 'Seleccioná al menos un canal.' }
  }

  const prompt = buildPrompt(product, channels)

  try {
    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1000,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return {
        drafts: [],
        error: `Error al llamar a Claude API (${response.status}): ${err.error?.message ?? 'desconocido'}`,
      }
    }

    const data = await response.json()
    const raw  = data.content?.find((b: any) => b.type === 'text')?.text ?? ''

    // Limpiar posibles backticks que el modelo pueda agregar
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean) as Record<string, { text: string; hashtags: string[] }>

    // Construir ChannelDraft por canal
    const imageUrl = product.images[0] ?? null
    const drafts: ChannelDraft[] = channels.map(channel => {
      const aiData = parsed[channel]
      return {
        channel,
        text:     aiData?.text     ?? '',
        hashtags: aiData?.hashtags ?? [],
        imageUrl,
        enabled:  true,
      }
    })

    return { drafts, error: null }
  } catch (e: any) {
    const msg: string = e.message ?? 'Error desconocido'
    // JSON.parse falló → el modelo no devolvió JSON limpio
    if (msg.includes('JSON') || msg.includes('parse') || msg.includes('token')) {
      return { drafts: [], error: 'La IA no devolvió un formato válido. Intentá de nuevo.' }
    }
    return { drafts: [], error: msg }
  }
}

// ── Publicación por canal ─────────────────────────────────────────────────────

export async function publishToInstagram(
  draft: ChannelDraft,
  creds: InstagramCredentials
): Promise<PublishResult> {
  if (!draft.imageUrl) {
    return { channel: 'instagram', ok: false, externalId: null, error: 'Instagram requiere una imagen.' }
  }

  const caption = draft.hashtags.length
    ? `${draft.text}\n\n${draft.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}`
    : draft.text

  // Etapa 1: crear container
  const containerResult = await instagramService.createMediaContainer(creds, {
    imageUrl: draft.imageUrl,
    caption,
  })
  if (!containerResult.ok) {
    return { channel: 'instagram', ok: false, externalId: null, error: containerResult.error ?? 'Error al crear container' }
  }

  // Etapa 2: publicar container
  const publishResult = await instagramService.publishMediaContainer(creds, containerResult.data!.id)
  if (!publishResult.ok) {
    return { channel: 'instagram', ok: false, externalId: null, error: publishResult.error ?? 'Error al publicar' }
  }

  return { channel: 'instagram', ok: true, externalId: publishResult.data!.id, error: null }
}

export async function publishToFacebook(
  draft: ChannelDraft,
  creds: FacebookCredentials
): Promise<PublishResult> {
  const message = draft.hashtags.length
    ? `${draft.text}\n\n${draft.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}`
    : draft.text

  const result = await facebookService.createPost(creds, {
    message,
    picture: draft.imageUrl ?? undefined,
  })

  if (!result.ok) {
    return { channel: 'facebook', ok: false, externalId: null, error: result.error ?? 'Error al publicar' }
  }
  return { channel: 'facebook', ok: true, externalId: result.data!.id, error: null }
}

export async function publishToWhatsApp(
  draft:      ChannelDraft,
  creds:      WhatsAppCredentials,
  templateName: string = 'product_announcement',
  languageCode: string = 'es'
): Promise<PublishResult> {
  // WhatsApp Cloud API para difusión requiere templates aprobados por Meta.
  // Esta función delega al servicio existente — el template debe existir en la cuenta.
  // Si la cuenta no tiene templates, el resultado será error con instrucciones claras.
  const result = await whatsappService.sendTemplate(creds, {
    to: creds.phoneNumberId ?? '',   // en difusión esto es el número receptor del test
    templateName,
    languageCode,
  })

  if (!result.ok) {
    return {
      channel: 'whatsapp',
      ok: false,
      externalId: null,
      error: result.error ?? 'Error al enviar template de WhatsApp',
    }
  }
  return {
    channel:    'whatsapp',
    ok:         true,
    externalId: result.data?.messages?.[0]?.id ?? null,
    error:      null,
  }
}
