# 📦 Frontstore Standalone - Archivos Necesarios

Este documento lista todos los archivos necesarios para que la **Frontstore** funcione de forma independiente (Standalone) del resto del proyecto.

---

## 📋 Resumen

La Frontstore incluye:
- **Páginas públicas**: Storefront principal, Carrito, Checkout, Orden, Mensaje
- **Servicios API**: Productos, Carrito, Órdenes, Departamentos
- **Hooks**: useProductos
- **Utilidades**: Cliente Supabase, Configuración
- **Estilos**: CSS específicos de la frontstore
- **Configuración**: Rutas, App principal, Build config

---

## 📁 Estructura de Archivos Necesarios

### 1. **Páginas Públicas (Frontstore)**

```
src/app/public/
├── OddyStorefront.tsx      ✅ Componente principal del storefront
├── CarritoPage.tsx         ✅ Página del carrito de compras
├── CheckoutPage.tsx        ✅ Página de checkout
├── OrdenPage.tsx           ✅ Página de confirmación de orden
└── MensajePage.tsx         ✅ Página de mensajes (Etiqueta Emotiva)
```

### 2. **Servicios API**

```
src/app/services/
├── carritoApi.ts           ✅ API del carrito de compras
├── productosApi.ts         ✅ API de productos (Market + Second Hand)
├── ordenesApi.ts          ✅ API de órdenes
└── departamentosApi.ts    ✅ API de departamentos/categorías
```

### 3. **Hooks**

```
src/app/hooks/
└── useProductos.ts        ✅ Hook para cargar productos desde API
```

### 4. **Utilidades Supabase**

```
src/utils/supabase/
├── client.ts              ✅ Cliente de Supabase
└── info.ts                ✅ Configuración de Supabase (projectId, publicAnonKey)
```

### 5. **Estilos CSS**

```
src/styles/
├── index.css              ✅ Estilos principales (importa otros)
├── oddy.css               ✅ Estilos específicos de la frontstore
├── fonts.css              ✅ Importación de fuentes
├── tailwind.css           ✅ Base de Tailwind
└── theme.css              ✅ Tokens de diseño (colores)
```

### 6. **Configuración de Rutas**

```
src/app/
├── routes.tsx             ✅ Configuración de rutas React Router
└── App.tsx                ✅ Componente raíz de la aplicación
```

### 7. **Punto de Entrada**

```
src/
└── main.tsx               ✅ Punto de entrada React
```

### 8. **Archivos de Configuración del Proyecto**

```
Raíz del proyecto/
├── index.html              ✅ HTML principal
├── package.json            ✅ Dependencias del proyecto
├── vite.config.ts         ✅ Configuración de Vite
├── tsconfig.json           ✅ Configuración de TypeScript
└── tsconfig.node.json      ✅ Configuración TypeScript para Node
```

---

## 🔍 Dependencias Externas (NPM)

### Dependencias Principales

```json
{
  "@supabase/supabase-js": "^2.97.0",
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "react-router": "7.13.0"
}
```

### Dependencias de Desarrollo

```json
{
  "@vitejs/plugin-react": "4.7.0",
  "@tailwindcss/vite": "4.1.12",
  "tailwindcss": "4.1.12",
  "vite": "6.3.5",
  "typescript": "5.x"
}
```

---

## 📝 Archivos Detallados por Categoría

### **Páginas Públicas**

| Archivo | Descripción | Dependencias |
|---------|-------------|--------------|
| `OddyStorefront.tsx` | Storefront principal con productos Market y Second Hand | `carritoApi`, `useProductos`, `supabase/client`, `oddy.css` |
| `CarritoPage.tsx` | Página del carrito de compras | `carritoApi`, `productosApi`, `oddy.css` |
| `CheckoutPage.tsx` | Página de checkout | `carritoApi`, `productosApi`, `ordenesApi`, `oddy.css` |
| `OrdenPage.tsx` | Confirmación de orden | `ordenesApi`, `oddy.css` |
| `MensajePage.tsx` | Página de mensajes (Etiqueta Emotiva) | `supabase/info` |

