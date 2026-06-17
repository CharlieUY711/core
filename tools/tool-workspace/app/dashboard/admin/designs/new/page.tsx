import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DesignEditor from './DesignEditor'

export default async function NewDesignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return <DesignEditor userId={user.id} />
}
