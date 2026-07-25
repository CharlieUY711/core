# Estado de Migración: Archivos que usan fetch() con Edge Functions

Este documento lista todos los archivos en `src/` que aún usan `fetch()` apuntando a Edge Functions (`/functions/v1/api`).

## Resumen

- **Total de archivos encontrados:** 35
- **Servicios API:** 22
- **Componentes/Vistas:** 13

---

## Tabla de Archivos

| # | Archivo | Endpoints | Tipo de Migración |
|---|--------|-----------|-------------------|
| 1 | `Constructor/src/app/services/roadmapApi.ts` | `/roadmap/tasks/*`, `/roadmap/historial/*`, `/roadmap/audit/*`, `/roadmap/modules/reset` | Requiere lógica de servidor (auditoría, historial, tasks) |
| 2 | `Constructor/src/app/services/vehiculosApi.ts` | `/vehiculos` (CRUD completo) | CRUD simple - migrable a `supabase.from('vehiculos')` |
| 3 | `Constructor/src/app/services/trackingApi.ts` | `/tracking/{numero}`, `/tracking/{envioId}/evento`, `/tracking/envio/{envioId}/historial` | Requiere lógica de servidor (tracking público, eventos) |
| 4 | `Constructor/src/app/services/productosSecondhandApi.ts` | `/productos/secondhand` (CRUD completo) | CRUD simple - migrable a `supabase.from('productos_secondhand')` |
| 5 | `Constructor/src/app/services/subcategoriasApi.ts` | `/subcategorias` (CRUD completo) | CRUD simple - migrable a `supabase.from('subcategorias')` |
| 6 | `Constructor/src/app/services/rrssApi.ts` | `/rrss/status`, `/rrss/creds/*`, `/rrss/verify/*`, `/rrss/posts`, `/rrss/metricas` | Requiere lógica de servidor (verificación Meta API, métricas) |
| 7 | `Constructor/src/app/services/produccionApi.ts` | `/produccion/articulos/*`, `/produccion/ordenes/*` | CRUD simple - migrable a `supabase.from('articulos_compuestos')` y `supabase.from('ordenes_armado')` |
| 8 | `Constructor/src/app/services/rolesApi.ts` | `/roles` (CRUD completo) | CRUD simple - migrable a `supabase.from('roles')` |
| 9 | `Constructor/src/app/services/personasApi.ts` | `/personas` (CRUD completo) | CRUD simple - migrable a `supabase.from('personas')` |
| 10 | `Constructor/src/app/services/organizacionesApi.ts` | `/organizaciones` (CRUD completo) | CRUD simple - migrable a `supabase.from('organizaciones')` |
| 11 | `Constructor/src/app/services/pedidosApi.ts` | `/pedidos` (CRUD completo) | CRUD simple - migrable a `supabase.from('pedidos')` |
| 12 | `Constructor/src/app/services/metodosEnvioApi.ts` | `/metodos-envio` (CRUD completo) | CRUD simple - migrable a `supabase.from('metodos_envio')` |
| 13 | `Constructor/src/app/services/marketingApi.ts` | `/marketing/campanas`, `/marketing/suscriptores`, `/marketing/fidelizacion/*`, `/marketing/sorteos` | Requiere lógica de servidor (campañas, fidelización, sorteos) |
| 14 | `Constructor/src/app/services/mapaEnviosApi.ts` | `/mapa-envios` (CRUD completo) | CRUD simple - migrable a `supabase.from('puntos_mapa')` |
| 15 | `Constructor/src/app/services/integracionesApi.ts` | `/integraciones`, `/integraciones/{id}/ping`, `/integraciones/{id}/logs`, `/integraciones/api-keys/*`, `/integraciones/webhooks/*` | Requiere lógica de servidor (ping, logs, gestión de API keys y webhooks) |
| 16 | `Constructor/src/app/services/metodosPagoApi.ts` | `/metodos-pago` (CRUD completo) | CRUD simple - migrable a `supabase.from('metodos_pago')` |
| 17 | `Constructor/src/app/services/disputasApi.ts` | `/disputas` (CRUD completo) | CRUD simple - migrable a `supabase.from('disputas')` |
| 18 | `Constructor/src/app/services/fulfillmentApi.ts` | `/fulfillment/ordenes/*`, `/fulfillment/waves/*` | CRUD simple - migrable a `supabase.from('ordenes_fulfillment')` y `supabase.from('waves')` |
| 19 | `Constructor/src/app/services/departamentosApi.ts` | `/departamentos` (CRUD completo) | CRUD simple - migrable a `supabase.from('departamentos')` |
| 20 | `Constructor/src/app/services/categoriasApi.ts` | `/categorias` (CRUD completo) | CRUD simple - migrable a `supabase.from('categorias')` |
| 21 | `Constructor/src/app/services/abastecimientoApi.ts` | `/abastecimiento/alertas/*`, `/abastecimiento/ordenes-compra/*`, `/abastecimiento/mrp/*` | Requiere lógica de servidor (cálculos MRP, alertas automáticas) |
| 22 | `Constructor/src/app/services/etiquetasApi.ts` | `/etiquetas` (CRUD completo) | CRUD simple - migrable a `supabase.from('etiquetas')` |
| 23 | `Constructor/src/app/components/admin/views/ERPInventarioView.tsx` | `/productos/market` (GET, POST, PUT, DELETE) | CRUD simple - migrable a `supabase.from('productos_market')` |
| 24 | `Constructor/src/app/components/admin/views/IdeasBoardView.tsx` | `/ideas/canvases`, `/ideas/ideas` | Requiere lógica de servidor (gestión de canvases e ideas relacionadas) |
| 25 | `Constructor/src/app/components/admin/IdeaQuickModal.tsx` | `/ideas/ideas` (GET, POST) | Requiere lógica de servidor (ideas relacionadas) |
| 26 | `Constructor/src/app/components/admin/ModuleFilesPanel.tsx` | `/roadmap/files/{moduleId}`, `/roadmap/files/upload`, `/roadmap/files/{moduleId}/{fileId}` | Requiere lógica de servidor (upload de archivos, gestión de storage) |
| 27 | `Constructor/src/app/components/admin/views/CargaMasivaView.tsx` | `/carga-masiva/upload`, `/carga-masiva/files` | Requiere lógica de servidor (upload masivo, gestión de archivos) |
| 28 | `Constructor/src/app/components/admin/views/MetaMapView.tsx` | `/age-verification/metamap-webhook` | Requiere lógica de servidor (webhook externo) |
| 29 | `Constructor/src/app/components/admin/views/AuthRegistroView.tsx` | `/auth/signup` | Requiere lógica de servidor (registro con validaciones) |
| 30 | `Constructor/src/app/components/admin/views/PagosView.tsx` | `/api` (endpoints de pagos) | Requiere lógica de servidor (transacciones, procesamiento de pagos) |
| 31 | `Constructor/src/app/public/MensajePage.tsx` | `/api` (endpoints de mensajes) | Requiere lógica de servidor (mensajes públicos) |
| 32 | `ODDY_Front2/src/app/services/productosApi.ts` | `/productos/market/*`, `/productos/secondhand/*` | CRUD simple - migrable a `supabase.from('productos_market')` y `supabase.from('productos_secondhand')` |
| 33 | `ODDY_Front2/src/app/services/ordenesApi.ts` | `/ordenes` (GET, POST con sesion_id) | Requiere lógica de servidor (gestión de sesiones, carrito) |
| 34 | `ODDY_Front2/src/app/services/departamentosApi.ts` | `/departamentos` (CRUD completo) | CRUD simple - migrable a `supabase.from('departamentos')` |
| 35 | `ODDY_Front2/src/app/services/carritoApi.ts` | `/carrito` (GET, POST, PUT, DELETE con sesion_id) | Requiere lógica de servidor (gestión de sesiones, carrito) |
| 36 | `ODDY_Front2/src/app/public/MensajePage.tsx` | `/etiquetas/token/{token}`, `/etiquetas/token/{token}/scan`, `/etiquetas/token/{token}/responder` | Requiere lógica de servidor (escaneo, respuestas públicas) |

