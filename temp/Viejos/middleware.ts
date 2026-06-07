// middleware.ts  (raíz del proyecto de cada app)
import { NextRequest, NextResponse } from 'next/server'
import { signToken, verifyToken } from '@/lib/core-access'

const WORKSPACE_URL = process.env.NEXT_PUBLIC_WORKSPACE_URL || 'https://workspace.core.com.uy'
const APP_ID = process.env.CORE_APP_ID || ''
const SECRET = process.env.CORE_ACCESS_SECRET || ''
const SESSION_HOURS = 12
const COOKIE = 'core_session'

// Cache en memoria del isolate (TTL 60s) para no pegarle a Workspace en cada request
let cache: { value: { access: string; auth_mode: string }; t: number } | null = null

async function getAppAccess(): Promise<{ access: string; auth_mode: string } | null> {
  if (cache && Date.now() - cache.t < 60_000) return cache.value
  try {
    const res = await fetch(`${WORKSPACE_URL}/api/public/app-access?app_id=${encodeURIComponent(APP_ID)}`)
    if (!res.ok) return null
    const data = (await res.json()) as { access: string; auth_mode: string }
    cache = { value: { access: data.access, auth_mode: data.auth_mode }, t: Date.now() }
    return cache.value
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  // Sin configurar → no gatea (no rompe la app)
  if (!APP_ID || !SECRET) return NextResponse.next()

  const cfg = await getAppAccess()
  // No restringida (o no se pudo leer) → abierta
  if (!cfg || cfg.access !== 'restricted') return NextResponse.next()
  // Stand alone → la app maneja su propio login, no nos metemos
  if (cfg.auth_mode === 'standalone') return NextResponse.next()

  // --- Ecosistema restringido ---
  const url = req.nextUrl

  // 1. ¿Viene con token desde Workspace? → canjear por cookie de sesión
  const token = url.searchParams.get('__core')
  if (token) {
    const payload = await verifyToken(token, SECRET)
    if (payload && payload.app === APP_ID) {
      const session = await signToken(
        { app: APP_ID, sub: payload.sub, exp: Date.now() + SESSION_HOURS * 3600 * 1000 },
        SECRET
      )
      const clean = url.clone()
      clean.searchParams.delete('__core')
      const res = NextResponse.redirect(clean)
      res.cookies.set(COOKIE, session, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_HOURS * 3600,
      })
      return res
    }
  }

  // 2. ¿Ya tiene cookie de sesión válida?
  const cookie = req.cookies.get(COOKIE)?.value
  if (cookie && (await verifyToken(cookie, SECRET))) {
    return NextResponse.next()
  }

  // 3. Sin acceso → gate
  const gate = url.clone()
  gate.pathname = '/gate'
  gate.search = ''
  return NextResponse.rewrite(gate)
}

export const config = {
  // Gatea todo menos assets, api y la propia /gate
  matcher: ['/((?!_next|api|gate|favicon.ico|.*\\..*).*)'],
}
