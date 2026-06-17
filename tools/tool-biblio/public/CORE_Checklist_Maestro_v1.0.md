# CORE — Checklist Maestro del Ecosistema
## `CORE-PM-BIBLIO-CHECKLIST-0001`
**Versión 1.0 — Junio 2026 · Confidencial — Uso interno**

---

## 1. Checklist de Apps

### 1.1 `apps/core-landing`

#### Estado actual
- [x] App creada y con estructura básica
- [x] Deployada en Vercel
- [ ] Build incluido en turbo filter
- [ ] Versión de Next.js actualizada a 15.x
- [ ] Vulnerabilidad de seguridad Next.js 14 resuelta

#### Rutas clave
- [ ] `/` — Hero section con globo interactivo
- [ ] `/connect` — CORE Connect
- [ ] `/move` — CORE Move
- [ ] `/grow` — CORE Grow
- [ ] `/market` — CORE Market
- [ ] `/contact` — Contacto / CTA

#### Dependencias
- [ ] `packages/core-globe` integrado
- [ ] Tailwind configurado con tokens CORE
- [ ] TypeScript sin errores
- [ ] PostCSS configurado correctamente
- [ ] package-lock.json migrado a pnpm-lock.yaml

#### Variables de entorno
- [ ] `.env.example` creado en `apps/core-landing/`
- [ ] Variables documentadas en `docs/env/CORE-ENV.md`
- [ ] Variables cargadas en Vercel (Production + Preview)

#### Documentación requerida
- [ ] `README.md` actualizado con instrucciones de desarrollo
- [ ] `AGENTS.md` con contexto para agentes de IA
- [ ] `docs/landing/` sincronizado con contenido real
- [ ] `CORE_Landing_Page_v1.0.docx` referenciado

#### Prompts asociados
- [ ] `CORE-LANDING-V1` guardado en `docs/prompts/`
- [ ] `CORE-PM-0001.md` revisado y actualizado
- [ ] Prompts de globo guardados en `docs/prompts/`

#### Tareas pendientes
- [ ] Implementar Globe Experience con `core-globe`
- [ ] Completar todas las secciones del hero
- [ ] Agregar módulos Connect / Move / Grow / Market
- [ ] Conectar formulario de contacto
- [ ] SEO: meta tags, OG, sitemap
- [ ] Analytics configurado
- [ ] Performance: Lighthouse > 90
- [ ] Mobile responsive validado
- [ ] Migrar a pnpm

---

### 1.2 `apps/core-biblio`

#### Estado actual
- [x] App creada en monorepo
- [ ] **DEPRECAR** — versión duplicada y abandonada
- [ ] Auth de Supabase implementada
- [ ] Sincronizado con `C:\CORE\Biblioteca`
- [ ] Marcado como `core-biblio-DEPRECATED`

#### Rutas clave
- [ ] Ninguna en producción — app no deployada
- [ ] Pendiente de deprecación formal

#### Dependencias
- [ ] Sin `@supabase/ssr` — desactualizado
- [ ] Sin componentes UI — desactualizado
- [ ] Sin middleware de auth — desactualizado

#### Variables de entorno
- [ ] No configuradas — app no activa

#### Documentación requerida
- [ ] Nota de deprecación en `README.md`
- [ ] Referencia a `C:\CORE\Biblioteca` como reemplazo

#### Prompts asociados
- [ ] Ninguno activo — pendiente de deprecación

#### Tareas pendientes
- [ ] Renombrar a `core-biblio-DEPRECATED`
- [ ] Agregar `README.md` con nota de deprecación
- [ ] Evaluar si mover `C:\CORE\Biblioteca` a `apps/core-biblioteca`
- [ ] Actualizar `turbo.json` si se hace la migración
- [ ] Actualizar `pnpm-workspace.yaml` si se hace la migración

---

## 2. Checklist de Packages

### 2.1 `packages/core-globe`

#### Propósito
- [ ] Documentado formalmente en `README.md`
- [ ] Descripción en `package.json` completada
- [ ] API pública documentada

#### Dependencias
- [ ] `tsconfig.json` alineado con monorepo raíz
- [ ] Dependencias de Three.js declaradas
- [ ] Exportaciones tipadas con TypeScript
- [ ] Build configurado en `turbo.json`

