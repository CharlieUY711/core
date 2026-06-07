# @core/auth

Auth compartido del ecosistema CORE.
Base: core-biblio — probado en producción.

---

## Estructura

```
packages/core-auth/
├── supabase/
│   ├── client.ts     ← browser client (createClient)
│   └── server.ts     ← server client (createServerSupabaseClient)
├── components/
│   ├── Button.tsx    ← botón con loading state
│   ├── Input.tsx     ← input con label y error
│   └── index.ts
├── types/
│   └── supabase.ts   ← tipos de base de datos
├── middleware.ts      ← createCoreMiddleware()
└── index.ts          ← exports principales
```

---

## Uso en cada app Next.js

### middleware.ts
```ts
import { createCoreMiddleware, defaultMatcher } from '@core/auth/middleware'

export const middleware = createCoreMiddleware({
  publicRoutes:    ['/login'],
  loginRoute:      '/login',
  defaultRedirect: '/dashboard',  // cambiar según la app
})

export const config = { matcher: defaultMatcher }
```

### Login page (app/login/page.tsx)
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@core/auth/client'
import { Button, Input } from '@core/auth/components'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) { setError('Credenciales incorrectas.'); return }
    router.refresh()
    router.push('/dashboard')  // cambiar según la app
  }

  return (
    <main style={{ backgroundColor: '#0B1E35' }} className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleLogin} className="w-full max-w-sm px-8 py-12">
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button type="submit" loading={loading}>Ingresar</Button>
      </form>
    </main>
  )
}
```

### Server component (verificar sesión)
```ts
import { createServerSupabaseClient } from '@core/auth/server'

export default async function Page() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  // ...
}
```

---

## Notas importantes

- Usar `getSession()` en el middleware — NO `getUser()`
- El login usa `router.refresh()` ANTES de `router.push()` — ese orden es crítico
- Cada app define su propio `defaultRedirect` según su ruta principal

---

v1.0 — 2026 | CORE
