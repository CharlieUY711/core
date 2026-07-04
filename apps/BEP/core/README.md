# CORE — Monorepo

Monorepo gestionado con **pnpm workspaces** + **Turborepo**. Deploy en **Vercel**.

## Estructura

```
apps/
  core-market/       Tienda / marketplace
  core-dashboard/    Dashboard general
  core-bep/          Bid Engineering Platform ← nueva

packages/
  ui/                Componentes compartidos (shadcn base)
  supabase/          Clientes Supabase + tipos generados
  auth/              Lógica de auth compartida
  config/            Tailwind, ESLint, TypeScript base

tools/               Herramientas internas
```

## Requisitos

- Node.js ≥ 20
- pnpm 10.0.0 (`corepack enable && corepack prepare pnpm@10.0.0 --activate`)

## Inicio rápido

```bash
# Desde la raíz del repo (C:\Carlos\Core\BEP)
pnpm install

# Levantar BEP en desarrollo
pnpm --filter core-bep dev

# Levantar todo
pnpm dev
```

## Variables de entorno

Cada app tiene su `.env.example`. Copiarlo a `.env.local` y completar los valores.

```bash
cp apps/core-bep/.env.example apps/core-bep/.env.local
```

### BEP — Supabase

Proyecto Supabase: `zuasvnngkvdywbcebaqf.supabase.co`

Las claves se obtienen desde: **Supabase Dashboard → Project Settings → API**

```env
NEXT_PUBLIC_BEP_SUPABASE_URL=https://zuasvnngkvdywbcebaqf.supabase.co
NEXT_PUBLIC_BEP_SUPABASE_ANON_KEY=...
BEP_SUPABASE_SERVICE_ROLE_KEY=...
```

## Base de datos

La migración completa está en:

```
apps/core-bep/supabase/migrations/0001_initial_schema.sql
```

Para aplicarla: copiar el contenido y ejecutarlo en **Supabase Dashboard → SQL Editor**.

## Deploy en Vercel

El `vercel.json` en la raíz está configurado para `core-bep`.
- Root Directory: vacío (apunta a la raíz del repo)
- El build filtra solo la app correcta con `pnpm --filter core-bep build`

## Convenciones

- Dependencias internas: `"@core/supabase": "workspace:*"` — nunca `file:../../...`
- Un único `pnpm-lock.yaml` en la raíz
- `pnpm install` siempre desde la raíz