#### Documentación requerida
- [ ] `README.md` con uso, props y ejemplos
- [ ] `docs/architecture/globe-engine.md` actualizado
- [ ] `docs/architecture/globe-engine/` con diagramas
- [ ] Storybook o demo standalone (futuro)

#### Prompts asociados
- [ ] Prompt de Globe Experience guardado en `docs/prompts/`
- [ ] `CORE-PM-0200.md` revisado y actualizado

#### Tareas pendientes
- [ ] Auditar contenido de `src/`
- [ ] Verificar que exporta componente usable por `core-landing`
- [ ] Integrar en `apps/core-landing`
- [ ] Integrar en `C:\CORE\Biblioteca` (página de inicio o arquitectura)
- [ ] Agregar modo día/noche basado en UTC
- [ ] Agregar rutas animadas por tipo (logística / rep / market)
- [ ] Agregar hubs pulsantes por país activo
- [ ] Tests unitarios básicos

---

### 2.2 `packages/core-ui` *(pendiente de crear)*

#### Propósito
- [ ] Crear package `packages/core-ui`
- [ ] Documentar propósito en `README.md`

#### Componentes a centralizar
- [ ] `Button.tsx` — desde `C:\CORE\Biblioteca\components\ui\`
- [ ] `Input.tsx` — desde `C:\CORE\Biblioteca\components\ui\`
- [ ] `DocCard.tsx` — desde `C:\CORE\Biblioteca\app\components\`
- [ ] `PageHeader.tsx` — desde `C:\CORE\Biblioteca\app\components\`
- [ ] `Sidebar.tsx` — desde `C:\CORE\Biblioteca\app\components\`

#### Dependencias
- [ ] `package.json` creado con nombre `@core/ui`
- [ ] `tsconfig.json` creado
- [ ] Exportaciones declaradas en `index.ts`
- [ ] Agregado a `pnpm-workspace.yaml`

#### Tareas pendientes
- [ ] Crear estructura del package
- [ ] Migrar componentes
- [ ] Actualizar imports en Biblioteca
- [ ] Actualizar imports en core-landing cuando corresponda

---

## 3. Checklist de Infraestructura

### 3.1 Vercel

- [x] Proyecto `Core_Biblioteca` creado en Vercel
- [x] Dominio `biblioteca.core.com.uy` configurado
- [x] `NEXT_PUBLIC_SUPABASE_URL` cargada (Production + Preview)
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` cargada (Production + Preview)
- [ ] Variables cargadas en entorno Development
- [ ] Proyecto `core-landing` creado en Vercel
- [ ] Dominio `core.com.uy` o `www.core.lat` configurado en landing
- [ ] Deploy automático en push a `main` configurado para ambos proyectos
- [ ] Preview deployments activos para PRs

### 3.2 Supabase

- [x] Proyecto creado (`axlbccznfgzgqurxxzzi`)
- [x] Auth habilitado con email/password
- [x] Usuario `cvaralla@gmail.com` creado y confirmado
- [ ] Email confirmation desactivado (o configurado correctamente)
- [ ] Políticas RLS (Row Level Security) revisadas
- [ ] Backups automáticos habilitados
- [ ] Tabla de usuarios adicionales documentada
- [ ] Proceso formal para crear nuevos usuarios documentado
- [ ] Anon key rotada si fue expuesta accidentalmente

### 3.3 pnpm Workspace

- [x] `pnpm-workspace.yaml` con `apps/*` y `packages/*`
- [x] `.npmrc` configurado
- [x] `package.json` raíz con `packageManager: pnpm@9.0.0`
- [ ] `C:\CORE\Biblioteca` migrado a pnpm
- [ ] `apps/core-landing` migrado de npm a pnpm (tiene `package-lock.json`)
- [ ] Lockfile unificado en raíz
- [ ] `node_modules` en `.gitignore` de todas las apps

### 3.4 Turbo

- [x] `turbo.json` con task `build`
- [x] Outputs definidos para `core-landing` y `core-biblio`
- [ ] Build script raíz actualizado para incluir `core-biblioteca`
- [ ] Task `dev` configurada por app
- [ ] Task `lint` configurada
- [ ] Task `type-check` configurada
- [ ] Cache de turbo funcionando correctamente
- [ ] `turbo.json` outputs actualizados tras migración de Biblioteca

