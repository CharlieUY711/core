import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SBProject = {
  id: string
  label: string
  project_ref: string | null
  url: string
  anon_key: string | null
}

// GET: lista los proyectos (nunca devuelve service_key)
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('supabase_projects')
    .select('id, label, project_ref, url, anon_key')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: (data as SBProject[] | null) ?? [] })
}

// POST: crea o actualiza un proyecto
export async function POST(req: Request) {
  const supabase = await createClient()

  let body: Partial<SBProject>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { id, label, url, project_ref, anon_key } = body
  if (!id || !label || !url) {
    return NextResponse.json({ error: 'Falta id, label o url' }, { status: 400 })
  }

  const { error } = await supabase
    .from('supabase_projects')
    .upsert(
      { id, label, url, project_ref: project_ref ?? null, anon_key: anon_key ?? null },
      { onConflict: 'id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: ?id=...
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { error } = await supabase.from('supabase_projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
