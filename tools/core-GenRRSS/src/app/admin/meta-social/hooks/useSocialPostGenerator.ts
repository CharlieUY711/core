// src/app/admin/meta-social/hooks/useSocialPostGenerator.ts
//
// Lógica del Generador de Publicaciones RRSS.
//
// Orquesta:
//   - Selección de canales
//   - Generación de borradores vía socialPostService.generateDrafts()
//   - Edición de texto/hashtags por canal
//   - Publicación canal por canal
//
// Recibe las credenciales Meta ya resueltas (de useMetaVault) y el producto
// del catálogo ya seleccionado (resolución de catálogo queda fuera del hook).

import { useState, useCallback } from 'react'
import type {
  CatalogProduct,
  ChannelDraft,
  SocialChannel,
  GeneratorStep,
  PublishResult,
  SocialPostGeneratorState,
} from '../types/social-post.types'
import type {
  InstagramCredentials,
  FacebookCredentials,
  WhatsAppCredentials,
} from '../types/meta.types'
import {
  generateDrafts,
  publishToInstagram,
  publishToFacebook,
  publishToWhatsApp,
} from '../services/socialPostService'

const INITIAL_STATE: SocialPostGeneratorState = {
  step:          'idle',
  product:       null,
  drafts:        [],
  results:       [],
  generateError: null,
}

export interface UseSocialPostGeneratorOptions {
  instagramCreds: InstagramCredentials
  facebookCreds:  FacebookCredentials
  whatsappCreds:  WhatsAppCredentials
  // Flags de si cada canal está configurado en el vault
  isInstagramConfigured: boolean
  isFacebookConfigured:  boolean
  isWhatsAppConfigured:  boolean
}

export function useSocialPostGenerator(options: UseSocialPostGeneratorOptions) {
  const {
    instagramCreds,
    facebookCreds,
    whatsappCreds,
    isInstagramConfigured,
    isFacebookConfigured,
    isWhatsAppConfigured,
  } = options

  const [state, setState] = useState<SocialPostGeneratorState>(INITIAL_STATE)

  // Canales que el operador quiere incluir (pre-selecciona los configurados)
  const [selectedChannels, setSelectedChannels] = useState<SocialChannel[]>(() => {
    const initial: SocialChannel[] = []
    if (isInstagramConfigured) initial.push('instagram')
    if (isFacebookConfigured)  initial.push('facebook')
    if (isWhatsAppConfigured)  initial.push('whatsapp')
    return initial
  })

  // ── Selección de producto ─────────────────────────────────────────────────

  const setProduct = useCallback((product: CatalogProduct) => {
    setState({
      ...INITIAL_STATE,
      product,
      step: 'idle',
    })
  }, [])

  // ── Toggle de canales ─────────────────────────────────────────────────────

  const toggleChannel = useCallback((channel: SocialChannel) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }, [])

  // ── Generación de borrador ────────────────────────────────────────────────

  const generate = useCallback(async () => {
    if (!state.product) return
    if (!selectedChannels.length) {
      setState(s => ({ ...s, generateError: 'Seleccioná al menos un canal antes de generar.' }))
      return
    }

    setState(s => ({ ...s, step: 'generating', generateError: null, drafts: [], results: [] }))

    const result = await generateDrafts({
      product:  state.product,
      channels: selectedChannels,
    })

    if (result.error || !result.drafts.length) {
      setState(s => ({ ...s, step: 'idle', generateError: result.error ?? 'Error desconocido' }))
      return
    }

    setState(s => ({ ...s, step: 'review', drafts: result.drafts, generateError: null }))
  }, [state.product, selectedChannels])

  // ── Edición de borradores ─────────────────────────────────────────────────

  const updateDraftText = useCallback((channel: SocialChannel, text: string) => {
    setState(s => ({
      ...s,
      drafts: s.drafts.map(d => d.channel === channel ? { ...d, text } : d),
    }))
  }, [])

  const updateDraftHashtags = useCallback((channel: SocialChannel, hashtags: string[]) => {
    setState(s => ({
      ...s,
      drafts: s.drafts.map(d => d.channel === channel ? { ...d, hashtags } : d),
    }))
  }, [])

  const toggleDraftEnabled = useCallback((channel: SocialChannel) => {
    setState(s => ({
      ...s,
      drafts: s.drafts.map(d => d.channel === channel ? { ...d, enabled: !d.enabled } : d),
    }))
  }, [])

  const setDraftImage = useCallback((channel: SocialChannel, imageUrl: string | null) => {
    setState(s => ({
      ...s,
      drafts: s.drafts.map(d => d.channel === channel ? { ...d, imageUrl } : d),
    }))
  }, [])

  // ── Publicación ───────────────────────────────────────────────────────────

  const publish = useCallback(async () => {
    const activeDrafts = state.drafts.filter(d => d.enabled)
    if (!activeDrafts.length) return

    setState(s => ({ ...s, step: 'publishing', results: [] }))

    const results: PublishResult[] = []

    for (const draft of activeDrafts) {
      let result: PublishResult

      switch (draft.channel) {
        case 'instagram':
          result = await publishToInstagram(draft, instagramCreds)
          break
        case 'facebook':
          result = await publishToFacebook(draft, facebookCreds)
          break
        case 'whatsapp':
          result = await publishToWhatsApp(draft, whatsappCreds)
          break
      }

      results.push(result)
      // Actualizar resultados progresivamente para feedback en tiempo real
      setState(s => ({ ...s, results: [...s.results, result] }))
    }

    setState(s => ({ ...s, step: 'done' }))
  }, [state.drafts, instagramCreds, facebookCreds, whatsappCreds])

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  const regenerate = useCallback(() => {
    setState(s => ({ ...s, step: 'idle', drafts: [], results: [], generateError: null }))
  }, [])

  // ── Helpers de estado ─────────────────────────────────────────────────────

  const activeDraftCount = state.drafts.filter(d => d.enabled).length
  const publishedCount   = state.results.filter(r => r.ok).length
  const failedCount      = state.results.filter(r => !r.ok).length

  const canGenerate = Boolean(state.product) && selectedChannels.length > 0
  const canPublish  = state.step === 'review' && activeDraftCount > 0

  return {
    // Estado
    state,
    selectedChannels,
    // Métricas
    activeDraftCount,
    publishedCount,
    failedCount,
    canGenerate,
    canPublish,
    // Acciones
    setProduct,
    toggleChannel,
    generate,
    updateDraftText,
    updateDraftHashtags,
    toggleDraftEnabled,
    setDraftImage,
    publish,
    reset,
    regenerate,
    // Flags de canales disponibles
    channelAvailable: {
      instagram: isInstagramConfigured,
      facebook:  isFacebookConfigured,
      whatsapp:  isWhatsAppConfigured,
    },
  }
}
