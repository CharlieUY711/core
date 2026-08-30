// src/app/admin/meta-social/hooks/useMetaVault.ts
//
// Lee las credenciales de cada plataforma Meta desde el API Vault existente
// (useApiVault / apiVaultService). NUNCA almacena tokens en estado local
// persistente ni en localStorage.
//
// Dependencia: useApiVault de src/app/admin/hooks/useApiVault.ts

import { useMemo } from 'react'
// El Vault del panel, no uno propio: es el mismo que administra API Vault.
// Este import apuntaba a '../hooks/useApiVault' —una ruta que no existe— porque
// el codigo vivia en packages/ y nunca se habia montado en ningun lado.
import { useApiVault } from '../../hooks/useApiVault'
import type { ApiVaultEntry } from '../../services/apiVaultTypes'
import type {
  MetaCredentials,
  InstagramCredentials,
  FacebookCredentials,
  WhatsAppCredentials,
} from '../types/meta.types'

// ── Helper: extrae el valor de una entrada por nombre exacto ─────────────────

/* El tipo se nombra, no se deduce. Estaba escrito como
   `ReturnType<ReturnType<typeof useApiVault>['getByPlatform']>`, que sobre un
   store de zustand resuelve a `unknown` y hacia que `.name` no existiera. */
function pickValue(
  entries: ApiVaultEntry[],
  name:    string
): string | null {
  return entries.find(e => e.name === name)?.value ?? null
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useMetaVault() {
  const { entries, loading, error, load } = useApiVault()

  // Filtra por plataforma (plataforms registradas en el Vault)
  const igEntries = useMemo(
    () => entries.filter(e => e.platform === 'Instagram'),
    [entries]
  )
  const fbEntries = useMemo(
    () => entries.filter(e => e.platform === 'Facebook'),
    [entries]
  )
  const waEntries = useMemo(
    () => entries.filter(e => e.platform === 'WhatsApp'),
    [entries]
  )
  const metaEntries = useMemo(
    () => entries.filter(e => e.platform === 'Meta'),
    [entries]
  )

  // ── Credenciales compartidas Meta App ──────────────────────────────────────
  const metaCredentials: MetaCredentials = useMemo(() => ({
    appId:          pickValue(metaEntries, 'META_APP_ID'),
    appSecret:      pickValue(metaEntries, 'META_APP_SECRET'),
    longLivedToken: pickValue(metaEntries, 'META_LONG_LIVED_TOKEN'),
  }), [metaEntries])

  // ── Instagram ─────────────────────────────────────────────────────────────
  const instagramCredentials: InstagramCredentials = useMemo(() => ({
    accessToken:       pickValue(igEntries, 'INSTAGRAM_ACCESS_TOKEN'),
    businessAccountId: pickValue(igEntries, 'INSTAGRAM_BUSINESS_ID'),
    igUserId:          pickValue(igEntries, 'INSTAGRAM_IG_USER_ID'),
  }), [igEntries])

  // ── Facebook ──────────────────────────────────────────────────────────────
  const facebookCredentials: FacebookCredentials = useMemo(() => ({
    pageAccessToken: pickValue(fbEntries, 'FACEBOOK_PAGE_ACCESS_TOKEN'),
    pageId:          pickValue(fbEntries, 'FACEBOOK_PAGE_ID'),
    catalogId:       pickValue(fbEntries, 'FACEBOOK_CATALOG_ID'),
  }), [fbEntries])

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const whatsappCredentials: WhatsAppCredentials = useMemo(() => ({
    accessToken:   pickValue(waEntries, 'WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: pickValue(waEntries, 'WHATSAPP_PHONE_NUMBER_ID'),
    wabaId:        pickValue(waEntries, 'WHATSAPP_WABA_ID'),
  }), [waEntries])

  // ── Flags de configuración por plataforma ─────────────────────────────────
  const isInstagramConfigured = Boolean(
    instagramCredentials.accessToken && instagramCredentials.businessAccountId
  )
  const isFacebookConfigured = Boolean(
    facebookCredentials.pageAccessToken && facebookCredentials.pageId
  )
  const isWhatsAppConfigured = Boolean(
    whatsappCredentials.accessToken && whatsappCredentials.phoneNumberId
  )

  return {
    loading,
    error,
    reload: load,

    // Credenciales
    metaCredentials,
    instagramCredentials,
    facebookCredentials,
    whatsappCredentials,

    // Flags de configuración
    isInstagramConfigured,
    isFacebookConfigured,
    isWhatsAppConfigured,
  }
}
