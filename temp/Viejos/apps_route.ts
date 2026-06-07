import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AppRow = {
  id: string
  name_es: string
  supabase_project_id: string | null
  access: string
  auth_mode: string
  status: string
  vercel_project_id: string | null
  email_verification: boolean
}

const ACCESS_VALUES = ['public', 'restricted']
const AUTH_MODE_VALUES = ['standalone', 'ecosystem']

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('portals')
    .select('id, name_es, supabase_project_id, access, auth_mode, status, vercel_project_id, email_verification')
    .order('name_es', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ apps: (data as AppRow[] | null) ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()

  let body: {
    id?: string
    supabase_project_id?: string | null
    access?: string
    auth_mode?: string
    vercel_project_id?: string | null
    email_verification?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { id, supabase_project_id, access, auth_mode, vercel_project_id, email_verification } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const patch: Record<string, string | null | boolean> = {}
  if (supabase_project_id !== undefined) patch.supabase_project_id = supabase_project_id || null
  if (vercel_project_id !== undefined) patch.vercel_project_id = vercel_project_id || null
  if (email_verification !== undefined) patch.email_verification = !!email_verification
  if (access !== undefined) {
    if (!ACCESS_VALUES.includes(access)) return NextResponse.json({ error: 'access inválido' }, { status: 400 })
    patch.access = access
  }
  if (auth_mode !== undefined) {
    if (!AUTH_MODE_VALUES.includes(auth_mode)) return NextResponse.json({ error: 'auth_mode inválido' }, { status: 400 })
    patch.auth_mode = auth_mode
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const { error } = await supabase.from('portals').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