### **Servicios API**

| Archivo | Descripción | Endpoints Backend |
|---------|-------------|-------------------|
| `carritoApi.ts` | Gestión del carrito | `/carrito` (GET, POST, PUT, DELETE) |
| `productosApi.ts` | Productos Market y Second Hand | `/productos/market`, `/productos/secondhand` |
| `ordenesApi.ts` | Gestión de órdenes | `/ordenes` (GET, POST) |
| `departamentosApi.ts` | Departamentos/categorías | `/departamentos` |

### **Hooks**

| Archivo | Descripción | Usa |
|---------|-------------|-----|
| `useProductos.ts` | Hook para cargar productos | `productosApi`, `departamentosApi` |

### **Utilidades**

| Archivo | Descripción | Contiene |
|---------|-------------|----------|
| `client.ts` | Cliente Supabase | Instancia de `createClient` |
| `info.ts` | Configuración Supabase | `projectId`, `publicAnonKey` |

### **Estilos**

| Archivo | Descripción | Importa |
|---------|-------------|----------|
| `index.css` | Estilos principales | `fonts.css`, `tailwind.css`, `theme.css` |
| `oddy.css` | Estilos específicos frontstore | Variables CSS, componentes ODDY |
| `fonts.css` | Fuentes Google Fonts | DM Sans, Bebas Neue, JetBrains Mono |
| `tailwind.css` | Base Tailwind | Configuración Tailwind v4 |
| `theme.css` | Tokens de diseño | Colores, variables de tema |

---

## 🔗 Dependencias entre Archivos

### Flujo Principal

```
index.html
  └── main.tsx
      └── App.tsx
          └── routes.tsx
              ├── OddyStorefront.tsx
              │   ├── useProductos (hook)
              │   │   ├── productosApi.ts
              │   │   └── departamentosApi.ts
              │   ├── carritoApi.ts
              │   └── supabase/client.ts
              ├── CarritoPage.tsx
              │   ├── carritoApi.ts
              │   └── productosApi.ts
              ├── CheckoutPage.tsx
              │   ├── carritoApi.ts
              │   ├── productosApi.ts
              │   └── ordenesApi.ts
              ├── OrdenPage.tsx
              │   └── ordenesApi.ts
              └── MensajePage.tsx
                  └── supabase/info.ts
```

### Dependencias de Servicios

```
carritoApi.ts
  └── supabase/info.ts
  └── supabase/client.ts

productosApi.ts
  └── supabase/info.ts

ordenesApi.ts
  └── supabase/info.ts
  └── supabase/client.ts

departamentosApi.ts
  └── supabase/info.ts
```

---

## ⚙️ Configuración Necesaria

### Variables de Entorno (implícitas en `info.ts`)

