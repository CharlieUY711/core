# CORE — Infraestructura del Ecosistema (Infraestructura Oficial)

**ID:** `CORE-PM-INFRA-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno

---

## 1. Descripción General

La infraestructura CORE es el conjunto de tecnologías, herramientas y procesos que soportan el desarrollo, build, deploy y operación del ecosistema.

### Tecnologías principales

| Tecnología | Rol |
|-----------|-----|
| pnpm | Package manager del monorepo |
| Turbo | Orquestador de builds y tareas |
| Vercel | Plataforma de deploy y hosting |
| Supabase | Auth, base de datos y backend |
| Next.js | Framework de apps web |
| TypeScript | Tipado estático en todo el ecosistema |
| GitHub | Control de versiones y colaboración |

### Cómo se relacionan

```
Desarrollador
    │
    ▼
Git push → GitHub
    │
    ▼
Vercel detecta cambio
    │
    ▼
pnpm install → Turbo build → Next.js build
    │
    ▼
Deploy en Vercel (Production / Preview)
    │
    ▼
App conecta con Supabase (Auth + DB)
```

---

## 2. Monorepo CORE

### Ubicación

`C:\CORE`

### Estructura real

```
C:\CORE\
├── apps/
│   ├── core-landing/         ← Landing page pública
│   └── core-biblio/          ← DEPRECATED
├── packages/
│   └── core-globe/           ← Globe Experience compartido
├── scripts/
│   ├── fix_favicons.js
│   └── fix.js
├── docs/                     ← Documentación técnica del repo
│   ├── architecture/
│   ├── prompts/
│   ├── strategy/
│   ├── css/
│   ├── landing/
│   ├── products/
│   └── roadmap/
├── audit/
│   └── report.txt
├── infrastructure/
├── content/
│   └── landing/
├── Biblioteca/               ← App Biblioteca (standalone)
├── .gitignore
├── .npmrc
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── vercel.json
```

### `pnpm-workspace.yaml`

Define los workspaces del monorepo:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Todos los directorios dentro de `apps/` y `packages/` son tratados como workspaces independientes con sus propias dependencias.

### `package.json` raíz

```json
{
  "name": "core-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build --filter=core-landing"
  },
  "devDependencies": {
    "turbo": "2.3.3"
  },
  "engines": {
    "node": ">=20"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### `turbo.json`

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "apps/core-landing/.next/**",
        "apps/core-biblio/.next/**"
      ]
    }
  }
}
```

`dependsOn: ["^build"]` significa que cada app espera que sus dependencias (packages) se construyan primero.

---

## 3. Vercel

### Apps deployadas

| App | Repo / Directorio | Dominio | Estado |
|-----|------------------|---------|--------|
| Biblioteca | `github.com/CharlieUY711/Core_Biblioteca` | `biblioteca.core.com.uy` | ✅ Producción |
| core-landing | `C:\CORE\apps\core-landing` | `core.lat` / `core.com.uy` | ⬜ Pendiente |

### Configuración recomendada — Biblioteca

| Campo | Valor |
|-------|-------|
| Root Directory | `/` (raíz del repo `Core_Biblioteca`) |
| Build Command | `npm run build` |
| Install Command | `npm install` |
| Output Directory | `.next` |
| Node Version | 20.x |

### Configuración recomendada — core-landing

| Campo | Valor |
|-------|-------|
| Root Directory | `apps/core-landing` |
| Build Command | `turbo run build --filter=core-landing` |
| Install Command | `pnpm install` |
| Output Directory | `.next` |
| Node Version | 20.x |

### Variables de entorno en Vercel

Cargar en: Vercel Dashboard → Project → Settings → Environment Variables

Activar para: **Production**, **Preview** y **Development**

Referencia completa: `docs/env/CORE-ENV.md`

### Reglas de deploy

- Branch `main` → deploy automático a **Production**
- Cualquier PR → deploy automático a **Preview**
- Nunca hacer push directo a `main` sin verificar build local
- Verificar log de Vercel post-deploy antes de dar por cerrado

### Reglas de producción

- Variables de entorno verificadas antes de cada deploy
- Build local exitoso antes del push
- Rutas principales testeadas post-deploy
- Rollback disponible desde Vercel Dashboard → Deployments

### Edge functions

No implementadas actualmente. El middleware de Next.js (`middleware.ts`) corre en el Edge Runtime de Vercel por defecto en proyectos Next.js.

---

## 4. Supabase

### Proyecto activo

| Campo | Valor |
|-------|-------|
| ID | `axlbccznfgzgqurxxzzi` |
| URL | `https://axlbccznfgzgqurxxzzi.supabase.co` |
| App consumidora | Biblioteca |

