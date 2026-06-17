# AddressGeo Widget

Módulo independiente de validación de dirección y geoposicionamiento extraído de `core-market`. Integrable en cualquier app React.

## Instalación

```bash
npm install mapbox-gl
npm install --save-dev @types/mapbox-gl
```

Copiá `AddressGeo.tsx` a tu proyecto. Necesitás un **token de Mapbox** (gratis): https://account.mapbox.com/

---

## Exportaciones

| Export                | Tipo         | Descripción                                      |
|-----------------------|--------------|--------------------------------------------------|
| `AddressGeoWidget`    | Component (default) | Widget completo: lista + formulario + mapa |
| `AddressAutocomplete` | Component    | Solo el input con autocompletado de calles       |
| `AddressMap`          | Component    | Solo el mapa interactivo con pin arrastrable     |
| `AddressCard`         | Component    | Tarjeta de visualización de dirección guardada   |
| `useGeolocation`      | Hook         | Obtiene coords del usuario con fallback          |
| `reverseGeocode`      | Function     | Convierte coords → dirección + esquinas          |
| `forwardGeocode`      | Function     | Convierte texto → lista de resultados            |

---

## Uso del widget completo

```tsx
import AddressGeoWidget from "./AddressGeo";

function CheckoutPage() {
  const [addresses, setAddresses] = useState([]);

  return (
    <AddressGeoWidget
      mapboxToken="pk.eyJ1..."
      addresses={addresses}
      onAddressesChange={setAddresses}
    />
  );
}
```

---

## Uso de componentes individuales

### Solo autocompletado

```tsx
import { AddressAutocomplete } from "./AddressGeo";

<AddressAutocomplete
  value={street}
  onChange={setStreet}
  onSelect={({ address, lat, lng, city, corner }) => {
    console.log("Dirección seleccionada:", address);
    console.log("Coordenadas:", lat, lng);
    console.log("Ciudad:", city);
    console.log("Esquina:", corner);  // "entre Colonia y Rivera"
  }}
  mapboxToken="pk.eyJ1..."
  placeholder="Buscá tu dirección..."
/>
```

### Solo mapa

```tsx
import { AddressMap } from "./AddressGeo";

<AddressMap
  lat={-34.9011}
  lng={-56.1645}
  interactive
  mapboxToken="pk.eyJ1..."
  onLocationChange={({ address, lat, lng }) => {
    console.log("Nuevo punto:", lat, lng);
  }}
/>
```

### Hook de geolocalización

```tsx
import { useGeolocation } from "./AddressGeo";

function MyComponent() {
  const { coords, loading, error } = useGeolocation([-56.1645, -34.9011]);
  // coords es [lng, lat] o null mientras carga
}
```

### Geocoding directo

```tsx
import { reverseGeocode, forwardGeocode } from "./AddressGeo";

// Coords → dirección
const result = await reverseGeocode(-56.1645, -34.9011, TOKEN);
// result: { address, lat, lng, city, corner }

// Texto → resultados
const results = await forwardGeocode("Convención 1267", TOKEN);
// results: [{ address, lat, lng }, ...]
```

---

## Props del widget completo

| Prop                 | Tipo                               | Default           | Descripción                              |
|----------------------|------------------------------------|-------------------|------------------------------------------|
| `mapboxToken`        | `string`                           | requerido         | Token de acceso Mapbox                   |
| `addresses`          | `Address[]?`                       | `[]`              | Lista de direcciones (modo controlado)   |
| `onAddressesChange`  | `(addresses: Address[]) => void?`  | —                 | Callback al cambiar la lista             |
| `accentColor`        | `string?`                          | `"#FF7A00"`       | Color primario                           |
| `fallbackCoords`     | `[lng, lat]?`                      | Montevideo        | Coords de fallback si no hay geoloc.     |

---

## Integración con UserProfile

Pasalo como slot `AddressWidget`:

```tsx
import UserProfile from "../user-profile-widget/UserProfile";
import AddressGeoWidget from "./AddressGeo";

<UserProfile
  userId="user-123"
  AddressWidget={({ addresses, onChange, accentColor }) => (
    <AddressGeoWidget
      mapboxToken="pk.eyJ1..."
      addresses={addresses}
      onAddressesChange={onChange}
      accentColor={accentColor}
    />
  )}
/>
```

---

## Variables de entorno (Vite)

```bash
# .env.local
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

Usalas en el widget:
```tsx
<AddressGeoWidget mapboxToken={import.meta.env.VITE_MAPBOX_TOKEN} ... />
```

---

## Qué detecta automáticamente

Al escribir o seleccionar una dirección, el widget detecta:
- **Coordenadas exactas** (lat/lng)
- **Ciudad** (del contexto de la feature)
- **Calles cercanas** (radio 60m via Tilequery API de Mapbox) → genera "entre Colonia y Rivera"
- Si el usuario arrastra el pin, hace **reverse geocoding** automático

Al abrir el formulario sin coordenadas, solicita permiso de geolocalización y centra el mapa en la ubicación actual del usuario.
