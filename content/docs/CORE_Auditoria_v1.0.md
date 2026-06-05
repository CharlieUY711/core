# CORE — Auditoría de Sincronización
## Repositorio CORE ↔ Biblioteca
**Versión 1.0 — Junio 2026 · Confidencial — Uso interno**

---

## 1. Inventario CORE (`C:\CORE`)

### 1.1 Monorepo

| Campo | Valor |
|-------|-------|
| Nombre | `core-monorepo` |
| Package manager | pnpm 9.0.0 |
| Node requerido | >=20 |
| Orquestador | Turbo 2.3.3 |
| Workspaces | `apps/*`, `packages/*` |

**Scripts raíz:**
- `dev` → turbo run dev --parallel
- `build` → turbo run build --filter=core-landing ⚠️ Solo filtra landing, no biblio

### 1.2 Apps

#### `apps/core-landing`
- Framework: Next.js
- Carpetas: `app/`, `components/`, `content/`, `public/`
- Config: `next.config.js`, `tsconfig.json`, `tailwind` ausente (usa PostCSS directo)
- Archivos de agente: `AGENTS.md`, `CLAUDE.md`
- Package manager: tiene `package-lock.json` (npm) — inconsistente con monorepo pnpm

#### `apps/core-biblio`
- Framework: Next.js
- Carpetas: `app/`, `public/`
- Config: `next.config.js`, `tailwind.config.js`, `postcss.config.js`
- Archivos de agente: `AGENTS.md`, `CLAUDE.md`
- Estado: versión antigua/incompleta de la Biblioteca — no tiene auth, no tiene design-system, no tiene DocCard expandible

### 1.3 Packages

#### `packages/core-globe`
- Carpetas: `src/`
- Config: `package.json`, `tsconfig.json`
- Estado: package creado, contenido en `src/` por verificar
- No está referenciado en ninguna app actualmente

### 1.4 Docs (`C:\CORE\docs`)

| Carpeta/Archivo | Contenido |
|----------------|-----------|
| `architecture/` | `api-layer.md`, `globe-engine.md`, `monorepo.md` + subcarpeta `globe-engine/` |
| `prompts/` | `CORE-PM-0001.md`, `CORE-PM-0100.md`, `CORE-PM-0200.md` |
| `strategy/` | `principles.md`, `variables-entorno.md`, `vision.md` |
| `css/` | Carpeta presente, contenido no listado |
| `landing/` | Carpeta presente, contenido no listado |
| `products/` | Carpeta presente, contenido no listado |
| `roadmap/` | Carpeta presente, contenido no listado |
| `index.html` | Índice de docs en HTML |
| `CORE_MASTER_DOCUMENT_v1.0.docx` | Blueprint estratégico completo |
| `CORE_DERIVADOS_v1.0.docx` | Executive Summary, Investor Deck, Tech Spec, Template |
| `CORE_Landing_Page_v1.0.docx` | Estructura y contenido landing |
| `CHECKLIST ACTUALIZADA.docx` | Checklist de estado del proyecto |
| `PROMPTS_Sonet.docx` | Prompts oficiales para Sonnet |

### 1.5 Scripts (`C:\CORE\scripts`)

| Archivo | Tamaño | Descripción estimada |
|---------|--------|---------------------|
| `fix_favicons.js` | 1.6 MB | Script de corrección de favicons |
| `fix.js` | 58 KB | Script de corrección general |

### 1.6 Audit (`C:\CORE\audit`)

| Archivo | Tamaño |
|---------|--------|
| `report.txt` | 1.4 MB — reporte de auditoría anterior |

### 1.7 Content (`C:\CORE\content`)

- `landing/` — contenido de la landing page

### 1.8 Infraestructura (`C:\CORE\infrastructure`)

- Carpeta presente, contenido no auditado en este relevamiento

### 1.9 Archivos raíz relevantes

