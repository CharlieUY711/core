# Integración del Generador de Publicaciones RRSS

## Archivos nuevos (agregar al proyecto)

```
src/app/admin/meta-social/types/social-post.types.ts
src/app/admin/meta-social/services/socialPostService.ts
src/app/admin/meta-social/hooks/useSocialPostGenerator.ts
src/app/admin/meta-social/components/SocialPostGenerator.tsx
```

---

## Cambio en `MetaSocialPanel.tsx`

Agregar una pestaña "Generar publicación" al panel existente.

```diff
// Al inicio del archivo, agregar el import:
+ import { SocialPostGenerator } from './SocialPostGenerator'

// Dentro del componente, agregar la tab al estado y al render:
// (buscar el tipo de tab activa existente — podría ser 'instagram' | 'facebook' | 'whatsapp')

// En el estado de tab activa, agregar la nueva opción:
- type ActiveTab = 'instagram' | 'facebook' | 'whatsapp'
+ type ActiveTab = 'instagram' | 'facebook' | 'whatsapp' | 'generator'

// En el selector de tabs, agregar el botón:
+ <TabButton tab="generator" icon="✨" label="Generar publicación" />

// En el cuerpo del panel, agregar el caso:
+ {activeTab === 'generator' && <SocialPostGenerator />}
```

Si `MetaSocialPanel.tsx` no usa un sistema de tabs sino otro patrón de navegación,
adaptar según corresponda — el componente `SocialPostGenerator` es autónomo y
puede montarse donde se quiera.

---

## Import de `useMetaVault` dentro del generador

`SocialPostGenerator` importa `useMetaVault` con la ruta relativa:
```
import { useMetaVault } from '../hooks/useMetaVault'
```

Verificar que esa ruta sea correcta según la ubicación final del archivo.
El hook `useMetaVault` a su vez importa `useApiVault` desde:
```
import { useApiVault } from '../hooks/useApiVault'
```

Si `useApiVault` todavía no existe en ese path (es un hook del admin general),
ajustar la ruta o mover el import. Ver `useMetaVault.ts` para el detalle exacto.

---

## Próximo paso: integración con catálogo real

El componente `ProductSelector` dentro de `SocialPostGenerator` es un placeholder
que permite ingresar datos manualmente. Para conectarlo al catálogo real:

1. Crear `hooks/useCatalogSearch.ts` que llame a Supabase:
   ```ts
   supabase
     .from('v_catalog_variants_full')
     .select('variant_id, item_id, store_id, title, description, price, currency, images, attributes, stock, sku')
     .eq('store_id', storeId)
     .ilike('title', `%${query}%`)
     .limit(10)
   ```

2. Reemplazar `<ProductSelector>` por `<CatalogSearch onSelect={gen.setProduct} storeId={storeId} />`

3. Mapear el resultado al tipo `CatalogProduct` (ya definido en `social-post.types.ts`).

---

## Notas sobre WhatsApp

La publicación en WhatsApp usa `whatsappService.sendTemplate()`, que requiere
un template aprobado por Meta en la cuenta WABA. Si la cuenta no tiene templates,
el resultado será un error claro en la UI.

En v1, WhatsApp funciona como "copia manual": el operador puede editar el texto
en el editor y copiarlo (botón "Copiar" en el preview) para enviarlo manualmente.
La publicación automática vía template es opcional y depende de que el template
`product_announcement` exista y esté aprobado.

Si se quiere un template diferente, se puede parametrizar el nombre en
`socialPostService.publishToWhatsApp()`.
