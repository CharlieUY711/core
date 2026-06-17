'use client'
import { createClient } from '@/lib/supabase/client'
import { ApiVaultPage } from '@/lib/api-vault/ApiVaultPage'

export default function ApiVaultPanel() {
  const supabase = createClient()
  return <ApiVaultPage supabase={supabase} />
}