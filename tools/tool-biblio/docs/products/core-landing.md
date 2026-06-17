# CORE — core-landing (Producto Oficial)

**ID:** `CORE-PM-PRODUCT-LANDING-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno

---

## 1. Descripción General

`core-landing` es la landing page pública del ecosistema CORE. Es la puerta de entrada para empresas, inversores y socios que buscan conocer la plataforma.

Su propósito es comunicar la propuesta de valor de CORE — conectar cadenas de suministro globales con oportunidades regionales en Latinoamérica — a través de una experiencia visual premium centrada en el Globe Experience.

Dentro del ecosistema CORE cumple tres roles:

- **Comercial:** primer punto de contacto con el mercado. Presenta los módulos CORE Connect, CORE Move, CORE Grow y CORE Market.
- **Visual:** el globo interactivo es el elemento más distintivo de la marca. Representa operaciones en tiempo real, rutas logísticas y expansión regional.
- **Estratégico:** comunica la visión 2035 y posiciona a CORE como la infraestructura operativa de LATAM.

Su relación con la marca es directa: implementa el Design System oficial (Navy-Blue-Gold), la tipografía Calibri y el Globe Experience definidos en `CORE_DesignSystem_v1.0.docx`.

---

## 2. Arquitectura Funcional

### Framework

- Next.js (App Router)
- TypeScript
- React 18

### Estructura de carpetas

```
apps/core-landing/
├── app/                  ← Rutas y páginas (App Router)
├── components/           ← Componentes UI de la landing
├── content/              ← Contenido estático (textos, datos)
├── public/               ← Assets estáticos
├── next.config.js
├── package.json
├── tsconfig.json
└── postcss.config.mjs
```

### Tailwind CSS

- Configurado via `postcss.config.mjs`
- Tokens de color y tipografía alineados con el Design System CORE
- Referencia: `CORE_DesignSystem_v1.0.docx`

### Componentes UI

- Componentes propios en `components/`
- Pendiente de migrar a `packages/core-ui` cuando esté disponible

### Integración con core-globe

- `packages/core-globe` es el package compartido del Globe Experience
- La landing importa el componente globe desde `@core/globe`
- El globo se renderiza en la sección Hero de la página principal
- Ver sección 6 para detalles de integración

### Flujo de carga

1. Next.js renderiza la página en el servidor (SSR / SSG según la ruta)
2. El cliente hidrata los componentes interactivos
3. El Globe Experience se inicializa en el cliente con Three.js
4. Las rutas y hubs del globo se activan progresivamente

### SEO

- Meta tags básicos via `app/layout.tsx`
- Open Graph pendiente de implementar
- Sitemap pendiente de generar

### Internacionalización

- No implementada actualmente
- Planificada para Fase 2 (ES / PT / EN)

---

## 3. Dependencias Principales

| Dependencia | Propósito | Estado |
|-------------|-----------|--------|
| `next` | Framework principal | ✅ Instalado |
| `react` | UI library | ✅ Instalado |
| `react-dom` | DOM rendering | ✅ Instalado |
| `typescript` | Tipado estático | ✅ Instalado |
| `tailwindcss` | Estilos utilitarios | ✅ Instalado |
| `postcss` | Procesamiento CSS | ✅ Instalado |
| `@core/globe` | Globe Experience | ⬜ Pendiente de integrar |

> No se listan dependencias no confirmadas en `package.json` real.

---

## 4. Variables de Entorno

Referencia completa: `docs/env/CORE-ENV.md`

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio en producción | ✅ Sí |
| `NEXT_PUBLIC_GA_ID` | ID de Google Analytics | ⬜ Opcional |
| `NEXT_PUBLIC_GLOBE_API_URL` | URL de la API del Globe Experience | ⬜ Opcional |

```env
NEXT_PUBLIC_SITE_URL=https://core.lat
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GLOBE_API_URL=https://api.core.lat/globe
```

> Nunca commitear `.env.local`. Usar `.env.example` como referencia.

---

## 5. Integración con Vercel

| Campo | Valor |
|-------|-------|
| Root Directory | `apps/core-landing` |
| Build Command | `turbo run build --filter=core-landing` |
| Install Command | `pnpm install` |
| Output Directory | `.next` (Next.js default) |
| Node Version | >=20 |

### Dominios

| Dominio | Estado |
|---------|--------|
| `core.lat` | ⬜ Pendiente de configurar |
| `core.com.uy` | ⬜ Pendiente de configurar |
| `*.vercel.app` | ⬜ Deploy preview activo al configurar |

### Observaciones de deploy

- El monorepo usa pnpm + Turbo. Vercel debe detectar el root directory como `apps/core-landing`.
- `apps/core-landing` tiene `package-lock.json` (npm) en lugar de `pnpm-lock.yaml` — pendiente de migrar.
- El build script raíz del monorepo filtra solo `core-landing`: `turbo run build --filter=core-landing`.

---

## 6. Integración con el Globo CORE

### Package

`packages/core-globe` — Globe Experience compartido del ecosistema.

### Datos que muestra

- Países CORE activos: Uruguay, Brasil, Paraguay, Argentina, Chile
- Rutas logísticas animadas entre países
- Hubs logísticos con animación pulsante
- Expansión futura: Perú, Colombia, México, Bolivia

### Animaciones y modos

| Elemento | Comportamiento |
|----------|---------------|
| Rotación | Suave y constante |
| Rutas | Líneas animadas por arco, grosor según volumen |
| Hubs | Puntos pulsantes, tamaño según actividad |
| Modo día/noche | Basado en UTC, gradiente dinámico |
| Color por vertical | Azul=logística · Oro=rep · Verde=market |

### Ubicación en la landing

- Sección Hero — elemento visual principal
- Visible en el viewport inicial sin scroll

### Estado de integración

- [ ] `packages/core-globe` integrado en `apps/core-landing`
- [ ] Globe renderizando en sección Hero
- [ ] Datos de rutas conectados a API real
- [ ] Modo día/noche activo

---

## 7. Estado Actual del Producto

### Completo

- [x] Estructura de carpetas creada
- [x] Next.js configurado
- [x] TypeScript configurado
- [x] PostCSS / Tailwind configurado
- [x] `AGENTS.md` y `CLAUDE.md` presentes
- [x] Incluido en `turbo.json` outputs

### En progreso

- [ ] Contenido de secciones en `content/`
- [ ] Componentes en `components/`

### Pendiente

- [ ] Integración de `packages/core-globe`
- [ ] Secciones Connect / Move / Grow / Market
- [ ] Deploy en Vercel
- [ ] Configuración de dominio
- [ ] SEO completo
- [ ] Migración de npm a pnpm

### Planificado

- [ ] Internacionalización ES / PT / EN
- [ ] Integración con `packages/core-ui`
- [ ] Analytics
- [ ] Performance tuning

---

## 8. Checklist del Producto

### Setup

- [x] Repositorio creado en monorepo
- [x] Next.js inicializado
- [x] TypeScript configurado
- [x] Tailwind configurado
- [ ] Migrar `package-lock.json` a `pnpm-lock.yaml`
- [ ] `.env.example` creado

### Desarrollo

- [ ] Hero section con Globe Experience
- [ ] Sección CORE Connect
- [ ] Sección CORE Move
- [ ] Sección CORE Grow
- [ ] Sección CORE Market
- [ ] Footer con links y legal
- [ ] Formulario de contacto / CTA

### Globe

- [ ] `packages/core-globe` integrado
- [ ] Globe visible en Hero
- [ ] Rutas animadas activas
- [ ] Hubs pulsantes activos
- [ ] Modo día/noche activo

### Calidad

- [ ] SEO avanzado (meta, OG, sitemap, robots.txt)
- [ ] Optimización de imágenes (next/image)
- [ ] Performance tuning (Lighthouse > 90)
- [ ] Mobile responsive validado
- [ ] Accesibilidad básica (a11y)
- [ ] Animaciones con `prefers-reduced-motion`

### Deploy

- [ ] Proyecto configurado en Vercel
- [ ] Variables de entorno cargadas en Vercel
- [ ] Dominio `core.lat` o `core.com.uy` configurado
- [ ] Deploy automático en push a `main`
- [ ] Preview deployments activos

### Documentación

- [ ] `README.md` actualizado con instrucciones de desarrollo
- [ ] `docs/products/core-landing.md` completo (este documento)
- [ ] Prompts de generación guardados en `docs/prompts/`
- [ ] Variables de entorno documentadas en `docs/env/CORE-ENV.md`

### Futuro

- [ ] Internacionalización (ES / PT / EN)
- [ ] Integración con `packages/core-ui`
- [ ] Integración con Supabase (si aplica)
- [ ] Analytics configurado

---

## 9. Roadmap del Producto

### Fase 1 — MVP (Q2–Q3 2026)

- Hero con Globe Experience funcional
- Secciones Connect / Move / Grow / Market
- CTA y formulario de contacto
- Deploy en Vercel con dominio propio
- SEO básico

### Fase 2 — Mejoras visuales (Q4 2026)

- Animaciones avanzadas del globo
- Integración con `packages/core-ui`
- Optimización de performance
- Internacionalización ES / PT / EN

### Fase 3 — Integración con ecosistema (2027)

- Link a Biblioteca (acceso interno)
- Datos del globo conectados a API real de operaciones
- Mapa de calor comercial
- Integración con CORE Market (catálogo público)

### Fase 4 — Expansión (2028+)

- Nuevos idiomas según expansión regional
- Nuevos países en el globo al activarse
- Secciones de expansión actualizadas dinámicamente

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Junio 2026 | Creación inicial |

---

*CORE — core-landing · v1.0 · Junio 2026 · Confidencial — Uso interno*