### 3.5 Scripts (`C:\CORE\scripts`)

- [x] `fix_favicons.js` — existe (1.6 MB)
- [x] `fix.js` — existe (58 KB)
- [ ] `README.md` en `scripts/` documentando propósito de cada script
- [ ] `fix_favicons.js` — propósito documentado
- [ ] `fix.js` — propósito documentado
- [ ] Verificar si scripts son aún necesarios o se pueden archivar

### 3.6 Auditorías

- [x] `audit/report.txt` generado (1.4 MB)
- [x] Auditoría de sincronización CORE ↔ Biblioteca completada (este doc)
- [ ] `audit/report.txt` revisado y acciones tomadas documentadas
- [ ] Próxima auditoría programada
- [ ] Auditoría de seguridad de dependencias (`pnpm audit`)
- [ ] Auditoría de performance Lighthouse para landing y biblioteca

---

## 4. Checklist de la Biblioteca (`C:\CORE\Biblioteca`)

### 4.1 Estructura

- [x] `app/login/page.tsx` — login con ojito password
- [x] `app/aviso/page.tsx` — advertencia trilingual ES/EN/PT
- [x] `app/page.tsx` — inicio con stats y secciones
- [x] `app/layout.tsx` — layout con Sidebar
- [x] `app/globals.css` — Design System CORE completo
- [x] `app/components/Sidebar.tsx` — con cerrar sesión
- [x] `app/components/DocCard.tsx` — expandible con Ver online + descarga
- [x] `app/components/PageHeader.tsx`
- [x] `app/docs/prompts/page.tsx`
- [x] `app/docs/architecture/page.tsx`
- [x] `app/docs/strategy/page.tsx`
- [x] `app/docs/roadmap/page.tsx`
- [x] `app/docs/products/page.tsx`
- [x] `app/docs/design-system/page.tsx`
- [x] `components/ui/Button.tsx`
- [x] `components/ui/Input.tsx`
- [x] `lib/supabaseClient.ts`
- [x] `types/supabase.ts`
- [x] `middleware.ts`
- [x] `tailwind.config.js` con tokens CORE
- [ ] `app/docs/master-document/page.tsx` — pendiente de crear
- [ ] `app/docs/checklist/page.tsx` — pendiente de crear
- [ ] `app/docs/infrastructure/page.tsx` — pendiente de crear

### 4.2 Prompts

- [x] `CORE-PM-BIBLIO-SETUP-V2` — en página de prompts
- [x] `CORE-LANDING-V1` — en página de prompts
- [x] `CORE-DASHBOARD-V1` — en página de prompts
- [x] `CORE-DB-SCHEMA-V1` — en página de prompts
- [ ] Prompts reales de `C:\CORE\docs\prompts\` sincronizados con página
- [ ] `CORE-PM-0001.md` visible en Biblioteca
- [ ] `CORE-PM-0100.md` visible en Biblioteca
- [ ] `CORE-PM-0200.md` visible en Biblioteca
- [ ] `CORE-PM-BIBLIO-CHECKLIST-0001` (este documento) guardado en `docs/prompts/`
- [ ] `CORE-PM-BIBLIO-LOGIN-0001` guardado en `docs/prompts/`

### 4.3 Documentación disponible en Biblioteca

- [x] Design System — online + descarga `.docx`
- [ ] `CORE_MASTER_DOCUMENT_v1.0.docx` — disponible para descarga
- [ ] `CORE_DERIVADOS_v1.0.docx` — disponible para descarga
- [ ] `CORE_Landing_Page_v1.0.docx` — disponible para descarga
- [ ] `PROMPTS_Sonet.docx` — disponible para descarga
- [ ] `CHECKLIST ACTUALIZADA.docx` — disponible para descarga
- [ ] Todos los `.docx` copiados a `public/`

### 4.4 Variables de entorno

- [x] `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`
- [x] `.env.local` con `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `.env.local` en `.gitignore`
- [x] `.env.example` creado y commiteado
- [ ] `docs/env/CORE-ENV.md` creado con descripción de todas las variables
- [ ] Variables de entorno de Development cargadas en Vercel

### 4.5 Legal y acceso