---

## Clasificación por Tipo

### ✅ CRUD Simple (Migrable a `supabase.from()`)

Estos archivos pueden migrarse directamente a Supabase client sin Edge Functions:

1. `vehiculosApi.ts` → `supabase.from('vehiculos')`
2. `productosSecondhandApi.ts` → `supabase.from('productos_secondhand')`
3. `subcategoriasApi.ts` → `supabase.from('subcategorias')`
4. `produccionApi.ts` → `supabase.from('articulos_compuestos')`, `supabase.from('ordenes_armado')`
5. `rolesApi.ts` → `supabase.from('roles')`
6. `personasApi.ts` → `supabase.from('personas')`
7. `organizacionesApi.ts` → `supabase.from('organizaciones')`
8. `pedidosApi.ts` → `supabase.from('pedidos')`
9. `metodosEnvioApi.ts` → `supabase.from('metodos_envio')`
10. `mapaEnviosApi.ts` → `supabase.from('puntos_mapa')`
11. `metodosPagoApi.ts` → `supabase.from('metodos_pago')`
12. `disputasApi.ts` → `supabase.from('disputas')`
13. `fulfillmentApi.ts` → `supabase.from('ordenes_fulfillment')`, `supabase.from('waves')`
14. `departamentosApi.ts` → `supabase.from('departamentos')`
15. `categoriasApi.ts` → `supabase.from('categorias')`
16. `etiquetasApi.ts` → `supabase.from('etiquetas')`
17. `ERPInventarioView.tsx` → `supabase.from('productos_market')`
18. `productosApi.ts` (ODDY_Front2) → `supabase.from('productos_market')`, `supabase.from('productos_secondhand')`
19. `departamentosApi.ts` (ODDY_Front2) → `supabase.from('departamentos')`

