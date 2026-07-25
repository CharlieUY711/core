# core-orquesta — Plan de Inicio Completo
## Setup · Arquitectura · Módulos reutilizados · Deploy

---

## 1. Lo que tenemos y cómo lo usamos

### Inventario de módulos aprovechables

| Módulo | Estado | Cómo lo usamos en orquesta |
|---|---|---|
| **`@core/bep-supabase`** | ✅ Listo | Mismo cliente Supabase que BEP. Mismas tablas `api_vault`, `tenants` |
| **`@core/core-apivault`** | ✅ Listo | Keys de Anthropic/OpenAI vienen de acá. `useApiVault` + `fetchVaultEntries` |
| **`@core/shell`** | ✅ Listo | `ShellLayout` + `ShellTopbar` + `ShellSidebar` — el chrome de la app |
| **`@core/core-i18n`** | ✅ Listo | ES/EN/PT ya implementados |
| **`tool-editor`** | ✅ Listo | Lo embebemos en DocumentsTab para editar docs generados |
| **`core-GenRRSS`** | ✅ Listo | Lo embebemos para publicar señales/eventos en redes |
| **`tool-dashboard`** | ⚠️ Referencia | Mismo patrón de AdminLayout — lo replicamos con `@core/shell` |
| **Auth (BEP pattern)** | ✅ Listo | Mismo Supabase project, mismo `createBrowserClient` / `createServerClient` |
| **AI (BEP route)** | ✅ Listo | Copiamos el patrón: Anthropic primero → OpenAI fallback |

### Módulos que NO usamos (por ahora)
- `@core/commerce`, `@core/rewards`, `@core/game-ui` — no aplican
- `tool-biblio` — Next.js 14 con paquetes `@charlieuy711/*` legacy, no compatibles directo

---

## 2. Stack definitivo

```
Runtime:     Vite 5 + React 18 + TypeScript 5
Framework:   SPA (mismo patrón que tool-dashboard y core-market)
Styling:     Tailwind CSS v4 (via @core/bep-config)
Auth:        Supabase BEP project — mismo que core-bep
             createBrowserClient de @supabase/ssr
Keys IA:     @core/core-apivault — Anthropic (primario) + OpenAI (fallback)
Estado:      Zustand (useApiVault ya lo usa, consistente)
Queries:     @tanstack/react-query v5
Forms:       react-hook-form + zod
Iconos:      lucide-react
Shell/Nav:   @core/shell (ShellLayout, ShellTopbar, ShellSidebar)
i18n:        @core/core-i18n (es/en/pt)
Deploy:      Vercel — mismo proyecto CORE, filter core-orquesta
```

---

## 3. Variables de entorno

La app hereda todo del `.env.local` de BEP — **no creamos variables nuevas**.

```env
# C:\CORE\apps\core-orquesta\.env.local
# Copiar de apps\core-bep\.env.local

VITE_BEP_SUPABASE_URL=https://zuasvnngkvdywbcebaqf.supabase.co
VITE_BEP_SUPABASE_ANON_KEY=eyJhbGci...   # el anon key de BEP

# Las API keys NO van en .env del frontend — las lee el servidor via api_vault
# El vault las sirve al cliente ya resueltas, nunca expone las raw keys
```

Las keys de Anthropic y OpenAI **nunca tocan el frontend**. El flujo es:
```
Frontend → Edge Function de Supabase → api_vault (service role) → Anthropic/OpenAI
```

---

## 4. Estructura de carpetas

