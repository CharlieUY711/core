# UserProfile Widget

Widget independiente de perfil de usuario extraído de `core-market`. Integrable en cualquier app React.

## Instalación

```bash
# Dependencia opcional (solo si usás Supabase)
npm install @supabase/supabase-js
```

Copiá `UserProfile.tsx` a tu proyecto. No tiene más dependencias externas.

---

## Uso básico

### Con Supabase

```tsx
import { createClient } from "@supabase/supabase-js";
import UserProfile from "./UserProfile";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
  return (
    <UserProfile
      supabase={supabase}
      userId={currentUser.id}
    />
  );
}
```

### Sin Supabase (backend propio)

```tsx
import UserProfile from "./UserProfile";

function App() {
  return (
    <UserProfile
      userId="user-123"
      userEmail="juan@example.com"
      userRole="admin"
      initialData={{ nombre: "Juan Pérez" }}
      onSave={async (data) => {
        await fetch("/api/profile", {
          method: "PUT",
          body: JSON.stringify(data),
        });
      }}
    />
  );
}
```

### Sin ningún backend (solo localStorage)

```tsx
<UserProfile userId="user-123" userEmail="juan@example.com" />
```

---

## Con el módulo de direcciones y mapa (AddressGeo)

```tsx
import UserProfile from "./UserProfile";
import AddressGeoWidget from "../address-geo-widget/AddressGeo";

function App() {
  return (
    <UserProfile
      userId="user-123"
      userEmail="juan@example.com"
      AddressWidget={({ addresses, onChange, accentColor }) => (
        <AddressGeoWidget
          mapboxToken={import.meta.env.VITE_MAPBOX_TOKEN}
          addresses={addresses}
          onAddressesChange={onChange}
          accentColor={accentColor}
        />
      )}
    />
  );
}
```

---

## Props

| Prop              | Tipo                                | Default       | Descripción                                      |
|-------------------|-------------------------------------|---------------|--------------------------------------------------|
| `userId`          | `string`                            | requerido     | ID único del usuario                             |
| `userEmail`       | `string?`                           | —             | Email a mostrar (si no usás Supabase)            |
| `userRole`        | `string?`                           | —             | Rol del usuario (`"admin"` muestra 👑)           |
| `supabase`        | `SupabaseClient?`                   | —             | Cliente de Supabase (opcional)                   |
| `initialData`     | `Partial<ProfileData>?`             | —             | Datos iniciales del perfil                       |
| `onSave`          | `(data: ProfileData) => Promise<void>?` | —         | Callback al guardar (reemplaza la lógica default)|
| `onAvatarChange`  | `(base64: string) => void?`         | —             | Callback al cambiar el avatar                    |
| `accentColor`     | `string?`                           | `"#FF7A00"`   | Color primario del widget                        |
| `storageKey`      | `string?`                           | `"userprofile"` | Prefijo de clave en localStorage               |
| `AddressWidget`   | `Component?`                        | Built-in básico | Componente externo para el tab de direcciones  |

---

## Tipos exportados

```ts
export interface ProfileData {
  nombre:            string;
  documento:         string;
  addresses:         Address[];
  contacts:          Contact[];
  prefContactMethod: string;   // "whatsapp" | "phone" | "email"
  prefSchedule:      string;   // "mañana" | "tarde" | "noche" | "cualquier"
  notes:             string;
}

export interface Address {
  id:            string;
  label:         string;      // "Casa" | "Trabajo" | custom
  street:        string;
  doorNumber?:   string;
  corner?:       string;
  apartment?:    string;
  indicaciones?: string;
  city:          string;
  zip:           string;
  lat?:          number;
  lng?:          number;
  isDefault:     boolean;
}

export interface Contact {
  id:        string;
  type:      "phone" | "whatsapp" | "instagram" | "telegram";
  value:     string;
  preferred: boolean;
}
```

---

## Personalización del color

```tsx
<UserProfile accentColor="#6366F1" ... />  // Indigo
<UserProfile accentColor="#10B981" ... />  // Emerald
<UserProfile accentColor="#EF4444" ... />  // Red
```

---

## Persistencia

Por defecto el widget guarda en `localStorage` con las claves:
- `{storageKey}_{userId}` → datos del perfil
- `{storageKey}_avatar_{userId}` → avatar en base64

Para usar tu propio storage, pasá `onSave` y precargá los datos en `initialData`.
