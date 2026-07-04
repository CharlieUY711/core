import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Motor } from '@/types/orquesta.types'

const TABLE = 'orquesta_motors'

export function useMotors() {
  const { data: motors = [], isLoading, error } = useQuery({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Motor[]
    },
  })

  return { motors, isLoading, error }
}

export function useCreateMotor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<Motor, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_run_at' | 'logs'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const { data, error } = await supabase.from(TABLE).insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      return data as Motor
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  })
}

export function useUpdateMotor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Motor> & { id: string }) => {
      const { data, error } = await supabase
        .from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()
      if (error) throw error
      return data as Motor
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  })
}

export function useDeleteMotor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  })
}