- [x] Aviso de confidencialidad en ES / EN / PT
- [x] Protección de rutas via middleware
- [x] Sesión gestionada con Supabase Auth
- [ ] Proceso de alta de usuarios documentado formalmente
- [ ] Proceso de baja de usuarios documentado
- [ ] Política de contraseñas definida
- [ ] Logs de acceso revisados periódicamente

### 4.6 Mantenimiento

- [x] Deploy automático en Vercel al push a `main`
- [x] Dominio `biblioteca.core.com.uy` activo
- [ ] Next.js actualizado de 14.2.3 a 15.x
- [ ] Dependencias auditadas (`npm audit`)
- [ ] Monitoreo de errores configurado (Sentry o similar)
- [ ] Proceso de backup de Supabase definido

---

## 5. Checklist de Sincronización Continua

### 5.1 Reglas generales

- [ ] Regla documentada: cada cambio en CORE → revisar impacto en Biblioteca
- [ ] Regla documentada: cada prompt nuevo → guardar en `docs/prompts/`
- [ ] Regla documentada: cada variable nueva → actualizar `docs/env/CORE-ENV.md`
- [ ] Regla documentada: cada app nueva → crear `docs/products/APP-NAME.md`
- [ ] Regla documentada: cada feature nueva → actualizar este checklist

### 5.2 Por cada prompt nuevo

- [ ] Guardar en `C:\CORE\docs\prompts\` con nomenclatura `CORE-[ÁREA]-[N].md`
- [ ] Agregar a página `/docs/prompts` de la Biblioteca
- [ ] Actualizar índice de prompts
- [ ] Versionar con `-V[N]` si reemplaza uno anterior

### 5.3 Por cada variable de entorno nueva

- [ ] Agregar a `.env.example` de la app correspondiente
- [ ] Agregar a `.env.example` raíz del monorepo
- [ ] Documentar en `docs/env/CORE-ENV.md`
- [ ] Cargar en Vercel (Production + Preview + Development)
- [ ] Notificar al equipo

### 5.4 Por cada app nueva

- [ ] Crear carpeta en `apps/`
- [ ] Crear `README.md`, `AGENTS.md`, `CLAUDE.md`
- [ ] Agregar a `pnpm-workspace.yaml`
- [ ] Agregar a `turbo.json`
- [ ] Crear `docs/products/APP-NAME.md`
- [ ] Agregar entrada en Biblioteca → página `/docs/products`
- [ ] Configurar en Vercel
- [ ] Agregar variables de entorno

### 5.5 Por cada package nuevo

- [ ] Crear carpeta en `packages/`
- [ ] Crear `README.md` con API y ejemplos
- [ ] Agregar a `pnpm-workspace.yaml`
- [ ] Documentar en `docs/architecture/`
- [ ] Agregar entrada en Biblioteca → página `/docs/architecture`

### 5.6 Por cada documento Word nuevo

- [ ] Guardar en `C:\CORE\docs\`
- [ ] Copiar a `C:\CORE\Biblioteca\public\`
- [ ] Agregar card en la sección correspondiente de la Biblioteca
- [ ] Seguir nomenclatura `CORE_NOMBRE_vX.X.docx`

### 5.7 Por cada deploy a producción

- [ ] Build local exitoso antes del push
- [ ] Variables de entorno verificadas en Vercel
- [ ] Log de Vercel revisado post-deploy
- [ ] Rutas principales testeadas manualmente
- [ ] Checklist actualizado si hubo cambios estructurales

---

## 6. Estado Global del Ecosistema

| App / Package | Estado | Producción | Auth | Docs |
|--------------|--------|------------|------|------|
| `core-landing` | 🟡 En desarrollo | ⚠️ Parcial | ❌ No aplica | 🟡 Parcial |
| `core-biblio` | 🔴 Deprecar | ❌ No | ❌ No | ❌ No |
| `C:\CORE\Biblioteca` | ✅ Activa | ✅ Sí | ✅ Supabase | 🟡 Parcial |
| `core-globe` | 🟡 Creado | ❌ No | ❌ No aplica | ❌ No |
| `core-ui` | ❌ No existe | ❌ No | ❌ No aplica | ❌ No |

---

*CORE — Checklist Maestro v1.0 · `CORE-PM-BIBLIO-CHECKLIST-0001` · Junio 2026 · Confidencial — Uso interno*
