# Admin Standalone — CharliеMarket

Aplicación independiente del panel de administración, extraída de `core-market`.

## Estructura

```
src/
├── components/
│   └── AdminLayout.tsx        # Shell: sidebar + header + <Outlet>
├── hooks/
│   ├── useUserRole.ts         # Auth + rol (admin / user) via Supabase
│   ├── useAdminStats.ts       # Vista admin_stats
│   ├── useAdminOrders.ts      # Vista admin_orders / ordenes
│   └── useAdminProducts.ts    # Vista admin_products
├── pages/
│   ├── LoginPage.tsx          # Login con email/contraseña
│   ├── AdminDashboard.tsx     # Cards de KPIs
│   ├── AdminOrders.tsx        # Tabla de órdenes con filtros
│   ├── AdminProducts.tsx      # Gestión de productos + stock
│   ├── AdminAnalytics.tsx     # Gráficos recharts
│   └── AdminML.tsx            # Sync MercadoLibre
├── utils/
│   └── supabase.ts            # createClient
├── styles/
│   └── index.css
├── App.tsx                    # Router
└── main.tsx
```

## Rutas

| Ruta             | Componente        | Acceso     |
|------------------|-------------------|------------|
| `/login`         | LoginPage         | Público    |
| `/admin`         | AdminDashboard    | Auth       |
| `/admin/orders`  | AdminOrders       | Auth       |
| `/admin/products`| AdminProducts     | Auth       |
| `/admin/analytics`| AdminAnalytics  | Admin only |
| `/admin/ml`      | AdminML           | Admin only |

## Setup

1. Copia `.env.example` → `.env.local` y completa las variables:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

2. Instala dependencias:
   ```bash
   npm install
   # o
   pnpm install
   ```

3. Inicia en modo desarrollo:
   ```bash
   npm run dev
   ```

4. Build para producción:
   ```bash
   npm run build
   ```

## Dependencias clave

- `react` + `react-dom` v18
- `react-router-dom` v6
- `@supabase/supabase-js` v2
- `recharts` (gráficos en Analytics)

## Tablas/vistas Supabase requeridas

- `admin_stats` — vista con KPIs globales
- `admin_orders` — vista de órdenes
- `admin_products` — vista de productos
- `admin_ml_errors` — errores de sync ML
- `ml_sync_queue` — cola de sincronización ML
- `ordenes` — tabla base de órdenes

## Notas

- El rol de admin se determina por `user.user_metadata.role === "admin"`.
  Asignalo desde el dashboard de Supabase o con un trigger.
- Las secciones Catálogo, Biblioteca, Editor, Import/Export, Perfil y ApiVault
  existen en el proyecto original (`core-market`) y pueden agregarse al router
  copiando los archivos correspondientes de `src/app/admin/pages/`.
