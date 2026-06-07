import { redirect } from 'next/navigation'
import { createClient } from '@core/auth/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <DashboardClient user={{ email: user.email ?? '', id: user.id }} />
}
