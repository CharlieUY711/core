# CORE Workspace

Portal de acceso único al ecosistema interno de CORE.

Un solo login — acceso a todos los portales internos.

---

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase Auth (mismo proyecto que core-biblio)

---

## Portales disponibles

| Portal | Estado | URL (dev) |
|---|---|---|
| Biblioteca CORE | Live | localhost:3001 |
| Foundation | Live | localhost:3002 |
| Presentaciones | Live | localhost:3003 |
| CORE Market | En desarrollo | localhost:3004 |

---

## Setup inicial

### 1. Clonar el repo

```bash
git clone https://github.com/CharlieUY711/core-workspace.git
cd core-workspace
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

Copiar el ejemplo y completar con los datos reales:

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:

```env
# Supabase — mismo proyecto que core-biblio
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY

# URLs de los portales
NEXT_PUBLIC_URL_BIBLIO=http://localhost:3001
NEXT_PUBLIC_URL_FOUNDATION=http://localhost:3002
NEXT_PUBLIC_URL_PRESENTACIONES=http://localhost:3003
NEXT_PUBLIC_URL_MARKET=http://localhost:3004

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Correr en desarrollo

```bash
npm run dev
# → http://localhost:3000
```

---

## Estructura del proyecto

```
core-workspace/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Redirect a login o dashboard
│   ├── globals.css         # Design system base
│   ├── login/
│   │   ├── page.tsx        # Server: chequea sesión
│   │   └── LoginForm.tsx   # Client: formulario con i18n
│   ├── dashboard/
│   │   ├── page.tsx        # Server: protege ruta
│   │   └── DashboardClient.tsx  # Client: workspace de portales
│   └── api/auth/logout/
│       └── route.ts        # POST logout
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser client
│   │   └── server.ts       # Server client
│   ├── i18n.ts             # Traducciones ES / EN / PT
│   └── portals.ts          # Definición de portales
├── middleware.ts            # Protección de rutas
└── .env.local.example      # Variables necesarias
```

---

## Agregar un nuevo portal

Editar `lib/portals.ts` y agregar un objeto al array `portals`:

```ts
{
  id: 'nuevo-portal',
  badge: 'NPT',
  nameKey: 'portal_nuevo_name',
  descKey: 'portal_nuevo_desc',
  url: process.env.NEXT_PUBLIC_URL_NUEVO ?? 'http://localhost:3005',
  status: 'dev',      // 'live' | 'dev' | 'planned'
  version: 'v0.1',
}
```

Luego agregar las traducciones en `lib/i18n.ts` para ES, EN y PT.

---

## Idiomas soportados

- Español (ES) — default
- English (EN)
- Português (PT)

---

## Deploy

```bash
npm run build
npm run start
```

Compatible con Vercel. Asegurar que las variables de entorno estén configuradas en el proyecto de Vercel.

---

## Git remoto

```bash
git remote add origin https://github.com/CharlieUY711/core-workspace.git
git branch -M main
git push -u origin main
```

---

v1.0 — 2026 | Confidencial — Uso interno | CORE