```typescript
// src/utils/supabase/info.ts
export const projectId = "yomgqobfmgatavnbtvdz";
export const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

### URLs de Backend (Supabase Edge Functions)

Todas las APIs apuntan a:

Endpoints:
- `/carrito`
- `/productos/market`
- `/productos/secondhand`
- `/ordenes`
- `/departamentos`

---

## 🚫 Archivos NO Necesarios (Admin/Backend)

Los siguientes archivos **NO** son necesarios para la frontstore standalone:

### Admin Dashboard
- `src/app/AdminDashboard.tsx`
- `src/app/components/admin/**`
- `src/app/components/auth/ProtectedRoute.tsx` (solo para admin)

### Componentes Admin
- Todos los componentes en `src/app/components/admin/`
- Componentes de gestión (ERP, CRM, Billing, etc.)

### Servicios Admin
- `src/app/services/catalogExtractorApi.ts`
- `src/app/services/preguntasApi.ts`
- `src/app/services/ratingsApi.ts`
- `src/app/services/rrssApi.ts`

### Otros
- `src/app/components/age-verification/**` (solo si no se usa)
- `src/app/components/secondhand/**` (solo componentes admin)
- Cualquier componente que no sea usado por las páginas públicas

---

## 📦 Checklist para Aislar Frontstore

### Paso 1: Copiar Archivos Esenciales

- [ ] Copiar carpeta `src/app/public/` completa
- [ ] Copiar `src/app/services/carritoApi.ts`
- [ ] Copiar `src/app/services/productosApi.ts`
- [ ] Copiar `src/app/services/ordenesApi.ts`
- [ ] Copiar `src/app/services/departamentosApi.ts`
- [ ] Copiar `src/app/hooks/useProductos.ts`
- [ ] Copiar `src/utils/supabase/` completa
- [ ] Copiar `src/styles/` completa
- [ ] Copiar `src/app/routes.tsx`
- [ ] Copiar `src/app/App.tsx`
- [ ] Copiar `src/main.tsx`

### Paso 2: Copiar Configuración

- [ ] Copiar `index.html`
- [ ] Copiar `package.json` (o crear uno mínimo)
- [ ] Copiar `vite.config.ts`
- [ ] Copiar `tsconfig.json` y `tsconfig.node.json`

### Paso 3: Verificar Dependencias

- [ ] Instalar dependencias: `pnpm install` o `npm install`
- [ ] Verificar que `@supabase/supabase-js` esté instalado
- [ ] Verificar que `react-router` esté instalado

### Paso 4: Configurar Variables

- [ ] Verificar `src/utils/supabase/info.ts` tiene los valores correctos
- [ ] Verificar que las URLs de backend sean correctas

### Paso 5: Probar

- [ ] Ejecutar `pnpm dev` o `npm run dev`
- [ ] Verificar que la página principal carga
- [ ] Verificar que los productos se cargan
- [ ] Verificar que el carrito funciona
- [ ] Verificar que el checkout funciona

---

## 🎯 Estructura Final del Proyecto Standalone

```
frontstore-standalone/
├── src/
│   ├── app/
│   │   ├── public/
│   │   │   ├── OddyStorefront.tsx
│   │   │   ├── CarritoPage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── OrdenPage.tsx
│   │   │   └── MensajePage.tsx
│   │   ├── services/
│   │   │   ├── carritoApi.ts
│   │   │   ├── productosApi.ts
│   │   │   ├── ordenesApi.ts
│   │   │   └── departamentosApi.ts
│   │   ├── hooks/
│   │   │   └── useProductos.ts
│   │   ├── routes.tsx
│   │   └── App.tsx
│   ├── utils/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── info.ts
│   ├── styles/
│   │   ├── index.css
│   │   ├── oddy.css
│   │   ├── fonts.css
│   │   ├── tailwind.css
│   │   └── theme.css
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.node.json
```

---

## 📊 Resumen de Archivos

| Categoría | Cantidad | Archivos |
|-----------|----------|----------|
| Páginas Públicas | 5 | OddyStorefront, CarritoPage, CheckoutPage, OrdenPage, MensajePage |
| Servicios API | 4 | carritoApi, productosApi, ordenesApi, departamentosApi |
| Hooks | 1 | useProductos |
| Utilidades | 2 | client.ts, info.ts |
| Estilos | 5 | index.css, oddy.css, fonts.css, tailwind.css, theme.css |
| Configuración | 6 | routes.tsx, App.tsx, main.tsx, index.html, package.json, vite.config.ts |
| **TOTAL** | **24** | Archivos esenciales |

---

## ✅ Conclusión

Para que la Frontstore funcione de forma **Standalone**, necesitas:

1. **24 archivos esenciales** (listados arriba)
2. **Dependencias NPM**: React, React Router, Supabase JS, Vite, Tailwind
3. **Backend**: Supabase Edge Functions desplegadas y funcionando
4. **Configuración**: Variables de Supabase en `info.ts`

La frontstore es **independiente** del Admin Dashboard y puede funcionar completamente sola con estos archivos.

---

**Última actualización**: 2025-01-27
