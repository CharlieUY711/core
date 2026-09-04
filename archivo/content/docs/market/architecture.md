# CORE Market — Arquitectura

**ID:** `CORE-PM-MARKET-ARCH-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno

---

## 1. Descripción General

CORE Market es el marketplace B2B/B2C del ecosistema CORE. Originalmente desarrollado como "CORE Market Frontstore", migrado al monorepo CORE como `apps/core-market`.

Conecta vendedores (marcas, distribuidores, importadores) con compradores (supermercados, restaurantes, tiendas especializadas) en el Cono Sur.

---

## 2. Stack Técnico

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | Vite + React | React 18.3.1 |
| Router | React Router DOM | 7.x |
| UI Components | Radix UI + shadcn | - |
| UI Library | MUI | 7.x |
| Estilos | Tailwind CSS 4 + CSS custom | 4.1.12 |
| Animaciones | Motion | 12.x |
| Estado | Zustand | 5.x |
| Backend | Supabase | 2.x |
| Build | Vite | 6.3.5 |
| Mapas | Mapbox GL + Leaflet | - |
| Gráficos | Recharts | 2.x |
| Forms | React Hook Form | 7.x |

> ⚠️ El Market usa Vite (no Next.js). No tiene SSR. Es una SPA.

---

## 3. Estructura de Carpetas

```
C:\CORE\apps\core-market\
├── src/
│   ├── app/
│   │   ├── App.tsx               ← Root con RouterProvider
│   │   ├── routes.tsx            ← Todas las rutas definidas
│   │   ├── admin/
│   │   │   ├── components/       ← Layout admin
│   │   │   ├── editor/           ← Editor de publicaciones
│   │   │   ├── hooks/
│   │   │   ├── pages/            ← Páginas admin
│   │   │   └── services/
│   │   ├── components/           ← Componentes compartidos de la app
│   │   ├── events/
│   │   ├── hooks/                ← Hooks de la app pública
│   │   ├── public/               ← Páginas públicas del storefront
│   │   └── services/             ← Servicios y API calls
│   ├── components/
│   │   └── MapView.tsx
│   ├── dashboard/                ← Dashboard de usuario
│   │   ├── hooks/
│   │   └── layout/
│   ├── hooks/
│   ├── styles/
│   │   ├── brand.css             ← Tokens CORE
│   │   ├── theme.css             ← Componentes UI CORE
│   │   ├── core-market-patch.css ← Patch visual CORE
│   │   ├── legacy-storefront.css              ← CSS original (contiene [data-sh])
│   │   └── index.css             ← Entry point CSS
│   └── utils/
├── app/
│   ├── admin/                    ← API routes admin
│   └── api/                     ← API routes
├── lib/
│   ├── parser.ts
│   └── schema.ts
├── supabase/
├── vite.config.ts
└── package.json
```

---

## 4. Rutas Principales

| ID | Path | Componente | Descripción |
|----|------|-----------|-------------|
| `storefront` | `/` | CoreStorefront | Tienda principal |
| `tienda` | `/tienda` | CoreStorefront | Alias tienda |
| `carrito` | `/carrito` | CarritoPage | Carrito de compras |
| `checkout` | `/checkout` | CheckoutPage | Proceso de pago |
| `orden` | `/orden/:id` | OrdenPage | Detalle de orden |
| `etiqueta-emotiva` | `/m/:token` | MensajePage | Mensajes especiales |
| `success` | `/success` | SuccessPage | Pago exitoso |
| `failure` | `/failure` | FailurePage | Pago fallido |
| `pending` | `/pending` | PendingPage | Pago pendiente |
| `dashboard` | `/dashboard` | DashboardRedirect | Dashboard usuario |
| `admin` | `/admin` | AdminLayout | Panel administrador |
| `admin-orders` | `/admin/orders` | AdminOrders | Órdenes admin |
| `admin-catalog` | `/admin/catalog` | AdminCatalog | Catálogo |
| `admin-publicaciones` | `/admin/publicaciones` | AdminPublicaciones | Publicaciones |
| `admin-ml` | `/admin/ml` | AdminML | MercadoLibre |
| `admin-biblioteca` | `/admin/biblioteca` | AdminBiblioteca | Biblioteca |
| `admin-editor` | `/admin/editor` | AdminEditor | Editor |

---

## 5. Secciones del Storefront

### CORE Market
- Productos nuevos de marcas y vendedores
- Categorías: Electro, Moda, Hogar, Almacén, Mascotas, etc.
- Visual system: CORE (Navy/Blue/Gold)

### Second Hand
- Productos usados con condición y precio
- Activado via `[data-sh="true"]` en el DOM
- Visual system: **Verde exclusivo — NO modificar**
- Categorías propias

---

## 6. Integración con Supabase

- Auth: `@supabase/supabase-js`
- Client: `src/utils/supabase/client.ts`
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Funciones Edge: `VITE_API_URL`

---

## 7. Integración con Monorepo CORE

| Campo | Valor |
|-------|-------|
| Ubicación | `C:\CORE\apps\core-market` |
| Nombre package | `core-market` |
| Build output | `dist/` |
| Build command | `vite build` |
| Dev command | `vite` |
| Turbo task | `build`, `dev`, `lint` |

---

## 8. Aliases de Importación

```ts
// vite.config.ts
'@'         → ./src
'@modulos'  → ../../Charlie/Modulos   // ⚠️ Alias externo al monorepo
'@constructor' → ../Constructor/src   // ⚠️ Alias externo al monorepo
```

> ⚠️ Los aliases `@modulos` y `@constructor` apuntan fuera del monorepo CORE. Pendiente de resolver en migración.

---

## 9. Tareas Pendientes de Migración

- [ ] Renombrar `package.json` name de `core-market` a `core-market`
- [ ] Resolver aliases `@modulos` y `@constructor` que apuntan fuera del monorepo
- [ ] Reemplazar referencias a clases CSS `core-*` por `core-*` en archivos `.tsx`
- [ ] Limpiar 150+ archivos `fix*.mjs` de la raíz
- [ ] Migrar archivos `fix*.mjs` útiles a `scripts/`
- [ ] Configurar `turbo.json` con task para `core-market`
- [ ] Crear `.env.example` actualizado

---

*CORE Market — Arquitectura v1.0 · Junio 2026 · Confidencial — Uso interno*