| Archivo | Descripción |
|---------|-------------|
| `pnpm-workspace.yaml` | Define workspaces del monorepo |
| `turbo.json` | Orquestación de builds — ⚠️ outputs incluye core-biblio pero build script no lo filtra |
| `vercel.json` | Config de deploy |
| `.npmrc` | Config de pnpm |
| `CORE-Biblioteca.zip` | Backup de la Biblioteca (21.9 MB) |
| `files.zip` | Backup de archivos (7 KB) |

---

## 2. Inventario Biblioteca (`C:\CORE\Biblioteca`)

### 2.1 Estructura general

```
C:\CORE\Biblioteca\
├── app/
│   ├── aviso/page.tsx          ← Pantalla de advertencia trilingual
│   ├── login/page.tsx          ← Login con ojito password
│   ├── components/
│   │   ├── DocCard.tsx         ← Card expandible con Ver online + descarga
│   │   ├── PageHeader.tsx      ← Header de sección
│   │   └── Sidebar.tsx         ← Sidebar con nav + cerrar sesión
│   ├── docs/
│   │   ├── architecture/page.tsx
│   │   ├── design-system/page.tsx  ← 7 secciones expandibles
│   │   ├── products/page.tsx
│   │   ├── prompts/page.tsx
│   │   ├── roadmap/page.tsx
│   │   └── strategy/page.tsx
│   ├── globals.css             ← Design System CORE completo
│   ├── layout.tsx              ← Layout con Sidebar
│   └── page.tsx                ← Inicio con stats y secciones
├── components/
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
├── lib/
│   └── supabaseClient.ts       ← createClient() con @supabase/ssr
├── types/
│   └── supabase.ts
├── public/
│   └── CORE_DesignSystem_v1.0.docx
├── middleware.ts               ← Protección de rutas con @supabase/ssr
├── .env.local                  ← Variables Supabase (en .gitignore)
├── .env.example                ← Template de variables
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.js          ← Tokens CORE completos
├── tsconfig.json
├── postcss.config.js
└── README.md
```

### 2.2 Stack técnico

| Componente | Versión |
|-----------|---------|
| Next.js | 14.2.3 ⚠️ tiene vulnerabilidad de seguridad |
| React | ^18 |
| @supabase/ssr | ^0.10.3 |
| @supabase/supabase-js | ^2.106.2 |
| TypeScript | ^5 |
| Tailwind CSS | ^3.4.1 |

### 2.3 Autenticación

- Login con email/password via Supabase
- Pantalla de aviso de confidencialidad trilingual (ES/EN/PT)
- Middleware de protección de todas las rutas excepto `/login` y `/aviso`
- Cerrar sesión desde Sidebar

### 2.4 Documentación disponible en web

| Sección | Estado |
|---------|--------|
| Prompts | ✅ Online |
| Arquitectura | ✅ Online |
| Estrategia | ✅ Online |
| Roadmap | ✅ Online |
| Productos | ✅ Online |
| Design System | ✅ Online + descarga .docx |

---

## 3. Matriz de Diferencias

### 3.1 Existe en CORE pero falta en Biblioteca

| Elemento | Ubicación en CORE | Impacto |
|----------|-----------------|---------|
| `apps/core-biblio` | `C:\CORE\apps\core-biblio` | **CRÍTICO** — versión duplicada y desactualizada de la Biblioteca dentro del monorepo |
| `packages/core-globe` | `C:\CORE\packages\core-globe` | Alto — Globe Experience no integrado en Biblioteca |
| Docs `.md` reales | `C:\CORE\docs/` | Alto — archivos `.md` de docs no sincronizados con páginas de Biblioteca |
| `PROMPTS_Sonet.docx` | `C:\CORE\docs/` | Medio — prompts oficiales en Word, no en Biblioteca web |
| `CHECKLIST ACTUALIZADA.docx` | `C:\CORE\docs/` | Medio — checklist no visible en Biblioteca |
| `CORE_MASTER_DOCUMENT_v1.0.docx` | `C:\CORE\docs/` | Medio — master document no disponible para descarga en Biblioteca |
| `CORE_DERIVADOS_v1.0.docx` | `C:\CORE\docs/` | Medio — derivados no disponibles en Biblioteca |
| `audit/report.txt` | `C:\CORE\audit/` | Bajo — reporte de auditoría no indexado |
| `infrastructure/` | `C:\CORE\infrastructure/` | Bajo — infraestructura no documentada en Biblioteca |
| `AGENTS.md` / `CLAUDE.md` | En cada app | Bajo — guías de agente no centralizadas |
| Sección `css/` en docs | `C:\CORE\docs/css/` | Bajo — docs CSS no sincronizadas |