```
C:\CORE\apps\core-orquesta\
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts          ← extiende @core/bep-config
├── index.html
├── .env.local                  ← solo VITE_BEP_SUPABASE_URL + ANON_KEY
│
└── src/
    ├── main.tsx                ← entry: monta <App /> con providers
    ├── App.tsx                 ← Router + AuthGuard + ShellLayout
    │
    ├── lib/
    │   ├── supabase.ts         ← createBrowserClient (igual que core-bep/client.ts)
    │   └── vault.ts            ← wrapper de useApiVault con el supabase client
    │
    ├── routes/
    │   ├── index.tsx           ← / → redirect a /dashboard
    │   ├── login.tsx           ← página de login (Supabase Auth UI)
    │   └── dashboard.tsx       ← layout principal con LeftPanel + RightPanel
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx    ← wrappea @core/shell con nav de orquesta
    │   │   ├── LeftPanel.tsx   ← panel de motores enchufables
    │   │   └── RightPanel.tsx  ← generador de contexto (tabs)
    │   │
    │   ├── motors/
    │   │   ├── MotorCard.tsx
    │   │   ├── MotorDetailPanel.tsx
    │   │   ├── ConfigModal.tsx
    │   │   └── AddMotorModal.tsx
    │   │
    │   ├── tabs/
    │   │   ├── ProfileTab.tsx
    │   │   ├── SignalsTab.tsx
    │   │   ├── EventsTab.tsx
    │   │   ├── DocumentsTab.tsx    ← embebe tool-editor para edición
    │   │   └── RelationsTab.tsx
    │   │
    │   └── shared/
    │       ├── GlobalConfigModal.tsx
    │       ├── CredentialsModal.tsx  ← usa ApiVaultPage de @core/core-apivault
    │       └── Toast.tsx
    │
    ├── hooks/
    │   ├── useMotors.ts         ← CRUD motores en Supabase
    │   ├── useCompanies.ts      ← empresas monitoreadas
    │   ├── useSignals.ts        ← señales (realtime)
    │   └── useAI.ts            ← llama a Edge Function con key del vault
    │
    ├── stores/
    │   └── orquesta.store.ts    ← Zustand: motor activo, empresa activa, UI
    │
    ├── types/
    │   └── orquesta.types.ts    ← Motor, Signal, Company, Event, Credential
    │
    └── data/
        └── mock.ts              ← datos de prueba solo en dev
```

---

## 5. package.json de core-orquesta

```json
{
  "name": "core-orquesta",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":       "vite --port 5174",
    "build":     "tsc && vite build",
    "preview":   "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@core/bep-supabase":   "workspace:*",
    "@core/core-apivault":  "workspace:*",
    "@core/shell":          "workspace:*",
    "@core/core-i18n":      "workspace:*",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr":         "^0.6",
    "@tanstack/react-query": "^5",
    "react":                 "^18",
    "react-dom":             "^18",
    "react-router-dom":      "^6",
    "react-hook-form":       "^7",
    "@hookform/resolvers":   "^3",
    "zod":                   "^3",
    "zustand":               "^4",
    "lucide-react":          "latest",
    "clsx":                  "^2",
    "tailwind-merge":        "^2"
  },
  "devDependencies": {
    "@core/bep-config":       "workspace:*",
    "@types/react":           "^18",
    "@types/react-dom":       "^18",
    "@vitejs/plugin-react":   "^4",
    "typescript":             "^5",
    "vite":                   "^5",
    "tailwindcss":            "^4"
  }
}
```

---

## 6. Flujo de Auth — mismo que BEP, cero duplicación

```typescript
// src/lib/supabase.ts — idéntico a core-bep/src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@core/bep-supabase/bep/types'

export const supabase = createBrowserClient<Database>(
  import.meta.env.VITE_BEP_SUPABASE_URL,
  import.meta.env.VITE_BEP_SUPABASE_ANON_KEY
)
```

```typescript
// src/App.tsx — AuthGuard con redirect a /login
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Si no hay sesión → /login
// Si hay sesión → ShellLayout con las rutas de orquesta
```

Login page: Supabase Auth UI embebida — mismo componente que usa BEP.
**No escribimos un login propio.**

---

## 7. Flujo de keys IA — via api_vault, nunca en el frontend

```
┌─────────────────────────────────────────────────┐
│  Frontend (core-orquesta)                        │
│                                                  │
│  useAI() → POST /api/orquesta/generate           │
│            { prompt, motorId, companyId }        │
└─────────────────────────┬───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────┐
│  Supabase Edge Function: orquesta-generate       │
│                                                  │
│  1. Verifica JWT del usuario                     │
│  2. Lee api_vault WHERE platform='Anthropic'     │
│     usando SERVICE_ROLE_KEY                      │
│  3. Llama Anthropic con la key del vault         │
│  4. Fallback a OpenAI si falla                   │
│  5. Retorna resultado al frontend                │
└─────────────────────────────────────────────────┘
```

