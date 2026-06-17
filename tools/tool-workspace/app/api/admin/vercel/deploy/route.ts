import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ProjectLink = {
  type?: string
  repoId?: number | string
  repo?: string
  org?: string
  productionBranch?: string
}

export async function POST(req: Request) {
  const supabase = await createClient()

  // Guard admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })

  let body: { project_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const projectId = body.project_id
  if (!projectId) return NextResponse.json({ error: 'Falta project_id' }, { status: 400 })

  const { data: cfg } = await supabase
    .from('workspace_config')
    .select('value')
    .eq('key', 'vercel_token')
    .maybeSingle()

  const token = (cfg?.value as string) || process.env.VERCEL_TOKEN || ''
  if (!token) return NextResponse.json({ error: 'Falta vercel_token en Settings.' }, { status: 400 })

  // 1. Datos del proyecto (para sacar el repo conectado)
  const projRes = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!projRes.ok) {
    const txt = await projRes.text()
    return NextResponse.json({ error: `Vercel (proyecto): ${txt.slice(0, 200)}` }, { status: 400 })
  }
  const project = (await projRes.json()) as { name: string; link?: ProjectLink }
  const link = project.link
  if (!link || !link.repoId || !link.type) {
    return NextResponse.json({ error: 'El proyecto no tiene un repo Git conectado en Vercel.' }, { status: 400 })
  }

  // 2. Crear el deployment desde el git source
  const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: project.name,
      project: projectId,
      target: 'production',
      gitSource: {
        type: link.type,
        repoId: link.repoId,
        ref: link.productionBranch || 'main',
      },
    }),
  })

  const deployJson = (await deployRes.json()) as { id?: string; url?: string; error?: { message?: string } }
  if (!deployRes.ok) {
    return NextResponse.json(
      { error: deployJson.error?.message || 'No se pudo disparar el deploy.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    id: deployJson.id,
    url: deployJson.url ? `https://${deployJson.url}` : null,
  })
}
