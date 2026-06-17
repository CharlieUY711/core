import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })
  return null
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const guard = await requireAdmin(supabase)
  if (guard) return guard

  const appId = new URL(req.url).searchParams.get('app_id')
  if (!appId) return NextResponse.json({ error: 'Falta app_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('app_tools').select('tool_id, enabled').eq('app_id', appId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tool_ids = (data as { tool_id: string; enabled: boolean }[] | null ?? [])
    .filter(r => r.enabled).map(r => r.tool_id)
  return NextResponse.json({ tool_ids })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const guard = await requireAdmin(supabase)
  if (guard) return guard

  let body: { app_id?: string; tool_ids?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { app_id, tool_ids } = body
  if (!app_id || !Array.isArray(tool_ids)) return NextResponse.json({ error: 'Falta app_id o tool_ids' }, { status: 400 })

  // Reemplaza el set de tools de la app
  const { error: delErr } = await supabase.from('app_tools').delete().eq('app_id', app_id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  if (tool_ids.length > 0) {
    const rows = tool_ids.map(tid => ({ app_id, tool_id: tid, enabled: true }))
    const { error: insErr } = await supabase.from('app_tools').insert(rows)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
