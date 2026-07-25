# Auditoría de Archivos de Logística

## 1. LogisticaView.tsx
**Archivo:** `Constructor/src/app/components/admin/views/LogisticaView.tsx`  
**Líneas:** 92  
**Fuente de datos:** Ninguna (componente de navegación, sin datos)  
**.from('tabla'):** Ninguno  
**fetch():** Ninguno  

---

## 2. EnviosView.tsx
**Archivo:** `Constructor/src/app/components/admin/views/EnviosView.tsx`  
**Líneas:** 552  
**Fuente de datos:** Supabase (vía `enviosApi`)  
**.from('tabla'):** Ninguno (usa servicio `enviosApi`)  
**fetch():** Ninguno (usa `enviosApi.getEnvios()` y `enviosApi.getEnvio()` que internamente hacen fetch)

---

## 3. RutasView.tsx
**Archivo:** `Constructor/src/app/components/admin/views/RutasView.tsx`  
**Líneas:** 285  
**Fuente de datos:** Supabase (vía `rutasApi`)  
**.from('tabla'):** Ninguno (usa servicio `rutasApi`)  
**fetch():** Ninguno (usa `getRutas()`, `createRuta()`, `updateRuta()`, `deleteRuta()` que internamente hacen fetch)

---

## 4. TransportistasView.tsx
**Archivo:** `Constructor/src/app/components/admin/views/TransportistasView.tsx`  
**Líneas:** 306  
**Fuente de datos:** Datos mock (arrays `TRANSPORTISTAS` y `TRAMOS` hardcodeados)  
**.from('tabla'):** Ninguno  
**fetch():** Ninguno  

---

## 5. FulfillmentView.tsx
**Archivo:** `Constructor/src/app/components/admin/views/FulfillmentView.tsx`  
**Líneas:** 389  
**Fuente de datos:** Datos mock (arrays `WAVES` y `ORDENES` hardcodeados)  
**.from('tabla'):** Ninguno  
**fetch():** Ninguno  

---

## 6. ProduccionView.tsx
**Archivo:** `Constructor/src/app/components/admin/views/ProduccionView.tsx`  
**Líneas:** 360  
**Fuente de datos:** Datos mock (arrays `ARTICULOS` y `ORDENES_ARMADO` hardcodeados)  
**.from('tabla'):** Ninguno  
**fetch():** Ninguno  

---

## 7. AbastecimientoView.tsx
**Archivo:** `Constructor/src/app/components/admin/views/AbastecimientoView.tsx`  
**Líneas:** 310  
**Fuente de datos:** Datos mock (arrays `ALERTAS`, `SUGERENCIAS_OC` y `MRP_COMPONENTES` hardcodeados)  
**.from('tabla'):** Ninguno  
**fetch():** Ninguno  

---

## 8. MapaEnviosView.tsx
**Archivo:** `Constructor/src/app/components/admin/views/MapaEnviosView.tsx`  
**Líneas:** 296  
**Fuente de datos:** Datos mock (array `PUNTOS` hardcodeado)  
**.from('tabla'):** Ninguno  
**fetch():** Ninguno  

---

## 9. TrackingPublicoView.tsx
**Archivo:** `Constructor/src/app/components/admin/views/TrackingPublicoView.tsx`  
**Líneas:** 375  
**Fuente de datos:** Datos mock (objeto `TRACKING_DB` hardcodeado)  
**.from('tabla'):** Ninguno  
**fetch():** Ninguno  

---

## 10. envios.tsx (Supabase Function)
**Archivo:** `Constructor/supabase/functions/api/envios.tsx`  
**Líneas:** 307  
**Fuente de datos:** Supabase  
**.from('tabla'):**
- Línea 50: `.from("envios")`
- Línea 74: `.from("envios_eventos")`
- Línea 105: `.from("envios")`
- Línea 113: `.from("envios_eventos")`
- Línea 134: `.from("envios")`
- Línea 157: `.from("envios")`
- Línea 163: `.from("envios")`
- Línea 174: `.from("envios_eventos")`
- Línea 199: `.from("envios")`
- Línea 205: `.from("envios_eventos")`
- Línea 216: `.from("envios")`
- Línea 239: `.from("envios_eventos")`
- Línea 257: `.from("envios")`
- Línea 277: `.from("envios")`
- Línea 292: `.from("envios_eventos")`

**fetch():** Ninguno (es una función de Supabase Edge Function)

---

## 11. rutas.tsx (Supabase Function)
**Archivo:** `Constructor/supabase/functions/api/rutas.tsx`  
**Líneas:** 145  
**Fuente de datos:** Supabase  
**.from('tabla'):**
- Línea 31: `.from("rutas")`
- Línea 59: `.from("rutas")`
- Línea 94: `.from("rutas")`
- Línea 114: `.from("rutas")`
- Línea 133: `.from("rutas")`

