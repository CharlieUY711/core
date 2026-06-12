// src/app/admin/meta-social/hooks/useFacebook.ts

import { useState, useEffect, useCallback } from 'react'
import { facebookService } from '../services/facebookService'
import type { FacebookCredentials } from '../types/meta.types'
import type { FacebookPage, FacebookPost } from '../types/facebook.types'
import type { ConnectionStatus } from '../types/meta.types'

export function useFacebook(creds: FacebookCredentials) {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [error,  setError]  = useState<string | null>(null)
  const [page,   setPage]   = useState<FacebookPage | null>(null)
  const [posts,  setPosts]  = useState<FacebookPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)

  const isConfigured = Boolean(creds.pageAccessToken && creds.pageId)

  const connect = useCallback(async () => {
    if (!isConfigured) return
    setStatus('connecting')
    setError(null)
    const result = await facebookService.getPage(creds)
    if (!result.ok) {
      setStatus('error')
      setError(result.error ?? 'Error al conectar con Facebook')
      return
    }
    setPage(result.data!)
    setStatus('connected')
  }, [creds, isConfigured])

  const loadPosts = useCallback(async () => {
    if (!isConfigured || status !== 'connected') return
    setLoadingPosts(true)
    const result = await facebookService.getPosts(creds, 6)
    if (result.ok && result.data) setPosts(result.data.data)
    setLoadingPosts(false)
  }, [creds, isConfigured, status])

  useEffect(() => {
    if (isConfigured) connect()
    else { setStatus('idle'); setPage(null); setPosts([]) }
  }, [isConfigured, creds.pageAccessToken, creds.pageId])

  useEffect(() => {
    if (status === 'connected') loadPosts()
  }, [status])

  return {
    status, error, page, posts, loadingPosts,
    reconnect:   () => connect(),
    isConfigured,
  }
}