### Servicios utilizados

| Servicio | Uso | Estado |
|----------|-----|--------|
| Auth | Login email/password para Biblioteca | ✅ Activo |
| Database (PostgreSQL) | Pendiente de uso | ⬜ No configurado |
| Storage | Pendiente de uso | ⬜ No configurado |
| Edge Functions | Pendiente de uso | ⬜ No configurado |

### Integración con apps

**Biblioteca:**
- `@supabase/ssr` gestiona cookies de sesión server-side
- `lib/supabaseClient.ts` exporta `createClient()` para uso en componentes
- `middleware.ts` verifica sesión en cada request
- Login via `supabase.auth.signInWithPassword()`
- Logout via `supabase.auth.signOut()`

```ts
// lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> `SUPABASE_SERVICE_ROLE_KEY` nunca debe tener prefijo `NEXT_PUBLIC_`.

### Reglas de seguridad

- Nunca exponer `service_role` key al cliente
- Nunca commitear `.env.local`
- Rotar anon key si fue expuesta accidentalmente
- Revisar políticas RLS antes de exponer tablas

### Reglas de acceso

- Usuarios creados manualmente en Supabase Dashboard → Authentication → Users
- Sin registro público — solo el administrador puede crear usuarios
- Email confirmation: verificar estado en Dashboard → Auth → Providers → Email

### Reglas de versionado

- Migraciones de base de datos versionadas en `supabase/migrations/` (cuando se implemente)
- Nunca modificar tablas en producción sin migración documentada

---

## 5. pnpm

### Por qué pnpm

- Más rápido que npm y yarn en monorepos
- Manejo eficiente de dependencias compartidas via symlinks
- Compatible con Turbo
- Requerido por `packageManager: pnpm@9.0.0` en `package.json` raíz

### Workspace

`pnpm-workspace.yaml` declara los workspaces. pnpm instala dependencias de forma hoisted — las dependencias compartidas se instalan una sola vez en `node_modules` raíz.

### Instalación de dependencias

```bash
# Instalar todas las dependencias del monorepo
pnpm install

# Agregar dependencia a una app específica
pnpm add <paquete> --filter core-landing

# Agregar dependencia a un package
pnpm add <paquete> --filter @core/globe

# Agregar dependencia de desarrollo al root
pnpm add -D <paquete> -w
```

### Referencia entre workspaces

Para que una app use un package local:

```json
{
  "dependencies": {
    "@core/globe": "workspace:*"
  }
}
```

### Reglas de instalación

- Siempre usar `pnpm install` en la raíz — nunca `npm install`
- No commitear `node_modules/`
- Commitear `pnpm-lock.yaml` en cada cambio de dependencias
- Verificar que `pnpm-lock.yaml` no tenga conflictos antes del merge

### Reglas de actualización

- Actualizar dependencias con `pnpm update --filter <app>`
- Verificar breaking changes antes de actualizar major versions
- Documentar actualizaciones relevantes en el historial del documento afectado

### Estado actual

⚠️ `apps/core-landing` tiene `package-lock.json` (npm) — pendiente de migrar a pnpm  
⚠️ `C:\CORE\Biblioteca` usa npm standalone — pendiente de integrar al monorepo

---

## 6. Turbo

### Propósito

Turbo orquesta las tareas del monorepo: build, dev, lint, type-check. Cachea los outputs para evitar rebuilds innecesarios.

### `turbo.json` actual

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "apps/core-landing/.next/**",
        "apps/core-biblio/.next/**"
      ]
    }
  }
}
```

