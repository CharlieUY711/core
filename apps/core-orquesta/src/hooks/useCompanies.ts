import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Company } from '@/types/orquesta.types'

const TABLE = 'orquesta_companies'

export function useCompanies() {
  const { data: companies = [], isLoading, error } = useQuery({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data as Company[]
    },
  })

  return { companies, isLoading, error }
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Company, 'id' | 'user_id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const { data, error } = await supabase.from(TABLE).insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      return data as Company
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Company> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select().single()
      if (error) throw error
      return data as Company
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  })
}
