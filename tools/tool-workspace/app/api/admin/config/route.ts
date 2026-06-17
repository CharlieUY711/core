import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ConfigRow = { key: string; label: string | null; value: string; is_secret: boolean }

// GET: lista las claves de config. Para las secretas NO devuelve el valor,
// solo si está cargado o no (has_value).
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_config')
    .select('key, label, value, is_secret')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data as ConfigRow[] | null ?? []).map((r) => ({
    key: r.key,
    label: r.label,
    is_secret: r.is_secret,
    has_value: !!(r.value && r.value.length > 0),
    value: r.is_secret ? undefined : r.value,
  }))

  return NextResponse.json({ items })
}

// POST: actualiza (o crea) una clave de config.
export async function POST(req: Request) {
  const supabase = await createClient()

  let body: { key?: string; value?: string; label?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { key, value, label } = body
  if (!key || typeof value !== 'string') {
    return NextResponse.json({ error: 'Falta key o value' }, { status: 400 })
  }

  const { error } = await supabase
    .from('workspace_config')
    .upsert(
      { key, value, label: label ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
