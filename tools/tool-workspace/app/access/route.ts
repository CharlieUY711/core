import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SECRET = process.env.CORE_ACCESS_SECRET || ''
const LINK_TTL_MIN = 10
// AJUSTAR si tu login está en otra ruta o usa otro nombre de parámetro de retorno:
const LOGIN_PATH = '/login'
const RETURN_PARAM = 'next'

// HMAC-SHA256 con Web Crypto (idéntico al verify del lado de cada app)
function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}
async function signToken(payload: { app: string; sub?: string; exp: number }, secret: string): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return `${body}.${b64url(new Uint8Array(sig))}`
}

export async function GET(req: NextRequest) {
  const appId = req.nextUrl.searchParams.get('app')
  if (!appId) return NextResponse.json({ error: 'Falta app' }, { status: 400 })
  if (!SECRET) return NextResponse.json({ error: 'CORE_ACCESS_SECRET no configurado' }, { status: 500 })

  const supabase = await createClient()

  // Datos de la app (la URL destino sale de la tabla → anti open-redirect)
  const { data: app } = await supabase
    .from('portals')
    .select('url, access, auth_mode, name_es')
    .eq('id', appId)
    .maybeSingle()

  if (!app || !app.url) {
    return NextResponse.json({ error: 'App no encontrada o sin URL' }, { status: 404 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Sin sesión → a login y volver acá
  if (!user) {
    const login = new URL(LOGIN_PATH, req.nextUrl.origin)
    login.searchParams.set(RETURN_PARAM, `/access?app=${encodeURIComponent(appId)}`)
    return NextResponse.redirect(login)
  }

  // Chequeo de rol
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role
  const allowed = role === 'admin' || role === 'user'

  // Sin permiso → de vuelta a la app (mostrará el gate con "contactá con CORE")
  if (!allowed) {
    return NextResponse.redirect(new URL(app.url))
  }

  // Emitir token corto y redirigir a la app
  const token = await signToken(
    { app: appId, sub: user.email ?? user.id, exp: Date.now() + LINK_TTL_MIN * 60 * 1000 },
    SECRET
  )
  const dest = new URL(app.url)
  dest.searchParams.set('__core', token)
  return NextResponse.redirect(dest)
}
