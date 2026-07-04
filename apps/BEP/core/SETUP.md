# BEP — Guía de puesta en marcha

## 1. Clonar y configurar el repo local

```bash
# Ubicación en tu máquina
cd C:\Carlos\Core\BEP

# Copiar los archivos de este paquete en la raíz
# (reemplaza si ya existe algo — BEP es app nueva)

# Instalar dependencias desde la raíz
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install
```

---

## 2. Variables de entorno

```bash
copy apps\core-bep\.env.example apps\core-bep\.env.local
```

Completar en `.env.local`:

| Variable | Dónde obtenerla |
|---|---|
| `NEXT_PUBLIC_BEP_SUPABASE_URL` | `https://zuasvnngkvdywbcebaqf.supabase.co` (ya está) |
| `NEXT_PUBLIC_BEP_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon public |
| `BEP_SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

---

## 3. Base de datos — ejecutar migraciones en Supabase

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard/project/zuasvnngkvdywbcebaqf) → **SQL Editor**
2. Ejecutar **primero**: `apps/core-bep/supabase/migrations/0001_initial_schema.sql`
3. Ejecutar **después**: `apps/core-bep/supabase/migrations/0002_storage_and_functions.sql`

> ⚠️ Asegurate de que la extensión `vector` esté habilitada en tu proyecto Supabase.
> Si no: Supabase Dashboard → Database → Extensions → buscar `vector` → habilitar.

---

## 4. Storage bucket

En Supabase Dashboard → **Storage** → crear bucket llamado `bep-documents` (privado).
O simplemente ejecutar la migración `0002` que lo crea automáticamente.

---

## 5. Levantar en desarrollo

```bash
# Solo BEP (puerto 3002)
pnpm --filter core-bep dev

# Todo el monorepo
pnpm dev
```

Abrir: http://localhost:3002

---

## 6. Primer usuario

En Supabase Dashboard → **Authentication** → **Users** → **Add user**
(o usar el botón de sign-up si lo habilitás en Auth settings).

---

## 7. Push a GitHub

```bash
cd C:\Carlos\Core\BEP

git remote add origin https://github.com/CharlieUY711/core.git
git push -u origin main
```

> Si el repo ya existe y tiene contenido, usar `git push --force-with-lease` con precaución.

---

## 8. Deploy en Vercel — BEP

1. Ir a [vercel.com](https://vercel.com) → **Add New Project**
2. Importar `github.com/CharlieUY711/core`
3. **Root Directory**: dejar **vacío** (raíz del repo)
4. **Build Command**: `pnpm --filter core-bep build`
5. **Output Directory**: `apps/core-bep/.next`
6. **Install Command**: `corepack enable && pnpm install --frozen-lockfile`
7. Agregar variables de entorno (las mismas del `.env.local`)
8. Deploy ✓

---

## 9. Deploy en Vercel — Dashboard (opcional)

Crear un segundo proyecto en Vercel apuntando al mismo repo, con:
- **Build Command**: `pnpm --filter core-dashboard build`
- **Output Directory**: `apps/core-dashboard/.next`

---

## Estructura de carpetas generada

```
C:\Carlos\Core\BEP\
├── apps/
│   ├── core-market/          (existente)
│   ├── core-dashboard/       (nuevo — shell básico)
│   └── core-bep/             (nuevo — app completa)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── projects/           ← lista + detalle
│       │   │   │   │   └── [id]/
│       │   │   │   │       ├── documents/  ← tabla + upload
│       │   │   │   │       ├── bom/        ← BOM master
│       │   │   │   │       ├── compliance/ ← matriz
│       │   │   │   │       ├── rfq/        ← cotizaciones
│       │   │   │   │       ├── risks/      ← riesgos
│       │   │   │   │       ├── queries/    ← circulares + consultas
│       │   │   │   │       └── knowledge/  ← wiki técnica
│       │   │   │   ├── documents/          ← vista global
│       │   │   │   └── [bom|compliance|...]/
│       │   │   ├── auth/login/
│       │   │   └── api/documents/process/  ← IA pipeline
│       │   ├── components/
│       │   │   ├── bep/
│       │   │   │   ├── login-form.tsx
│       │   │   │   ├── new-project-form.tsx
│       │   │   │   └── document-uploader.tsx
│       │   │   └── layout/sidebar.tsx
│       │   └── lib/supabase/{client,server}.ts
│       └── supabase/migrations/
│           ├── 0001_initial_schema.sql     ← 20+ tablas, RLS, índices
│           └── 0002_storage_and_functions.sql ← bucket, búsqueda semántica
├── packages/
│   ├── config/               ← Tailwind + TypeScript base
│   └── supabase/             ← cliente BEP + tipos completos
└── README.md
```