### Cómo funciona el pipeline

1. Turbo analiza el grafo de dependencias del workspace
2. Construye los packages primero (`^build` = dependencias upstream)
3. Construye las apps en paralelo cuando sus dependencias están listas
4. Cachea los outputs — si nada cambió, no reconstruye

### Tareas disponibles

| Tarea | Comando | Estado |
|-------|---------|--------|
| Build landing | `turbo run build --filter=core-landing` | ✅ Configurado |
| Dev paralelo | `turbo run dev --parallel` | ✅ Configurado |
| Build all | `turbo run build` | ⬜ Incluye core-biblio deprecated |
| Lint | `turbo run lint` | ⬜ Pendiente de configurar |
| Type-check | `turbo run type-check` | ⬜ Pendiente de configurar |

### Reglas de build

- Nunca modificar `turbo.json` sin verificar que todos los builds pasen
- Agregar nueva app → agregar su output en `turbo.json`
- Agregar nuevo package → verificar que `build` esté en su `package.json`
- El cache de Turbo se invalida si cambian los inputs — no forzar skip de cache en CI

### Reglas de test

No configuradas actualmente. Cuando se implementen:

```json
{
  "tasks": {
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

---

## 7. Deploy Pipeline

### Flujo completo

```
1. Desarrollador hace cambios en local
        │
        ▼
2. Verificación local
   - npm run build (Biblioteca)
   - turbo run build --filter=core-landing
        │
        ▼
3. git add + git commit + git push origin main
        │
        ▼
4. GitHub recibe el push
        │
        ▼
5. Vercel detecta el push automáticamente
        │
        ▼
6. Vercel ejecuta:
   - Install: npm install / pnpm install
   - Build: next build / turbo run build
        │
        ▼
7. Si build exitoso → Deploy a Production
   Si build falla   → Notificación de error, rollback automático
        │
        ▼
8. App disponible en dominio de producción
        │
        ▼
9. Verificación post-deploy:
   - Rutas principales testeadas
   - Auth verificado
   - Log de Vercel revisado