**Total: 19 archivos migrables a CRUD simple**

### ⚠️ Requiere Lógica de Servidor (Mantener Edge Functions)

Estos archivos necesitan Edge Functions por tener lógica de negocio compleja:

1. `roadmapApi.ts` - Auditoría, historial, tasks
2. `trackingApi.ts` - Tracking público, eventos de envío
3. `rrssApi.ts` - Verificación Meta API, métricas
4. `marketingApi.ts` - Campañas, fidelización, sorteos
5. `integracionesApi.ts` - Ping, logs, API keys, webhooks
6. `abastecimientoApi.ts` - Cálculos MRP, alertas automáticas
7. `IdeasBoardView.tsx` - Gestión de canvases e ideas relacionadas
8. `IdeaQuickModal.tsx` - Ideas relacionadas
9. `ModuleFilesPanel.tsx` - Upload de archivos, storage
10. `CargaMasivaView.tsx` - Upload masivo
11. `MetaMapView.tsx` - Webhook externo
12. `AuthRegistroView.tsx` - Registro con validaciones
13. `PagosView.tsx` - Transacciones de pago
14. `MensajePage.tsx` (Constructor) - Mensajes públicos
15. `ordenesApi.ts` (ODDY_Front2) - Gestión de sesiones
16. `carritoApi.ts` (ODDY_Front2) - Gestión de sesiones y carrito
17. `MensajePage.tsx` (ODDY_Front2) - Escaneo y respuestas públicas

**Total: 17 archivos requieren Edge Functions**

---

## Notas

- Los archivos que usan `apiUrl` desde `client.ts` apuntan automáticamente a `/functions/v1/api`
- Algunos archivos tienen URLs hardcodeadas con `functions/v1/api`
- La mayoría de los servicios de CRUD simple pueden migrarse directamente a Supabase client
- Los servicios que requieren lógica de servidor deben mantenerse como Edge Functions

---

## Próximos Pasos

1. **Prioridad Alta:** Migrar los 19 archivos de CRUD simple a `supabase.from()`
2. **Prioridad Media:** Revisar si algunos servicios "complejos" pueden simplificarse
3. **Prioridad Baja:** Documentar la lógica de los Edge Functions que se mantienen
