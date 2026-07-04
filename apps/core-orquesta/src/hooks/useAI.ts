import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface GeneratePayload {
  prompt:    string
  motorId?:  string
  companyId?: string
}

interface GenerateResult {
  text:     string
  model:    string
  provider: 'anthropic' | 'openai'
}

export function useAI() {
  return useMutation<GenerateResult, Error, GeneratePayload>({
    mutationFn: async (payload) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No autenticado')

      const res = await fetch(
        `${import.meta.env.VITE_BEP_SUPABASE_URL}/functions/v1/orquesta-generate`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }

      return res.json() as Promise<GenerateResult>
    },
  })
}