### 3.2 Existe en Biblioteca pero falta/desalineado en CORE

| Elemento | Ubicación en Biblioteca | Impacto |
|----------|------------------------|---------|
| Auth completa (Supabase) | `middleware.ts`, `app/login/`, `app/aviso/` | **CRÍTICO** — `apps/core-biblio` no tiene auth |
| Design System completo | `app/globals.css`, `tailwind.config.js` | Alto — `apps/core-biblio` tiene config mínima |
| `DocCard` expandible | `app/components/DocCard.tsx` | Alto — no existe en `apps/core-biblio` |
| `Sidebar` con cerrar sesión | `app/components/Sidebar.tsx` | Alto — no sincronizado con `apps/core-biblio` |
| `/docs/design-system` | `app/docs/design-system/` | Medio — no existe en `apps/core-biblio` |
| `components/ui/` | `components/ui/Button.tsx`, `Input.tsx` | Medio — no existe en `apps/core-biblio` |
| `.env.example` | `.env.example` | Medio — no existe en monorepo raíz |
| `CORE_DesignSystem_v1.0.docx` | `public/` | Bajo — no sincronizado con `C:\CORE\docs/` |

### 3.3 Duplicados

| Elemento | Ubicación 1 | Ubicación 2 | Acción |
|----------|------------|------------|--------|
| Biblioteca Next.js | `C:\CORE\Biblioteca\` | `C:\CORE\apps\core-biblio\` | Eliminar `core-biblio`, mantener `Biblioteca` |
| Docs de arquitectura | `C:\CORE\docs\architecture\` | `C:\CORE\Biblioteca\app\docs\architecture\` | Sincronizar |
| Docs de prompts | `C:\CORE\docs\prompts\` | `C:\CORE\Biblioteca\app\docs\prompts\` | Sincronizar |
| Docs de estrategia | `C:\CORE\docs\strategy\` | `C:\CORE\Biblioteca\app\docs\strategy\` | Sincronizar |
| CORE_DesignSystem.docx | `C:\CORE\Biblioteca\public\` | `C:\CORE\docs\` (ausente) | Copiar a docs/ |

### 3.4 Desalineados

| Elemento | Estado en CORE | Estado en Biblioteca | Problema |
|----------|---------------|---------------------|---------|
| `turbo.json` build script | Filtra solo `core-landing` | No está en monorepo | Build de Biblioteca no incluido en turbo |
| Package manager | pnpm (monorepo) | npm (Biblioteca standalone) | Inconsistencia de package manager |
| Next.js version | No especificada en core-biblio | 14.2.3 con vulnerabilidad | Versión desactualizada |
| `apps/core-biblio` package.json | Sin auth dependencies | Biblioteca tiene @supabase/ssr | core-biblio está abandonado |

---

## 4. Plan de Sincronización

### FASE 1 — Limpiar duplicados (Prioridad: CRÍTICA)

**1.1 Deprecar `apps/core-biblio`**
```
ACCIÓN: Renombrar a apps/core-biblio-DEPRECATED
MOTIVO: La Biblioteca real vive en C:\CORE\Biblioteca
RIESGO: Bajo — core-biblio no está en producción
```

**1.2 Mover Biblioteca al monorepo**
```
ACCIÓN: Mover C:\CORE\Biblioteca → C:\CORE\apps\core-biblioteca
MOTIVO: Unificar bajo el monorepo con pnpm
REQUIERE:
  - Actualizar pnpm-workspace.yaml para incluir apps/core-biblioteca
  - Actualizar turbo.json para incluir core-biblioteca en outputs y build
  - Actualizar vercel.json para apuntar a apps/core-biblioteca
  - Migrar package.json de npm a pnpm
