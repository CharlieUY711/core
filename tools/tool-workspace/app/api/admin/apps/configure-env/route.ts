import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const WORKSPACE_URL = process.env.NEXT_PUBLIC_WORKSPACE_URL || 'https://workspace.core.com.uy'
const TARGETS = ['production', 'preview', 'development']

function genSecret(): string {
  const a = new Uint8Array(32)
  crypto.getRandomValues(a)
  let bin = ''
  for (let i = 0; i < a.length; i++) bin += String.fromCharCode(a[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function POST(req: Request) {
  const supabase = await createClient()

  // --- Guard: solo admin ---
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })

  let body: { app_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const appId = body.app_id
  if (!appId) return NextResponse.json({ error: 'Falta app_id' }, { status: 400 })

  // App + su proyecto Vercel
  const { data: app } = await supabase
    .from('portals')
    .select('id, vercel_project_id')
    .eq('id', appId)
    .maybeSingle()

  if (!app) return NextResponse.json({ error: 'App no encontrada' }, { status: 404 })
  if (!app.vercel_project_id) {
    return NextResponse.json({ error: 'La app no tiene vercel_project_id. Cargalo primero.' }, { status: 400 })
  }

  // Tokens / secreto desde config
  const { data: cfgRows } = await supabase
    .from('workspace_config')
    .select('key, value')
    .in('key', ['vercel_token', 'core_access_secret'])

  const cfg: Record<string, string> = {}
  ;(cfgRows as { key: string; value: string }[] | null ?? []).forEach((r) => { cfg[r.key] = r.value })

  const vercelToken = cfg['vercel_token'] || process.env.VERCEL_TOKEN || ''
  if (!vercelToken) return NextResponse.json({ error: 'Falta vercel_token en Settings.' }, { status: 400 })

  // Secreto compartido: si no existe, lo generamos y guardamos una vez
  let secret = cfg['core_access_secret']
  if (!secret) {
    secret = genSecret()
    await supabase.from('workspace_config').upsert(
      { key: 'core_access_secret', value: secret, label: 'CORE Access Secret', updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  }

  const vars = [
    { key: 'CORE_ACCESS_SECRET', value: secret, type: 'encrypted' },
    { key: 'CORE_APP_ID', value: app.id, type: 'plain' },
    { key: 'NEXT_PUBLIC_CORE_APP_ID', value: app.id, type: 'plain' },
    { key: 'NEXT_PUBLIC_WORKSPACE_URL', value: WORKSPACE_URL, type: 'plain' },
  ]

  // Upsert de cada env var en el proyecto Vercel
  const results: { key: string; ok: boolean; error?: string }[] = []
  for (const v of vars) {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${app.vercel_project_id}/env?upsert=true`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: v.key, value: v.value, type: v.type, target: TARGETS }),
      }
    )
    if (res.ok) {
      results.push({ key: v.key, ok: true })
    } else {
      const txt = await res.text()
      results.push({ key: v.key, ok: false, error: txt.slice(0, 200) })
    }
  }

  const envBlock =
    `CORE_ACCESS_SECRET=${secret}\n` +
    `CORE_APP_ID=${app.id}\n` +
    `NEXT_PUBLIC_CORE_APP_ID=${app.id}\n` +
    `NEXT_PUBLIC_WORKSPACE_URL=${WORKSPACE_URL}`

  const allOk = results.every((r) => r.ok)
  return NextResponse.json({ ok: allOk, results, env_block: envBlock })
}