El patrón de la Edge Function es **idéntico al route.ts de core-bep** — Anthropic primero, OpenAI fallback, parseo JSON, guardado en Supabase.

---

## 8. Módulos embebidos — cómo se integran

### tool-editor en DocumentsTab
```typescript
// src/components/tabs/DocumentsTab.tsx
// tool-editor está en tools/tool-editor/src/components/ToolEditor.jsx
// Lo importamos directo como path alias en vite.config.ts

import { ToolEditor } from '@tools/tool-editor'

// Se muestra cuando el usuario quiere editar un documento generado
```

### core-GenRRSS en SignalsTab / EventsTab
```typescript
// src/components/tabs/SignalsTab.tsx
// GenRRSS está en tools/core-GenRRSS/src/app/admin/meta-social/
// Botón "Publicar en redes" abre el SocialPostGenerator como modal

import { SocialPostGenerator } from '@tools/genrrss'
```

### ApiVaultPage en CredentialsModal
```typescript
// src/components/shared/CredentialsModal.tsx
import { ApiVaultPage } from '@core/core-apivault/components'

// La modal de credenciales ES el ApiVaultPage ya construido
// Filtramos por appId='core-orquesta' para mostrar solo las keys relevantes
<ApiVaultPage
  supabase={supabase}
  appId="core-orquesta"
/>
```

---

## 9. Tablas de Supabase necesarias

Mismo proyecto BEP (`zuasvnngkvdywbcebaqf`). Necesitamos agregar:

```sql
-- Motores enchufables
create table orquesta_motors (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  name         text not null,
  description  text,
  icon         text default 'globe',
  status       text default 'inactive',  -- active | inactive | error
  version      text default '1.0.0',
  interval_min int  default 30,
  sources      text[] default '{}',
  detail_level text default 'Estándar',
  fallback     text,
  companies    text[] default '{}',
  last_run_at  timestamptz,
  logs         jsonb default '[]',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Empresas monitoreadas
create table orquesta_companies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  industry    text,
  location    text,
  size        text,
  activity    text default 'low',  -- high | medium | low
  summary     text,
  verticals   jsonb default '[]',
  created_at  timestamptz default now()
);

-- Señales detectadas
create table orquesta_signals (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references orquesta_companies,
  motor_id    uuid references orquesta_motors,
  user_id     uuid references auth.users not null,
  title       text not null,
  description text,
  source      text,
  priority    text default 'media',  -- alta | media | baja
  status      text default 'nueva',  -- nueva | procesada | ignorada
  created_at  timestamptz default now()
);

-- Eventos detectados
create table orquesta_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references orquesta_companies,
  motor_id    uuid references orquesta_motors,
  user_id     uuid references auth.users not null,
  type        text not null,  -- expansion | financiero | talento | producto | alianza | riesgo
  description text not null,
  date        date,
  created_at  timestamptz default now()
);

-- Documentos generados
create table orquesta_documents (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references orquesta_companies,
  user_id      uuid references auth.users not null,
  title        text not null,
  type         text default 'perfil',  -- perfil | reporte | brief | alerta
  content      text,
  pages        int default 1,
  generated_at timestamptz default now()
);

-- RLS: cada usuario ve solo sus datos
alter table orquesta_motors    enable row level security;
alter table orquesta_companies enable row level security;
alter table orquesta_signals   enable row level security;
alter table orquesta_events    enable row level security;
alter table orquesta_documents enable row level security;

create policy "own data" on orquesta_motors    using (auth.uid() = user_id);
create policy "own data" on orquesta_companies using (auth.uid() = user_id);
create policy "own data" on orquesta_signals   using (auth.uid() = user_id);
create policy "own data" on orquesta_events    using (auth.uid() = user_id);
create policy "own data" on orquesta_documents using (auth.uid() = user_id);
```

---

## 10. vercel.json — agregar a C:\CORE\vercel.json

El vercel.json actual apunta a `core-market`. Para orquesta, en Vercel crear un **proyecto separado** apuntando al mismo repo:

```json
{
  "installCommand": "corepack enable && pnpm install --frozen-lockfile",
  "buildCommand":   "pnpm --filter core-orquesta build",
  "outputDirectory": "apps/core-orquesta/dist",
  "regions": ["iad1"]
}
```