```

**1.3 Actualizar turbo.json**
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "apps/core-landing/.next/**",
        "apps/core-biblioteca/.next/**"
      ]
    }
  }
}
```

---

### FASE 2 — Sincronizar documentación (Prioridad: ALTA)

**2.1 Copiar docs `.md` de CORE a Biblioteca**
```
ORIGEN:  C:\CORE\docs\prompts\*.md
DESTINO: Usar como fuente de verdad para app/docs/prompts/page.tsx

ORIGEN:  C:\CORE\docs\architecture\*.md
DESTINO: Usar como fuente de verdad para app/docs/architecture/page.tsx

ORIGEN:  C:\CORE\docs\strategy\*.md
DESTINO: Usar como fuente de verdad para app/docs/strategy/page.tsx
```

**2.2 Copiar documentos Word a Biblioteca**
```
ORIGEN:  C:\CORE\docs\CORE_MASTER_DOCUMENT_v1.0.docx
DESTINO: C:\CORE\Biblioteca\public\

ORIGEN:  C:\CORE\docs\CORE_DERIVADOS_v1.0.docx
DESTINO: C:\CORE\Biblioteca\public\

ORIGEN:  C:\CORE\docs\PROMPTS_Sonet.docx
DESTINO: C:\CORE\Biblioteca\public\
```

**2.3 Copiar DesignSystem a docs raíz**
```
ORIGEN:  C:\CORE\Biblioteca\public\CORE_DesignSystem_v1.0.docx
DESTINO: C:\CORE\docs\CORE_DesignSystem_v1.0.docx
```

**2.4 Agregar secciones faltantes en Biblioteca**
```
CREAR: app/docs/master-document/page.tsx  ← CORE_MASTER_DOCUMENT
CREAR: app/docs/checklist/page.tsx        ← CHECKLIST ACTUALIZADA
CREAR: app/docs/infrastructure/page.tsx  ← Infraestructura crítica
```

---

### FASE 3 — Sincronizar código (Prioridad: ALTA)

**3.1 Actualizar Next.js**
```
ACCIÓN: next 14.2.3 → 15.x (latest stable)
MOTIVO: Vulnerabilidad de seguridad documentada
COMANDO: npm install next@latest
```

**3.2 Copiar auth completa a apps/core-biblio (o deprecarlo)**
```
SI se mantiene core-biblio:
  COPIAR: middleware.ts, app/login/, app/aviso/, lib/, types/, components/ui/
SI se depreca:
  RENOMBRAR y documentar
```

**3.3 Centralizar componentes UI**
```
CREAR: packages/core-ui/
  MOVER: components/ui/Button.tsx → packages/core-ui/src/Button.tsx
  MOVER: components/ui/Input.tsx  → packages/core-ui/src/Input.tsx
  MOVER: app/components/DocCard.tsx → packages/core-ui/src/DocCard.tsx
  MOVER: app/components/PageHeader.tsx → packages/core-ui/src/PageHeader.tsx
BENEFICIO: Reutilizable en core-landing y futuros apps
```

**3.4 Integrar core-globe en Biblioteca**
```
ACCIÓN: Importar packages/core-globe en Biblioteca
DESTINO: Página de inicio o sección de arquitectura
```

---

### FASE 4 — Estandarizar configuración (Prioridad: MEDIA)

