// @core/auth — Public API
// ═══════════════════════════════════════════════════════════════
// CÓMO USAR EN CADA APP:
//
// 1. middleware.ts de la app:
//    import { createCoreMiddleware, defaultMatcher } from '@core/auth/middleware'
//    export const middleware = createCoreMiddleware({
//      publicRoutes: ['/login'],
//      loginRoute: '/login',
//      defaultRedirect: '/dashboard',
//    })
//    export const config = { matcher: defaultMatcher }
//
// 2. Supabase client (browser):
//    import { createClient } from '@core/auth/client'
//
// 3. Supabase client (server components):
//    import { createServerSupabaseClient } from '@core/auth/server'
//
// 4. Componentes UI:
//    import { Button, Input } from '@core/auth/components'
//
// 5. Login page — copiar de core-biblio/app/login/page.tsx
//    y adaptar el redirect destino según la app
// ═══════════════════════════════════════════════════════════════

export { createClient }                  from './supabase/client'
export { createServerSupabaseClient }    from './supabase/server'
export { createCoreMiddleware, defaultMatcher } from './middleware'
export type { CoreMiddlewareOptions }    from './middleware'
export { Button, Input }                 from './components/index'
export type { Database, Json }           from './types/supabase'
