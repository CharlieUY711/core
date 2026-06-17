# CORE-PM-PRODUCT-INTAKE-0001
## Sistema de Alta de Productos — Product Intake

**ID:** CORE-PM-PRODUCT-INTAKE-0001  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno  
**Autor:** CORE Engineering

---

## Contexto auditado

### Stack
- Vite + React + Supabase + PostgreSQL
- Tabla master: `articulos`
- Integraciones existentes: `ml_listings`, `ml_sync_queue`, `ml_webhook_events`, `ml_category_mapping`

### Admin modules existentes (NO tocar lógica)
| Módulo | Archivo | Estado |
|--------|---------|--------|
| Carga individual | AdminArticulos.tsx | ✅ Funciona, escribe en articulos |
| Carga masiva | AdminImport.tsx | ✅ Funciona, URL/PDF/CSV |
| ML sync | AdminML.tsx | ✅ Funciona |
| Catálogo | AdminCatalog.tsx | ✅ Funciona |

### Pendientes
- Colores hardcodeados (#FF7A00, #0F3460) → migrar a tokens CORE
- Meta Catalog adapter → nuevo
- Webhook receiver → Edge Function nueva
- Template CSV descargable → nuevo

---

## Prompt para Sonnet

Actúa como Principal Product Engineer de la plataforma CORE y diseñá/implementá el sistema de alta de productos (PRODUCT INTAKE) para CORE Market.

### 1. Contexto

Plataforma: CORE Market — marketplace B2B/B2C para Latinoamérica  
Stack: Vite + React + Supabase + PostgreSQL  
Tabla master: `articulos`

**Campos clave de articulos (NO romper):**
nombre, descripcion, precio, precio_original, moneda, imagen_principal, imagenes (jsonb), videos (jsonb), departamento_id, categoria_id, subcategoria_id, condicion, stock, sku, peso_kg, alto_cm, ancho_cm, largo_cm, tipo (market/secondhand), status (active/paused/deleted), vendedor_id

**Tipos de vendedor:** tienda, marca, persona

**Integraciones existentes (NO romper):**
ml_listings, ml_sync_queue, ml_webhook_events, ml_category_mapping

**Restricción:** articulos es la tabla master. Todo additive only.

### 2. Modos de carga

1. Manual — formulario admin, un producto a la vez
2. Masiva — CSV/Excel con template
3. Scraper — extrae de web del cliente (corre en CORE)
4. Sync — MercadoLibre (existe) + Meta Catalog (nuevo)
5. Webhook — cliente pushea desde su web o ERP

### 3. Entregables

**Esquema de datos:**
- `/Biblioteca/Market/docs/product-intake-data-model.md`
- `/Biblioteca/Market/sql/product-intake-migrations.sql`

**Componentes React:**
- `/apps/core-market/src/admin/products/ProductCreatePage.tsx`
- `/apps/core-market/src/admin/products/components/ProductForm.tsx`
- `/apps/core-market/src/admin/products/components/ProductMediaUploader.tsx`
- `/apps/core-market/src/admin/products/components/ProductDimensionsFields.tsx`

**Edge Functions:**
- `/supabase/functions/product-intake-bulk/index.ts`
- `/supabase/functions/product-intake-webhook/index.ts`
- `/supabase/functions/product-intake-meta-sync/index.ts`

**Documentación:**
- `/Biblioteca/Market/docs/product-intake-overview.md`
- `/Biblioteca/Market/docs/product-intake-bulk.md`
- `/Biblioteca/Market/docs/product-intake-webhook.md`
- `/Biblioteca/Market/docs/product-intake-meta-catalog.md`
- `/Biblioteca/Market/docs/product-intake-playbook.md`

### 4. Formato de entrega

Cada archivo en formato:
```
=== filepath: /ruta/del/archivo ===
<contenido>
```
Sin narrativa adicional.

### 5. Restricciones
- NO romper tablas existentes
- NO cambiar contratos ML existentes
- Additive only
- articulos = único master
- Escalable para 100K+ productos y múltiples canales
- Código modular, legible, listo para producción

---

*CORE-PM-PRODUCT-INTAKE-0001 v1.0 · Junio 2026 · Confidencial*