**4.1 Unificar package manager**
```
ACCIÓN: Migrar Biblioteca de npm a pnpm
COMANDO: 
  rm package-lock.json
  pnpm import  (convierte package-lock.json a pnpm-lock.yaml)
  pnpm install
```

**4.2 Agregar .env.example al monorepo raíz**
```
CREAR: C:\CORE\.env.example
CONTENIDO:
  # Supabase — Biblioteca
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**4.3 Centralizar AGENTS.md y CLAUDE.md**
```
ACCIÓN: Crear C:\CORE\AGENTS.md y C:\CORE\CLAUDE.md raíz
CONTENIDO: Guía unificada para agentes en todo el monorepo
MANTENER: Versiones específicas en cada app para contexto local
```

**4.4 Actualizar turbo build script**
```json
"scripts": {
  "dev": "turbo run dev --parallel",
  "build": "turbo run build",
  "build:landing": "turbo run build --filter=core-landing",
  "build:biblioteca": "turbo run build --filter=core-biblioteca"
}
```

---

### FASE 5 — Documentar (Prioridad: MEDIA)

**5.1 Crear README raíz actualizado**
```
DOCUMENTAR:
  - Estructura del monorepo
  - Cómo correr cada app
  - Variables de entorno requeridas
  - Deploy en Vercel
  - Convenciones de código
```

**5.2 Agregar prompts a Biblioteca**
```
ACCIÓN: Crear página /docs/prompts con los 3 prompts reales de C:\CORE\docs\prompts\
  - CORE-PM-0001.md
  - CORE-PM-0100.md  
  - CORE-PM-0200.md
ACTUAL: La página de prompts tiene prompts de ejemplo, no los reales
```

**5.3 Documentar scripts**
```
CREAR: C:\CORE\scripts\README.md
DOCUMENTAR: fix_favicons.js y fix.js — propósito, uso, cuándo ejecutar
```

---

## 5. Resumen Ejecutivo

| # | Acción | Prioridad | Esfuerzo |
|---|--------|-----------|---------|
| 1 | Deprecar `apps/core-biblio` | 🔴 Crítica | Bajo |
| 2 | Actualizar Next.js 14 → 15 | 🔴 Crítica | Bajo |
| 3 | Mover Biblioteca al monorepo | 🟠 Alta | Medio |
| 4 | Sincronizar docs `.md` reales con páginas Biblioteca | 🟠 Alta | Medio |
| 5 | Copiar documentos Word a `public/` de Biblioteca | 🟠 Alta | Bajo |
| 6 | Crear `packages/core-ui` con componentes compartidos | 🟠 Alta | Alto |
| 7 | Integrar `core-globe` en Biblioteca | 🟡 Media | Alto |
| 8 | Migrar Biblioteca de npm a pnpm | 🟡 Media | Bajo |
| 9 | Crear `.env.example` en raíz monorepo | 🟡 Media | Bajo |
| 10 | Actualizar prompts reales en Biblioteca | 🟡 Media | Medio |
| 11 | Documentar `scripts/` | 🟢 Baja | Bajo |
| 12 | Centralizar `AGENTS.md` / `CLAUDE.md` | 🟢 Baja | Bajo |

---

## 6. Estado Final Objetivo

```
C:\CORE\                          ← Monorepo raíz
├── apps/
│   ├── core-landing/             ← Landing page pública
│   ├── core-biblioteca/          ← Biblioteca (desde C:\CORE\Biblioteca)
│   └── core-biblio-DEPRECATED/   ← Marcado como deprecated
├── packages/
│   ├── core-globe/               ← Globe Experience compartido
│   └── core-ui/                  ← Componentes UI compartidos (nuevo)
├── docs/                         ← Fuente de verdad de documentación
├── .env.example                  ← Variables de entorno documentadas
├── AGENTS.md                     ← Guía de agentes centralizada
└── README.md                     ← Actualizado
```

---

*CORE — Auditoría de Sincronización v1.0 · Junio 2026 · Confidencial — Uso interno*
