import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type VercelDeployment = {
  uid: string
  state?: string
  readyState?: string
  created: number
  url?: string
  target?: string | null
  meta?: Record<string, string>
}

export async function GET(req: Request) {
  const supabase = await createClient()

  // Guard admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })

  const projectId = new URL(req.url).searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'Falta project_id' }, { status: 400 })

  const { data: cfg } = await supabase
    .from('workspace_config')
    .select('value')
    .eq('key', 'vercel_token')
    .maybeSingle()

  const token = (cfg?.value as string) || process.env.VERCEL_TOKEN || ''
  if (!token) return NextResponse.json({ error: 'Falta vercel_token en Settings.' }, { status: 400 })

  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=6`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    const txt = await res.text()
    return NextResponse.json({ error: `Vercel: ${txt.slice(0, 200)}` }, { status: 400 })
  }

  const json = (await res.json()) as { deployments?: VercelDeployment[] }
  const deployments = (json.deployments ?? []).map((d) => ({
    uid: d.uid,
    state: d.state || d.readyState || 'UNKNOWN',
    created: d.created,
    url: d.url ? `https://${d.url}` : null,
    target: d.target ?? null,
    branch: d.meta?.githubCommitRef ?? null,
    commit_message: d.meta?.githubCommitMessage ?? null,
  }))

  return NextResponse.json({ deployments })
}
