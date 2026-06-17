# CORE Biblioteca — Sistema de Autenticación

## Archivos

```
/lib/supabaseClient.ts          → Cliente Supabase (browser)
/types/supabase.ts              → Tipos de base de datos
/app/login/page.tsx             → Pantalla de login (fullscreen)
/app/aviso/page.tsx             → Pantalla de advertencia (ES/EN/PT)
/middleware.ts                  → Protección de rutas
/components/ui/Input.tsx        → Componente Input
/components/ui/Button.tsx       → Componente Button
```

## Setup

### 1. Desinstalar paquete deprecado e instalar el correcto

```bash
npm uninstall @supabase/auth-helpers-nextjs
npm install @supabase/ssr @supabase/supabase-js
```

### 2. Variables de entorno — `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://axlbccznfgzgqurxxzzi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key>
```

En Vercel: Settings → Environment Variables → agregar las mismas dos variables.

La `anon key` está en: Supabase Dashboard → Settings → API → `anon public`

### 3. Flujo

```
/login → OK → /aviso → Acepto   → /
                      → Cancelar → /login (cierra sesión)

Ruta protegida sin sesión → redirige a /login automáticamente
```

### 4. Push

```bash
cd C:\CORE\Biblioteca
git add .
git commit -m "fix: migrate to @supabase/ssr, remove deprecated auth-helpers"
git push origin main
```

---

**CORE · Biblioteca Interna · Confidencial · 2026**
