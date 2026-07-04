import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Signal } from '@/types/orquesta.types'

const TABLE = 'orquesta_signals'

export function useSignals(companyId?: string) {
  return useQuery({
    queryKey: [TABLE, companyId],
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false })
      if (companyId) q = q.eq('company_id', companyId)
      const { data, error } = await q
      if (error) throw error
      return data as Signal[]
    },
  })
}

export function useUpdateSignalStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: Pick<Signal, 'id' | 'status'>) => {
      const { error } = await supabase.from(TABLE).update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  })
}
