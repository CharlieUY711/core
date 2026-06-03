# CORE Product Domain Assessment

**Versión:** 1.0 · Junio 2026 · Confidencial — Uso interno

---

## 1. Product Ownership Analysis

| Tabla | Idioma | Propósito | Autor estimado | Estado |
|-------|--------|-----------|----------------|--------|
| `products` | EN | Modelo genérico con `seller_id`, ML sync, `search_vector` | API / integración externa | Activo |
| `articulos` | ES | Modelo rico con scoring, analytics, boost, variantes | Admin interno | Activo — más completo |
| `articulo_variantes` | ES | Variantes de `articulos` (SKU, atributos, stock) | Admin interno | Activo |
| `productos_market` | ES | Vista desnormalizada para el storefront Market | Storefront | Activo |
| `productos_secondhand` | ES | Productos Second Hand del storefront | Storefront SH | Activo |

---

## 2. Data Duplication Analysis

### Campos duplicados entre `articulos` y `products`

| Campo semántico | `articulos` | `products` |
|----------------|------------|-----------|
| Nombre | `nombre` | `name` / `title` |
| Precio | `precio` | `price` |
| Precio original | `precio_original` | `compare_at_price` |
| Stock | `stock` | `stock` |
| SKU | `sku` | `sku` |
| Imágenes | `imagenes` (jsonb) | `images` (array) |
| ML item ID | — | `ml_item_id` |
| ML status | — | `ml_status` |
| Vendedor | `vendedor_id` | `seller_id` / `owner_id` |
| Búsqueda | — | `search_vector` (tsvector) |
| Scoring | `ranking_score`, `precio_score`, etc. | — |
| Dimensiones | `alto_cm`, `ancho_cm`, `largo_cm` | `weight_kg` |
| Analytics | `impresiones`, `clicks`, `ventas_count` | `views` |

### Campos duplicados entre `articulos` y `productos_market`

`productos_market` es una **proyección desnormalizada** de `articulos` para el storefront. Contiene los mismos campos de nombre, precio, imagen, departamento, vendedor, ML sync.

### Campos duplicados entre `articulos` y `productos_secondhand`

`productos_secondhand` es equivalente a `articulos` con `tipo = 'secondhand'` + campo `condicion`.

---

## 3. Product Master Recommendation

**Master recomendado: `articulos`**

Razones:
- Es el modelo más completo del sistema
- Tiene scoring, analytics, boost, variantes, dimensiones, garantía
- Tiene soft delete (`deleted_at`)
- Tiene `tipo` para discriminar Market vs Second Hand
- Tiene `condicion` para Second Hand
- Tiene `articulo_variantes` como modelo de variantes

**Rol de cada tabla en la arquitectura objetivo:**

| Tabla | Rol futuro |
|-------|-----------|
| `articulos` | **Master de producto** — fuente de verdad |
| `articulo_variantes` | **Variantes** — mantener como está |
| `productos_market` | **Read model / cache** del storefront Market — sincronizar desde `articulos` |
| `productos_secondhand` | **Read model / cache** del storefront SH — sincronizar desde `articulos` donde `tipo = 'secondhand'` |
| `products` | **Tabla legada** — mantener para compatibilidad con integraciones ML existentes |

---

## 4. Migration Strategy

### Principio: No destructive. Additive only.

**Fase A — Enriquecer `articulos` (sin breaking changes)**
- Agregar `entity_id` FK a `entities` (nullable inicialmente)
- Agregar `country_code` (nullable inicialmente)
- Agregar `brand_id` FK a `brands` (nullable inicialmente)

**Fase B — Sincronización**
- Crear trigger/función que sincroniza `articulos` → `productos_market`
- Crear trigger/función que sincroniza `articulos` → `productos_secondhand`

**Fase C — Deprecación gradual**
- Marcar `products` como legacy en documentación
- Migrar integraciones ML a usar `articulos` como master

---

## 5. Compatibility Strategy

- `productos_market` y `productos_secondhand` siguen existiendo — el storefront no cambia
- `products` sigue existiendo — las integraciones ML no se tocan
- Nuevas columnas se agregan como nullable para no romper inserts existentes
- RLS policies existentes se mantienen intactas

---

*CORE Product Domain Assessment v1.0 · Junio 2026*
