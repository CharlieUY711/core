# Cambios mínimos a archivos existentes

## 1. `src/app/admin/components/AdminLayout.tsx`

Agregar en la constante `adminSections`, dentro del objeto con `key: "integraciones"`:

```diff
  items: [
    { path: "/admin/ml",          label: "ML & MercadoPago" },
    { path: "/admin/api-vault",   label: "API Vault"        },
+   { path: "/admin/meta-social", label: "Meta Social"      },
  ],
```

---

## 2. `src/app/app/routes.tsx`

Agregar import y ruta:

```diff
+ import AdminMetaSocial from "./admin/pages/AdminMetaSocial";

  children: [
    // ... rutas existentes ...
    { id: "admin-api-vault",    path: "api-vault",    Component: AdminApiVault    },
+   { id: "admin-meta-social",  path: "meta-social",  Component: AdminMetaSocial  },
  ]
```

---

## 3. `src/app/admin/services/apiVaultTypes.ts` (opcional si ya no están)

Agregar en `VAULT_PLATFORM_DEFS` las plataformas que falten:

```diff
+ { name: 'Instagram', category: 'Social', icon: '📸' },
+ { name: 'Facebook',  category: 'Social', icon: '📘' },
+ { name: 'WhatsApp',  category: 'Social', icon: '💬' },
+ { name: 'Meta',      category: 'Social', icon: '🔵' },
```

> Nota: WhatsApp ya existe en el Vault. Solo agregar Instagram, Facebook y Meta si no están.

---

Eso es todo. El resto es código nuevo en `src/app/admin/meta-social/`.
