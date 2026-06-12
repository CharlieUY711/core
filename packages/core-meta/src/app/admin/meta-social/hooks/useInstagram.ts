// src/app/admin/meta-social/hooks/useInstagram.ts

import { useState, useEffect, useCallback } from 'react'
import { instagramService } from '../services/instagramService'
import type { InstagramCredentials, MetaApiResult } from '../types/meta.types'
import type { InstagramProfile, InstagramMedia } from '../types/instagram.types'
import type { ConnectionStatus } from '../types/meta.types'

export function useInstagram(creds: InstagramCredentials) {
  const [status,  setStatus]  = useState<ConnectionStatus>('idle')
  const [error,   setError]   = useState<string | null>(null)
  const [profile, setProfile] = useState<InstagramProfile | null>(null)
  const [media,   setMedia]   = useState<InstagramMedia[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [nextCursor,   setNextCursor]   = useState<string | undefined>()

  const isConfigured = Boolean(creds.accessToken && creds.businessAccountId)

  const connect = useCallback(async () => {
    if (!isConfigured) return
    setStatus('connecting')
    setError(null)

    const profileResult = await instagramService.getProfile(creds)
    if (!profileResult.ok) {
      setStatus('error')
      setError(profileResult.error ?? 'Error al conectar con Instagram')
      return
    }
    setProfile(profileResult.data!)
    setStatus('connected')
  }, [creds, isConfigured])

  const loadMedia = useCallback(async (reset = false) => {
    if (!isConfigured || status !== 'connected') return
    setLoadingMedia(true)
    const cursor = reset ? undefined : nextCursor
    const result = await instagramService.getMedia(creds, 12, cursor)
    if (result.ok && result.data) {
      setMedia(prev => reset ? result.data!.data : [...prev, ...result.data!.data])
      setNextCursor(result.data.paging?.cursors?.after)
    }
    setLoadingMedia(false)
  }, [creds, isConfigured, status, nextCursor])

  // Auto-conectar cuando las credenciales estén disponibles
  useEffect(() => {
    if (isConfigured) connect()
    else { setStatus('idle'); setProfile(null); setMedia([]) }
  }, [isConfigured, creds.accessToken, creds.businessAccountId])

  // Cargar media al conectar
  useEffect(() => {
    if (status === 'connected') loadMedia(true)
  }, [status])

  return {
    status, error, profile, media, loadingMedia,
    hasMore:     Boolean(nextCursor),
    loadMore:    () => loadMedia(false),
    reconnect:   () => connect(),
    isConfigured,
  }
}
