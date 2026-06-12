// src/app/admin/meta-social/hooks/useWhatsApp.ts

import { useState, useEffect, useCallback } from 'react'
import { whatsappService } from '../services/whatsappService'
import type { WhatsAppCredentials } from '../types/meta.types'
import type { WhatsAppPhoneNumber, WhatsAppMessageTemplate } from '../types/whatsapp.types'
import type { ConnectionStatus } from '../types/meta.types'

export function useWhatsApp(creds: WhatsAppCredentials) {
  const [status,      setStatus]      = useState<ConnectionStatus>('idle')
  const [error,       setError]       = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<WhatsAppPhoneNumber | null>(null)
  const [templates,   setTemplates]   = useState<WhatsAppMessageTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const isConfigured = Boolean(creds.accessToken && creds.phoneNumberId)

  const connect = useCallback(async () => {
    if (!isConfigured) return
    setStatus('connecting')
    setError(null)
    const result = await whatsappService.getPhoneNumber(creds)
    if (!result.ok) {
      setStatus('error')
      setError(result.error ?? 'Error al conectar con WhatsApp')
      return
    }
    setPhoneNumber(result.data!)
    setStatus('connected')
  }, [creds, isConfigured])

  const loadTemplates = useCallback(async () => {
    if (!isConfigured || status !== 'connected' || !creds.wabaId) return
    setLoadingTemplates(true)
    const result = await whatsappService.getTemplates(creds)
    if (result.ok && result.data) setTemplates(result.data.data)
    setLoadingTemplates(false)
  }, [creds, isConfigured, status])

  useEffect(() => {
    if (isConfigured) connect()
    else { setStatus('idle'); setPhoneNumber(null); setTemplates([]) }
  }, [isConfigured, creds.accessToken, creds.phoneNumberId])

  useEffect(() => {
    if (status === 'connected') loadTemplates()
  }, [status])

  return {
    status, error, phoneNumber, templates, loadingTemplates,
    reconnect:   () => connect(),
    isConfigured,
  }
}