**fetch():** Ninguno (es una función de Supabase Edge Function)

---

## 12. transportistas.tsx (Supabase Function)
**Archivo:** `supabase/functions/api/transportistas.tsx`  
**Estado:** ❌ no existe

---

## 13. enviosApi.ts
**Archivo:** `Constructor/src/app/services/enviosApi.ts`  
**Líneas:** 245  
**Fuente de datos:** Supabase Edge Function API  
**.from('tabla'):** Ninguno (es un servicio frontend)  
**fetch():**
- Línea 101: `fetch(url, { headers: HEADERS })` donde `url = https://${projectId}.supabase.co/functions/v1/api/envios${path}`
- Línea 127: `fetch(\`${BASE}${path}\`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })` donde `BASE = https://${projectId}.supabase.co/functions/v1/api/envios`
- Línea 145: `fetch(\`${BASE}${path}\`, { method: 'PUT', headers: HEADERS, body: JSON.stringify(body) })` donde `BASE = https://${projectId}.supabase.co/functions/v1/api/envios`

**URLs completas:**
- `https://${projectId}.supabase.co/functions/v1/api/envios` (GET, con query params opcionales)
- `https://${projectId}.supabase.co/functions/v1/api/envios/${id}` (GET por ID)
- `https://${projectId}.supabase.co/functions/v1/api/envios/pedido/${pedidoId}` (GET por pedido)
- `https://${projectId}.supabase.co/functions/v1/api/envios` (POST)
- `https://${projectId}.supabase.co/functions/v1/api/envios/${id}` (PUT)
- `https://${projectId}.supabase.co/functions/v1/api/envios/${id}/evento` (POST)
- `https://${projectId}.supabase.co/functions/v1/api/envios/${id}/acuse` (POST)

---

## 14. rutasApi.ts
**Archivo:** `Constructor/src/app/services/rutasApi.ts`  
**Líneas:** 147  
**Fuente de datos:** Supabase Edge Function API  
**.from('tabla'):** Ninguno (es un servicio frontend)  
**fetch():**
- Línea 46: `fetch(\`${BASE}${path}\`, { headers: HEADERS })` donde `BASE = https://${projectId}.supabase.co/functions/v1/api/rutas`
- Línea 60: `fetch(\`${BASE}${path}\`, { method: 'POST', headers: HEADERS, body: body ? JSON.stringify(body) : undefined })` donde `BASE = https://${projectId}.supabase.co/functions/v1/api/rutas`
- Línea 78: `fetch(\`${BASE}${path}\`, { method: 'PUT', headers: HEADERS, body: body ? JSON.stringify(body) : undefined })` donde `BASE = https://${projectId}.supabase.co/functions/v1/api/rutas`
- Línea 96: `fetch(\`${BASE}${path}\`, { method: 'DELETE', headers: HEADERS })` donde `BASE = https://${projectId}.supabase.co/functions/v1/api/rutas`

**URLs completas:**
- `https://${projectId}.supabase.co/functions/v1/api/rutas` (GET, con query params opcionales: `?activo=true&carrier=...`)
- `https://${projectId}.supabase.co/functions/v1/api/rutas/${id}` (GET por ID)
- `https://${projectId}.supabase.co/functions/v1/api/rutas` (POST)
- `https://${projectId}.supabase.co/functions/v1/api/rutas/${id}` (PUT)
- `https://${projectId}.supabase.co/functions/v1/api/rutas/${id}` (DELETE)

---

## 15. transportistasApi.ts
**Archivo:** `src/app/services/transportistasApi.ts`  
**Estado:** ❌ no existe

---

## Resumen

### Archivos con datos de Supabase:
- ✅ `envios.tsx` (Supabase Function) - 15 `.from()` a tablas `envios` y `envios_eventos`
- ✅ `rutas.tsx` (Supabase Function) - 5 `.from()` a tabla `rutas`
- ✅ `enviosApi.ts` - 3 `fetch()` a Edge Function API
- ✅ `rutasApi.ts` - 4 `fetch()` a Edge Function API

### Archivos con datos mock/hardcodeados:
- ⚠️ `TransportistasView.tsx` - Datos mock
- ⚠️ `FulfillmentView.tsx` - Datos mock
- ⚠️ `ProduccionView.tsx` - Datos mock
- ⚠️ `AbastecimientoView.tsx` - Datos mock
- ⚠️ `MapaEnviosView.tsx` - Datos mock
- ⚠️ `TrackingPublicoView.tsx` - Datos mock

### Archivos sin datos:
- `LogisticaView.tsx` - Solo navegación
- `EnviosView.tsx` - Usa `enviosApi` (indirecto)
- `RutasView.tsx` - Usa `rutasApi` (indirecto)

### Archivos no encontrados:
- ❌ `supabase/functions/api/transportistas.tsx`
- ❌ `src/app/services/transportistasApi.ts`