Variables de entorno en Vercel (mismo proyecto Supabase):
```
VITE_BEP_SUPABASE_URL      = https://zuasvnngkvdywbcebaqf.supabase.co
VITE_BEP_SUPABASE_ANON_KEY = eyJhbGci...
```

---

## 11. turbo.json — agregar output

```json
{
  "tasks": {
    "build": {
      "outputs": [
        "apps/core-landing/.next/**",
        "apps/core-market/dist/**",
        "apps/core-orquesta/dist/**"
      ]
    }
  }
}
```

---

## 12. Alias de Vite para módulos internos

```typescript
// apps/core-orquesta/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@':           path.resolve(__dirname, './src'),
      '@tools/tool-editor': path.resolve(__dirname, '../../tools/tool-editor/src'),
      '@tools/genrrss':     path.resolve(__dirname, '../../tools/core-GenRRSS/src/app/admin/meta-social'),
    }
  }
})
```

---

## 13. Plan de ejecución — orden exacto

### PASO 1 — Repo remoto y scaffold (30 min)
```bash
# En GitHub: crear repo "core-orquesta" O usar el mismo repo CORE
# Si usamos el monorepo CORE (recomendado):

cd C:\CORE
mkdir apps\core-orquesta
cd apps\core-orquesta
```
→ Yo genero todos los archivos base: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

### PASO 2 — Supabase migrations (15 min)
```bash
# Desde C:\CORE
supabase migration new orquesta_tables
# Pegar el SQL de la sección 9
supabase db push
```

### PASO 3 — Instalar y verificar workspace (5 min)
```bash
cd C:\CORE
pnpm install
pnpm --filter core-orquesta dev
# Debe levantar en localhost:5174
```

### PASO 4 — Auth y Shell (yo genero el código)
- `src/lib/supabase.ts`
- `src/App.tsx` con AuthGuard
- `src/routes/login.tsx`
- `src/components/layout/AppShell.tsx`

### PASO 5 — Componentes principales (yo genero el código)
- LeftPanel + MotorCard + ConfigModal + AddMotorModal
- RightPanel + 5 tabs
- Hooks de Supabase para cada entidad

### PASO 6 — Edge Function IA
```bash
supabase functions new orquesta-generate
# Yo genero el código — igual que route.ts de BEP
supabase functions deploy orquesta-generate
```

### PASO 7 — Vercel deploy
```bash
# En vercel.com: nuevo proyecto → mismo repo CORE
# Build command: pnpm --filter core-orquesta build
# Output: apps/core-orquesta/dist
# Agregar env vars
```

---

## 14. Preguntas resueltas

| Pregunta | Decisión |
|---|---|
| ¿Qué IA usamos? | Anthropic (claude-sonnet-4-6) primario, OpenAI (gpt-4o-mini) fallback — igual que BEP |
| ¿Cómo manejamos las keys? | `@core/core-apivault` — las keys viven en la tabla `api_vault` del Supabase BEP |
| ¿Mismo Supabase que BEP? | Sí — mismo proyecto `zuasvnngkvdywbcebaqf`, nuevas tablas prefijadas `orquesta_*` |
| ¿Grafo de relaciones? | SVG manual primero (ya está hecho), React Flow en v2 si se necesita |
| ¿Login propio? | No — Supabase Auth UI, mismo que BEP |
| ¿Dashboard shell? | `@core/shell` — ShellLayout + ShellTopbar + ShellSidebar |
| ¿Repo remoto? | Monorepo CORE existente — no repo separado |
| ¿Deploy? | Proyecto Vercel nuevo apuntando al mismo repo, filter `core-orquesta` |

---

## 15. Lo que hago yo, lo que hacés vos

### Yo genero (código listo para copiar/pegar o crear directo):
- Todos los archivos de `src/` completos
- `package.json`, `vite.config.ts`, `tsconfig.json`
- SQL de migrations
- Edge Function de Supabase
- `vercel.json` actualizado

### Vos ejecutás:
1. `mkdir apps\core-orquesta` y copiás los archivos
2. `pnpm install` desde `C:\CORE`
3. SQL en Supabase dashboard
4. `supabase functions deploy orquesta-generate`
5. Configurar proyecto en Vercel

---

**¿Arrancamos con el PASO 1?** Genero todos los archivos del scaffold base en orden.
