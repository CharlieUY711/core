# CORE Market — Product Intake Overview

**Versión:** 1.0 · Junio 2026 · Confidencial — Uso interno

---

## 1. Visión general

El sistema de Product Intake define cómo los productos ingresan a CORE Market desde cualquier origen y convergen en `articulos` como tabla master.

```
Orígenes
├── Manual (admin UI)
├── CSV / Excel
├── Scraper (web del cliente)
├── MercadoLibre sync
├── Meta Catalog sync
└── Webhook (ERP / web cliente)
         │
         ▼
   [ Validación + Normalización ]
         │
         ▼
      articulos  ←── master de producto
         │
         ├── productos_market   (read model storefront)
         └── productos_secondhand (read model SH)
```

---

## 2. Módulos existentes auditados

| Módulo | Archivo | Escribe en |
|--------|---------|-----------|
| Carga individual | AdminArticulos.tsx | articulos ✅ |
| Carga masiva URL/PDF/CSV | AdminImport.tsx | articulos ✅ |
| ML sync | AdminML.tsx | ml_listings + articulos ✅ |
| Catálogo | AdminCatalog.tsx | articulos ✅ |

---

## 3. Modos de carga

### 3.1 Manual
- Formulario wizard de 6 pasos en AdminArticulos.tsx
- Un producto a la vez
- Soporta tipo = market / secondhand
- Estado inicial: draft

### 3.2 Masiva (CSV/Excel)
- AdminImport.tsx — ya funciona
- Extrae desde URL, PDF o CSV
- Revisión antes de insertar
- Pendiente: template CSV descargable

### 3.3 Scraper
- AdminImport.tsx (modo URL)
- Extrae datos de la web del cliente
- Corre en CORE (Edge Function)
- Revisión antes de insertar

### 3.4 MercadoLibre
- AdminML.tsx — ya funciona
- ml_sync_queue como buffer
- ml_listings como tabla de sync
- source = ml en articulos

### 3.5 Meta Catalog
- Pendiente — nuevo módulo
- Edge Function: product-intake-meta-sync
- Mapeo campos Meta → articulos
- source = meta_catalog

### 3.6 Webhook
- Pendiente — nuevo módulo
- Edge Function: product-intake-webhook
- Cliente pushea JSON
- Idempotencia por sku + vendedor_id
- source = webhook

---

## 4. Campo source

Agregar columna `source` a `articulos`:

```sql
ALTER TABLE articulos 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
CHECK (source IN ('manual','bulk_csv','scraper','ml','meta_catalog','webhook'));
```

---

## 5. Roadmap

| Fase | Entregable | Estado |
|------|-----------|--------|
| 1 | Auditoría módulos existentes | ✅ Junio 2026 |
| 2 | Campo source en articulos | 🔜 |
| 3 | Template CSV descargable | 🔜 |
| 4 | Meta Catalog Edge Function | 🔜 |
| 5 | Webhook Edge Function | 🔜 |
| 6 | Migrar colores admin a tokens CORE | 🔜 |

---

*CORE Market — Product Intake Overview v1.0 · Junio 2026*