```

### Responsabilidades por componente

| Componente | Responsabilidad en el pipeline |
|-----------|-------------------------------|
| **Git / GitHub** | Control de versiones, trigger de deploys |
| **pnpm** | Instalación de dependencias |
| **Turbo** | Orquestación y cache de builds |
| **Next.js** | Build de la app, SSR/SSG |
| **Vercel** | Hosting, CDN, deploy automático, preview |
| **Supabase** | Auth y DB en runtime — no interviene en el build |
| **Biblioteca** | Documentación — se actualiza en paralelo al código |

---

## 8. Sincronización CORE ↔ Biblioteca

### Reglas de sincronización

| Evento | Acción requerida en Biblioteca |
|--------|-------------------------------|
| Código nuevo en `apps/` | Actualizar `docs/products/APP-NAME.md` |
| Código nuevo en `packages/` | Actualizar `docs/products/PACKAGE-NAME.md` y `docs/arquitectura/` |
| Variable de entorno nueva | Actualizar `docs/env/CORE-ENV.md` |
| Prompt nuevo generado | Guardar en `docs/prompts/CORE-PM-[ÁREA]-[N].md` |
| Feature nueva | Actualizar `docs/checklists/checklist-maestro.md` |
| App nueva | Crear `docs/products/APP-NAME.md` |
| Package nuevo | Crear `docs/products/PACKAGE-NAME.md` |
| Deploy nuevo | Actualizar estado en doc del producto afectado |
| Infra cambia | Actualizar este documento |

### Regla general

> Ningún cambio en el ecosistema CORE queda sin documentar en la Biblioteca.

---

## 9. Checklist de Infraestructura

### Monorepo

- [x] `pnpm-workspace.yaml` configurado
- [x] `turbo.json` con task `build`
- [x] `package.json` raíz con `packageManager: pnpm@9.0.0`
- [ ] `apps/core-landing` migrado de npm a pnpm
- [ ] `Biblioteca` integrada al monorepo como `apps/core-biblioteca`
- [ ] `apps/core-biblio` deprecado formalmente
- [ ] `packages/core-ui` creado
- [ ] `turbo.json` actualizado con `core-biblioteca`
- [ ] Tasks `lint` y `type-check` configuradas en `turbo.json`

### Vercel

- [x] Biblioteca deployada en producción
- [x] Dominio `biblioteca.core.com.uy` configurado
- [x] Variables de entorno cargadas (Production + Preview)
- [ ] Variables de entorno cargadas en Development
- [ ] `core-landing` configurado en Vercel
- [ ] Dominio `core.lat` o `core.com.uy` configurado
- [ ] Vercel Analytics activado

### Supabase

- [x] Proyecto creado y activo
- [x] Auth email/password configurado
- [x] Integrado con Biblioteca via `@supabase/ssr`
- [ ] Políticas RLS revisadas
- [ ] Backups automáticos habilitados
- [ ] Proceso de alta/baja de usuarios documentado
- [ ] Migraciones versionadas configuradas

### pnpm

- [x] Workspace configurado en monorepo raíz
- [ ] `core-landing` migrado de npm a pnpm
- [ ] `Biblioteca` migrada de npm a pnpm
- [ ] Lockfile unificado

### Turbo

- [x] Build pipeline configurado
- [x] Dev paralelo configurado
- [ ] `core-biblioteca` agregado a outputs
- [ ] Tasks `lint` y `type-check` configuradas
- [ ] Turbo Remote Cache evaluado

### Documentación

- [x] `docs/env/CORE-ENV.md` creado
- [x] `docs/infrastructure/core-infrastructure.md` creado (este documento)
- [x] `docs/products/core-landing.md` creado
- [x] `docs/products/core-globe.md` creado
- [x] `docs/products/core-biblioteca.md` creado
- [ ] `README.md` raíz del monorepo actualizado
- [ ] `scripts/README.md` creado

---

## 10. Roadmap de Infraestructura

### Fase 1 — Estabilización (Q3 2026)

- [ ] Migrar `core-landing` y `Biblioteca` a pnpm unificado
- [ ] Mover `Biblioteca` a `apps/core-biblioteca`
- [ ] Deprecar `apps/core-biblio`
- [ ] Actualizar Next.js 14 → 15 en Biblioteca
- [ ] Agregar `lint` y `type-check` a Turbo
- [ ] Crear `packages/core-ui`

### Fase 2 — CI/CD (Q4 2026)

- [ ] Configurar GitHub Actions para CI
- [ ] Tests automáticos en cada PR
- [ ] Deploy automático a staging antes de producción
- [ ] Turbo Remote Cache activado para builds más rápidos
- [ ] Monitoreo de errores (Sentry o similar)

### Fase 3 — Escalabilidad (2027)

- [ ] Entorno de staging dedicado en Vercel
- [ ] Supabase DB con migraciones versionadas
- [ ] RLS configurado por vertical (Logistics, Rep, Market)
- [ ] API propia de CORE (`apps/core-api`)
- [ ] Nuevos packages en monorepo según productos

### Fase 4 — Expansión regional (2028+)

- [ ] Data residency por país (Supabase multi-region)
- [ ] CDN optimizado para LATAM
- [ ] Entornos por país según expansión regional
- [ ] Infraestructura de eventos (Kafka / Pub/Sub) para CORE Logistics

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Junio 2026 | Creación inicial |

---

*CORE — Infraestructura del Ecosistema · v1.0 · Junio 2026 · Confidencial — Uso interno*
