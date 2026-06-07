import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: palettes }, { data: designs }, { data: portals }] = await Promise.all([
    supabase.from('palettes').select('id, name, description').order('created_at'),
    supabase.from('designs').select('id, name, description').order('created_at'),
    supabase.from('portals').select('id, name_es, status, access, palette_id, design_id, features').order('order_index'),
  ])

  return (
    <AdminClient
      user={{ email: user.email ?? '', id: user.id }}
      palettes={palettes ?? []}
      designs={designs ?? []}
      portals={portals ?? []}
    />
  )
}
