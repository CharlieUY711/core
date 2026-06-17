import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SELECT = 'id, name_es, supabase_project_id, access, auth_mode, status, vercel_project_id, email_verification, palette_id, design_id, archived, repo_url'
const ACCESS_VALUES = ['public', 'restricted']
const AUTH_MODE_VALUES = ['standalone', 'ecosystem']

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') return { error: NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 }) }
  return { error: null }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { error: guard } = await requireAdmin(supabase)
  if (guard) return guard

  const id = new URL(req.url).searchParams.get('id')
  if (id) {
    const { data, error } = await supabase.from('portals').select(SELECT).eq('id', id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ app: data })
  }

  const { data, error } = await supabase.from('portals').select(SELECT).order('name_es', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ apps: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { error: guard } = await requireAdmin(supabase)
  if (guard) return guard

  let body: {
    id?: string
    supabase_project_id?: string | null
    access?: string
    auth_mode?: string
    vercel_project_id?: string | null
    email_verification?: boolean
    palette_id?: string | null
    design_id?: string | null
    archived?: boolean
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { id, supabase_project_id, access, auth_mode, vercel_project_id, email_verification, palette_id, design_id, archived } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const patch: Record<string, string | null | boolean> = {}
  if (supabase_project_id !== undefined) patch.supabase_project_id = supabase_project_id || null
  if (vercel_project_id !== undefined) patch.vercel_project_id = vercel_project_id || null
  if (email_verification !== undefined) patch.email_verification = !!email_verification
  if (palette_id !== undefined) patch.palette_id = palette_id || null
  if (design_id !== undefined) patch.design_id = design_id || null
  if (archived !== undefined) patch.archived = !!archived
  if (access !== undefined) {
    if (!ACCESS_VALUES.includes(access)) return NextResponse.json({ error: 'access inválido' }, { status: 400 })
    patch.access = access
  }
  if (auth_mode !== undefined) {
    if (!AUTH_MODE_VALUES.includes(auth_mode)) return NextResponse.json({ error: 'auth_mode inválido' }, { status: 400 })
    patch.auth_mode = auth_mode
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })

  const { error } = await supabase.from('portals').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
