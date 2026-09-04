# CORE Multi-Country Readiness Report

**Versión:** 1.0 · Junio 2026 · Confidencial — Uso interno

---

## 1. Análisis de tablas operativas

### `articulos` — Master de producto

| Campo a agregar | Tipo | Justificación |
|----------------|------|---------------|
| `country_code` | `char(2)` | Producto publicado en qué país |
| `entity_id` | `uuid FK entities` | Empresa propietaria del producto |
| `territory_id` | `uuid FK territories` | Territorio fiscal donde opera |
| `currency` | `char(3)` | Ya existe — verificar consistencia |

**SQL (cuando corresponda — NO aplicar aún):**
```sql
ALTER TABLE articulos
  ADD COLUMN IF NOT EXISTS country_code char(2) REFERENCES countries(iso_code),
  ADD COLUMN IF NOT EXISTS entity_id    uuid    REFERENCES entities(id),
  ADD COLUMN IF NOT EXISTS territory_id uuid    REFERENCES territories(id);
```

---

### `warehouses` — Depósitos

| Campo a agregar | Tipo | Justificación |
|----------------|------|---------------|
| `country_code` | `char(2)` | País donde está el depósito |
| `territory_id` | `uuid FK territories` | Zona franca, depósito fiscal, etc. |
| `entity_id` | `uuid FK entities` | Empresa operadora |

**SQL (cuando corresponda):**
```sql
ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS country_code  char(2) REFERENCES countries(iso_code),
  ADD COLUMN IF NOT EXISTS territory_id  uuid    REFERENCES territories(id),
  ADD COLUMN IF NOT EXISTS entity_id     uuid    REFERENCES entities(id);
```

---

### `orders` — Órdenes

| Campo a agregar | Tipo | Justificación |
|----------------|------|---------------|
| `country_code` | `char(2)` | País de la orden |
| `entity_id` | `uuid FK entities` | Empresa vendedora |
| `currency` | `char(3)` | Moneda de la transacción |
| `territory_id` | `uuid FK territories` | Territorio fiscal para impuestos |

**SQL (cuando corresponda):**
```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS country_code  char(2) REFERENCES countries(iso_code),
  ADD COLUMN IF NOT EXISTS entity_id     uuid    REFERENCES entities(id),
  ADD COLUMN IF NOT EXISTS territory_id  uuid    REFERENCES territories(id);
```

---

### `payments` — Pagos

| Campo a agregar | Tipo | Justificación |
|----------------|------|---------------|
| `country_code` | `char(2)` | País del pago |
| `currency` | `char(3)` | Moneda del pago |
| `entity_id` | `uuid FK entities` | Empresa receptora |

**SQL (cuando corresponda):**
```sql
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS country_code char(2) REFERENCES countries(iso_code),
  ADD COLUMN IF NOT EXISTS entity_id    uuid    REFERENCES entities(id);
```

---

### `inventory_items` / `inventory_locations`

| Campo a agregar | Tipo | Justificación |
|----------------|------|---------------|
| `country_code` | `char(2)` | País del inventario |
| `territory_id` | `uuid FK territories` | Zona franca o depósito fiscal |

---

## 2. Estrategia de implementación

### Regla general
Todos los campos nuevos se agregan como **nullable** inicialmente. La migración de datos existentes se hace en una segunda fase controlada.

### Orden recomendado
1. `warehouses` — base física del inventario
2. `articulos` — master de producto
3. `orders` — transacciones
4. `payments` — financiero
5. `inventory_*` — derivado de warehouses

### Particionamiento futuro
Para escala 2035 (500M eventos/año), particionar por `country_code`:
- `orders` → particionar por `country_code + year`
- `inventory_movements` → particionar por `country_code`
- `trade_events` → particionar por `created_at`

---

## 3. Prioridad por vertical

| Vertical | Tablas críticas | Urgencia |
|----------|----------------|----------|
| CORE Market | `articulos`, `orders`, `payments` | Alta — Q3 2026 |
| CORE Logistics | `warehouses`, `inventory_*` | Alta — Q3 2026 |
| CORE Rep | `brands`, `distributors`, `channels` | Media — Q4 2026 |
| CORE Finance | `payments`, `orders` | Media — 2027 |
| CORE Intelligence | Todas | Baja — 2028 |

---

*CORE Multi-Country Readiness Report v1.0 · Junio 2026*
