import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaletteEditor from './PaletteEditor'

export default async function NewPalettePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return <PaletteEditor userId={user.id} />
}
