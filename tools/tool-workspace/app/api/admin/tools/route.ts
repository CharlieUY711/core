import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SOURCE_VALUES = ['package', 'internal', 'repo', 'service']
const STATUS_VALUES = ['live', 'dev', 'planned']

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })
  return null
}

export async function GET() {
  const supabase = await createClient()
  const guard = await requireAdmin(supabase)
  if (guard) return guard

  const { data, error } = await supabase
    .from('tools')
    .select('id, key, name, description, source, ref, category, status, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tools: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const guard = await requireAdmin(supabase)
  if (guard) return guard

  let body: {
    id?: string; name?: string; description?: string
    source?: string; ref?: string | null; category?: string
    status?: string; sort_order?: number; archived?: boolean
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const patch: Record<string, string | number | boolean | null> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.description !== undefined) patch.description = body.description
  if (body.ref !== undefined) patch.ref = body.ref || null
  if (body.category !== undefined) patch.category = body.category
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order
  if (body.archived !== undefined) patch.archived = !!body.archived
  if (body.source !== undefined) {
    if (!SOURCE_VALUES.includes(body.source)) return NextResponse.json({ error: 'source inválido' }, { status: 400 })
    patch.source = body.source
  }
  if (body.status !== undefined) {
    if (!STATUS_VALUES.includes(body.status)) return NextResponse.json({ error: 'status inválido' }, { status: 400 })
    patch.status = body.status
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  const { error } = await supabase.from('tools').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

