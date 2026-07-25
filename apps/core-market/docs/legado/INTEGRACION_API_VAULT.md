# Integración API Vault → core-market

## Estructura de archivos a agregar

```
core-market/
├── supabase/migrations/
│   └── 20260607_api_vault.sql          ← ejecutar en Supabase SQL Editor
└── src/app/admin/
    ├── services/
    │   ├── apiVaultTypes.ts             ← tipos e interfaces
    │   └── apiVaultService.ts           ← CRUD contra Supabase
    ├── hooks/
    │   └── useApiVault.ts               ← store Zustand
    └── pages/
        └── AdminApiVault.tsx            ← página completa
```

---

## Paso 1 — Migración en Supabase

1. Abre tu proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor**
3. Copia y ejecuta el contenido de `supabase/migrations/20260607_api_vault.sql`

Esto crea la tabla `api_vault` con RLS activado: cada usuario solo accede a sus propios registros.

---

## Paso 2 — Copiar los archivos

Copia los 4 archivos en las rutas indicadas dentro de `core-market/`:

```bash
# Desde la raíz de core-market
cp apiVaultTypes.ts    src/app/admin/services/
cp apiVaultService.ts  src/app/admin/services/
cp useApiVault.ts      src/app/admin/hooks/
cp AdminApiVault.tsx   src/app/admin/pages/
```

No requiere instalar dependencias nuevas: usa `@supabase/supabase-js` y `zustand`,
ya presentes en `package.json`.

---

## Paso 3 — Agregar la ruta en App.tsx

Busca el bloque de rutas admin en `src/app/App.tsx` y agrega:

```tsx
import AdminApiVault from './admin/pages/AdminApiVault'

// Dentro de tu <Routes> o <Route path="/admin" ...>
<Route path="api-vault" element={<AdminApiVault />} />
```

---

## Paso 4 — Agregar al menú admin

En `src/app/admin/components/AdminLayout.tsx` (o donde esté tu sidebar),
agrega una entrada:

```tsx
import { KeyRound } from 'lucide-react'   // lucide-react ya está en el proyecto

// Dentro de tu lista de navegación:
{
  label: 'API Vault',
  path: '/admin/api-vault',
  icon: <KeyRound size={18} />,
}
```

---

## Variables de entorno

El módulo reutiliza las variables ya existentes en `.env.local`:

```env
VITE_SUPABASE_URL=...       # ya está
VITE_SUPABASE_ANON_KEY=...  # ya está
```

No se requiere ninguna variable adicional.

---

## Uso del hook en otros módulos

Si otro módulo de core-market necesita leer una API key guardada:

```tsx
import { useApiVault } from '@/app/admin/hooks/useApiVault'

function MiComponente() {
  const { entries, load } = useApiVault()

  useEffect(() => { load() }, [])

  const stripeKey = entries.find(
    (e) => e.platform === 'Stripe' && e.env === 'production'
  )

  // stripeKey.value → el token
}
```

---

## Seguridad

- **RLS activo**: Supabase solo devuelve registros del usuario autenticado.
- **Los valores se almacenan en texto plano en Supabase** (con RLS). Si necesitas
  cifrado adicional, considera usar `pgcrypto` en la migración o cifrar en cliente
  antes de guardar (AES con Web Crypto API).
- Los valores se enmascaran en la UI por defecto y solo se revelan on demand.
- El portapapeles se limpia automáticamente a los 2 segundos del copiado visual.
