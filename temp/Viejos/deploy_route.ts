import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  const supabase = await createClient()
  const { data: cfg } = await supabase
    .from('workspace_config')
    .select('value')
    .eq('key', 'vercel_token')
    .single()

  const token = cfg?.value || process.env.VERCEL_TOKEN
  if (!token) return NextResponse.json({ error: 'Vercel token no configurado' }, { status: 500 })

  // Trigger redeploy del último deployment en producción
  const listRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1&target=production`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const listData = await listRes.json()
  const lastDeploy = listData.deployments?.[0]
  if (!lastDeploy) return NextResponse.json({ error: 'No hay deployments previos' }, { status: 404 })

  // Crear nuevo deployment basado en el último
  const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: lastDeploy.name,
      deploymentId: lastDeploy.uid,
      target: 'production',
    }),
  })
  const deployData = await deployRes.json()
  if (deployData.error) return NextResponse.json({ error: deployData.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deploymentId: deployData.id })
}
