// @core/auth — Middleware
// Base: core-biblio/middleware.ts — probado en producción
// Usa getSession() que es lo que funciona con Next 14 + @supabase/ssr
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export interface CoreMiddlewareOptions {
  // Rutas públicas que no requieren auth (default: ['/login'])
  publicRoutes?: string[]
  // Ruta de login (default: '/login')
  loginRoute?: string
  // Ruta post-login (default: '/dashboard')
  defaultRedirect?: string
}

export function createCoreMiddleware(options: CoreMiddlewareOptions = {}) {
  const {
    publicRoutes   = ['/login'],
    loginRoute     = '/login',
    defaultRedirect = '/dashboard',
  } = options

  return async function middleware(req: NextRequest) {
    let res = NextResponse.next({ request: req })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
            res = NextResponse.next({ request: req })
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANTE: usar getSession() — no getUser()
    // getUser() hace una llamada extra al servidor y falla en Next 14
    const { data: { session } } = await supabase.auth.getSession()
    const { pathname } = req.nextUrl

    // Ruta pública
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      // Ya autenticado intentando entrar al login → redirigir
      if (session && pathname === loginRoute) {
        return NextResponse.redirect(new URL(defaultRedirect, req.url))
      }
      return res
    }

    // Ruta protegida sin sesión → redirigir al login
    if (!session) {
      const url = new URL(loginRoute, req.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    return res
  }
}

// Matcher recomendado — igual al de core-biblio
export const defaultMatcher = [
  '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
]
