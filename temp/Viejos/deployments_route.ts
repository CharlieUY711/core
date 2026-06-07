import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  // Leer token desde Supabase (nunca desde el cliente)
  const supabase = await createClient()
  const { data: cfg } = await supabase
    .from('workspace_config')
    .select('value')
    .eq('key', 'vercel_token')
    .single()

  const token = cfg?.value || process.env.VERCEL_TOKEN
  if (!token) return NextResponse.json({ error: 'Vercel token no configurado' }, { status: 500 })

  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1&target=production`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } }
  )
  const data = await res.json()
  const deployment = data.deployments?.[0] ?? null
  return NextResponse.json({ deployment })
}
