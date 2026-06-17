# CORE — Variables de Entorno
## `CORE-ENV.md` — Fuente de verdad del ecosistema

**ID:** `CORE-PM-ENV-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno  

> ⚠️ Este archivo documenta variables con placeholders. Nunca registrar claves reales aquí.

---

## 1. Variables Globales del Ecosistema

Variables compartidas o aplicables a múltiples apps del monorepo.

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, `test`) | ✅ Sí |
| `NODE_VERSION` | Versión mínima de Node.js requerida (`>=20`) | ✅ Sí |

```env
NODE_ENV=production
```

---

## 2. Variables de CORE Landing (`apps/core-landing`)

Variables específicas de la landing page pública de CORE.

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio en producción | ✅ Sí |
| `NEXT_PUBLIC_GA_ID` | ID de Google Analytics (si aplica) | ⬜ Opcional |
| `NEXT_PUBLIC_GLOBE_API_URL` | URL de la API que alimenta el Globe Experience | ⬜ Opcional |

```env
NEXT_PUBLIC_SITE_URL=https://core.lat
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GLOBE_API_URL=https://api.core.lat/globe
```

---

## 3. Variables de CORE Biblio (`apps/core-biblio` / `C:\CORE\Biblioteca`)

Variables específicas de la Biblioteca interna.

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anónima de Supabase | ✅ Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio Supabase (solo server-side) | ⬜ Opcional |
| `NEXT_PUBLIC_BIBLIOTECA_URL` | URL pública de la Biblioteca en producción | ✅ Sí |

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_BIBLIOTECA_URL=https://biblioteca.core.com.uy
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` nunca debe tener prefijo `NEXT_PUBLIC_`. Nunca exponerla al cliente.

---

## 4. Variables de `packages/core-globe`

Variables específicas del paquete Globe Experience.

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_GLOBE_DATA_SOURCE` | Fuente de datos para rutas y hubs del globo | ⬜ Opcional |
| `NEXT_PUBLIC_GLOBE_REFRESH_INTERVAL` | Intervalo de actualización en ms (default: 30000) | ⬜ Opcional |

```env
NEXT_PUBLIC_GLOBE_DATA_SOURCE=https://api.core.lat/globe/data
NEXT_PUBLIC_GLOBE_REFRESH_INTERVAL=30000
```

---

## 5. Variables de Supabase

| Variable | Descripción | Dónde se obtiene | Requerida |
|----------|-------------|-----------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto | Dashboard → Settings → API → Project URL | ✅ Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública | Dashboard → Settings → API → anon public | ✅ Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (admin) | Dashboard → Settings → API → service_role | ⬜ Opcional |
| `SUPABASE_JWT_SECRET` | Secret JWT del proyecto | Dashboard → Settings → API → JWT Secret | ⬜ Opcional |
| `SUPABASE_DB_URL` | URL directa de la base de datos PostgreSQL | Dashboard → Settings → Database → Connection string | ⬜ Opcional |

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_DB_URL=postgresql://postgres:[password]@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres
```

---

## 6. Variables de Vercel

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VERCEL_URL` | URL del deployment actual (inyectada automáticamente por Vercel) | Auto |
| `VERCEL_ENV` | Entorno del deployment: `production`, `preview`, `development` | Auto |
| `VERCEL_GIT_COMMIT_SHA` | SHA del commit deployado (inyectada automáticamente) | Auto |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` | ID de Vercel Analytics (si está habilitado) | ⬜ Opcional |

```env
# Inyectadas automáticamente por Vercel — no declarar manualmente
VERCEL_URL=your-deployment.vercel.app
VERCEL_ENV=production
VERCEL_GIT_COMMIT_SHA=abc123...

# Declarar manualmente si se usa Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

---

## 7. Variables Internas de Next.js (`NEXT_PUBLIC_*`)

Todas las variables con prefijo `NEXT_PUBLIC_` son expuestas al cliente (browser).

| Regla | Descripción |
|-------|-------------|
| `NEXT_PUBLIC_*` | Visible en el browser — nunca usar para datos sensibles |
| Sin prefijo | Solo disponible en server-side (`getServerSideProps`, `API routes`, `Server Components`) |
| `NEXT_PUBLIC_` + credencial | ❌ Estrictamente prohibido |

Variables estándar de Next.js:

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_TELEMETRY_DISABLED` | Desactiva telemetría de Next.js (`1` = desactivado) | ⬜ Opcional |
| `PORT` | Puerto del servidor de desarrollo (default: 3000) | ⬜ Opcional |
| `HOSTNAME` | Hostname del servidor (default: localhost) | ⬜ Opcional |

```env
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=localhost
```

---

## 8. Variables de Infraestructura

Variables utilizadas por scripts, pipelines o auditorías internas.

| Variable | Descripción | Dónde se usa | Requerida |
|----------|-------------|-------------|-----------|
| `TURBO_TEAM` | Team ID de Turbo Remote Cache (si se activa) | `turbo.json` | ⬜ Opcional |
| `TURBO_TOKEN` | Token de autenticación para Turbo Remote Cache | CI/CD | ⬜ Opcional |
| `GITHUB_TOKEN` | Token de GitHub para CI/CD automático | GitHub Actions | ⬜ Opcional |
| `AUDIT_REPORT_PATH` | Ruta de salida del reporte de auditoría | `scripts/` | ⬜ Opcional |

```env
TURBO_TEAM=your-turbo-team
TURBO_TOKEN=your-turbo-token
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
AUDIT_REPORT_PATH=./audit/report.txt
```

---

## 9. Notas de Seguridad

### ❌ Prohibido

- Commitear `.env.local` al repositorio
- Exponer `SUPABASE_SERVICE_ROLE_KEY` con prefijo `NEXT_PUBLIC_`
- Exponer `SUPABASE_JWT_SECRET` al cliente
- Exponer `GITHUB_TOKEN` o `TURBO_TOKEN` en código fuente
- Registrar valores reales en este documento

### ✅ Requerido

- Mantener `.env.local` en `.gitignore` de todas las apps
- Usar `.env.example` en cada app con placeholders
- Cargar variables reales exclusivamente en Vercel Dashboard
- Rotar claves comprometidas inmediatamente en Supabase Dashboard
- Revisar este documento cada vez que se agrega una variable nueva

### Archivos por app

| App | Archivo local | Commiteado |
|-----|--------------|-----------|
| `C:\CORE\Biblioteca` | `.env.local` | ❌ No (en .gitignore) |
| `C:\CORE\Biblioteca` | `.env.example` | ✅ Sí |
| `apps/core-landing` | `.env.local` | ❌ No (en .gitignore) |
| `apps/core-landing` | `.env.example` | ⬜ Pendiente de crear |
| `apps/core-biblio` | `.env.local` | ❌ No aplica (deprecado) |

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Junio 2026 | Creación inicial |

---

*CORE-ENV.md · v1.0 · Junio 2026 · Confidencial — Uso interno*
