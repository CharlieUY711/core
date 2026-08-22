# FASE 0 — Auditoría: Publicaciones Multicanal

> Entregable de Fase 0 según el prompt "World Class — Publicaciones Multicanal".
> Ningún archivo de código fue modificado en este pase.
> Versión navegable: https://claude.ai/code/artifact/aacc1b0f-c8f8-4e6a-9daf-bd39ae9f9bad

## Hallazgo central

Charlie Market tiene **dos sistemas de catálogo paralelos que no se comunican**.

- **Mitad A — la UI**: `/admin/publicaciones` (`AdminPublicaciones.tsx`, 886 líneas) sobre la
  tabla `articulos`. Los "canales" son 4 booleanos: `sync_ml`, `sync_meta`, `sync_wa`,
  `sync_web`. No disparan ninguna publicación; sólo pintan chips.
- **Mitad B — el motor**: `/admin/ml` + las Edge Functions sobre un esquema `catalog_*` que
  **ya implementa el modelo master/channel completo**.

Verificación: ningún archivo de `src/` ni `supabase/` referencia `articulos` y `catalog_*` a la
vez. `articulos` no tiene `variant_id` ni ninguna FK al catálogo.

**Consecuencia para el plan:** el trabajo no es construir el modelo master/channel. Es converger
la UI sobre el que ya existe.

## El modelo que ya existe

`catalog_listings` tiene `UNIQUE (variant_id, channel)` y las columnas `status`, `external_id`,
`channel_attrs` (JSON), `last_error`, `synced_at`. Además hay `catalog_prices` con el RPC
`resolve_price(variant, channel, currency)`, y `catalog_sync_log` con
`action / result / http_status / payload / response / error`.

Eso cubre, ya implementado, los §5, §6, §7, §8, §17, §18, §19 y §24 del prompt.

**Las tablas del prompt no existen.** No hay `ml_listings` ni `ml_category_mapping`. Los nombres
reales son `catalog_listings` y `ml_webhook_events`.

## Canales: qué existe de verdad

| Canal | Integración | Estado |
|---|---|---|
| Market | storefront propio sobre `articulos` | operativo |
| Mercado Libre | OAuth, publish, sync, webhook, cola, vault | operativo |
| Second Hand | `articulos.tipo = 'secondhand'` | **es una columna, no un canal** |
| Web / Meta / WhatsApp | booleano sin destino | no existe |
| Instagram / Gourmet | ninguna referencia en el repo | no existe |

## Componentes

| Componente | Ruta | Líneas | Situación |
|---|---|---|---|
| `AdminPublicaciones.tsx` | `/admin/publicaciones` | 886 | vivo — la pantalla objetivo |
| `AdminML.tsx` | `/admin/ml` | 865 | vivo — único consumidor de `catalog_*` |
| `AdminArticulos.tsx` | `/admin/catalog/articulos` | 514 | vivo |
| `AdminMisPublicaciones.tsx` | — | 749 | **sin rutear**, invoca `ml-sync` |
| `AdminProducts.tsx` | — | 226 | sin rutear |

`AdminMisPublicaciones.tsx` parece un intento previo de tender este mismo puente. Leerlo antes de
escribir código: puede haber trabajo aprovechable, o conviene descartarlo explícitamente.

## Seguridad (§21)

CORRECTO y a preservar: cero `SERVICE_ROLE` en el frontend; `publicar-en-ml` usa la ANON key y
reenvía el `Authorization` del llamador, así que RLS aplica y `auth.getUser()` valida.

RIESGO: 10 edge functions usan `SERVICE_ROLE` (saltean RLS), no auditadas línea por línea. Y el
rol admin sale de `user_metadata`, escribible por el usuario (DEC-006) — **esta feature no debe
apoyarse en ese flag para autorizar nada**.

## No verificable desde el repo

El esquema no está versionado (`docs/legado/schema-dump.sql` pesa 80 bytes; la migración
`20260617_catalog_prices.sql` se cita en un comentario pero no está en el repo). Queda sin
confirmar: columnas exactas de `catalog_items/variants/prices`, si `catalog_listings.channel` es
`text` libre o enum, RLS del esquema `catalog_*`, índices, triggers, la definición de
`v_catalog_variants_full`, y **si `catalog_*` tiene filas reales**.

Esa última pregunta decide todo: con datos en producción es una migración cuidadosa; vacío es una
adopción limpia.

## Arquitectura de migración propuesta

Adoptar `catalog_*` como modelo maestro y tratar `articulos` como lo que ya es: la proyección del
canal Market. El puente mínimo es una columna `articulos.variant_id`. Con eso la pantalla lee
estado/precio/errores por canal desde `catalog_listings` sin que Market deje de funcionar, porque
el storefront sigue leyendo `articulos` igual que hoy. Los 4 booleanos `sync_*` se mantienen toda
la transición y se borran al final, nunca al principio.

## Fases revisadas

- **F0** auditoría — entregada.
- **F1** confirmar esquema `catalog_*` en la base viva, versionarlo en migraciones, y resolver
  `AdminMisPublicaciones.tsx`. Sin cambios de comportamiento.
- **F2** el puente: `articulos.variant_id` + backfill; canales en modo sólo lectura.
- **F3** canales reales en la UI, con `Not Connected` honesto para los cinco sin integración.
- **F4** overrides y precio por canal (`channel_attrs`, `resolve_price`) con origen MASTER/OVERRIDE/RULE.
- **F5** sincronización selectiva — único punto que requiere estructura nueva.
- **F6** reglas por canal y carga masiva.

## Riesgos

1. Esquema sin versionar: cualquier migración se escribe a ciegas.
2. Second Hand no es un canal sino `articulos.tipo` — convertirlo toca storefront y filtros; es
   el mayor riesgo de romper algo que hoy funciona.
3. **El stack no es el asumido por el prompt**: no hay Next.js, App Router, Server Actions ni API
   routes. Es una SPA Vite; toda lógica server-side va en Edge Functions Deno.
4. `agent:verify` sólo corre build; quedan 279 errores de tipos (DEC-003).
5. No existe framework de testing: los 10 tests del §31 no tienen dónde correr.

---

# ACTUALIZACIÓN — esquema confirmado contra la base

## Corrección a esta auditoría
Arriba se daba Mercado Libre como canal **operativo**. Es incorrecto. Las once tablas
`catalog_*` tienen **cero filas**, así que `publicar-en-ml` nunca publicó nada: su primer paso lee
la variante de `v_catalog_variants_full` y devuelve `404 Variant not found`. Igual `ml-sync`.

Estado real de ML: **código completo y bien construido, jamás ejecutado.** Refuerza la conclusión
— el sistema multicanal no hay que diseñarlo ni migrarlo, hay que **encenderlo**.

## Esquema real (11 tablas)
`catalog_items` (tenant_id, taxonomy_node_id, brand_id, sku_prefix, title, description, status,
tags, meta) · `catalog_variants` (item_id, sku, barcode, attributes, weight_g, status) ·
`catalog_listings` (variant_id, channel, external_id, status, channel_attrs, last_error,
synced_at) · `catalog_prices` (item_id, variant_id, channel, price_list, country, currency,
campaign, valid_from, valid_until, amount, priority) · `catalog_inventory` (variant_id,
location_id, quantity, reserved, available) · `catalog_locations` · `catalog_media` ·
`catalog_taxonomy` (path, depth) · `catalog_nodes` · `catalog_events` (type, payload, emitted_at) ·
`catalog_sync_log` (listing_id, action, result, http_status, payload, response, error_code).

Es **más capaz** que lo que pide el prompt: listas de precio, países, campañas, vigencia y
prioridad; stock por depósito con reservas; taxonomía por tenant; log de eventos.

## Consecuencias para el plan
- `catalog_listings.channel` es **`text` libre, no enum** → agregar un canal es un INSERT, no una
  migración. Resuelve el §23 sin trabajo extra.
- Tablas vacías → **cero riesgo de migración**. La dirección del backfill se invierte: los datos
  reales están en `articulos`, así que cada artículo genera su `catalog_item` + `catalog_variant`.
- **`catalog_items.tenant_id` es obligatorio** y la UI de publicaciones no tiene concepto de
  tenant. Decidir qué tenant reciben los productos ANTES de escribir una fila.
- **Las reglas del §7 no son expresables**: `catalog_prices.amount` guarda importes, no fórmulas.
  `MASTER + 8%` requiere calcular al escribir o modelar aparte.
- Bug a corregir cuando ML se encienda: `publicar-en-ml` usa `currency = ctx.currency ?? "ARS"`
  (pesos argentinos) en un marketplace uruguayo.

## AdminMisPublicaciones.tsx — RESUELTO
No es el puente: toca sólo `articulos` (10 refs, cero a `catalog_*`). Es una iteración hermana de
la misma pantalla; su botón `ml-sync` tampoco podía funcionar. **Valor a cosechar:** su
`SyncDropdown` ya implementa el patrón del §11 (ML habilitado, Meta y WA deshabilitados). Se
cosecha en F3 y recién ahí se borra el archivo — no se descarta la referencia antes de copiar lo útil.

## Falta confirmar (bloquea F1)
Valores de los enums `catalog_items.status`, `catalog_listings.status`, `catalog_sync_log.action`
y `.result`, la definición de `v_catalog_variants_full`, y las políticas RLS del esquema.

---

# ACTUALIZACIÓN 2 — causa raíz y multitienda

## Causa raíz: el claim `store_id` nunca se conectó
`v_catalog_variants_full` termina en `WHERE i.tenant_id = ((auth.jwt() ->> 'store_id')::uuid)` —
un claim en la **raíz** del JWT. Pero `publicar-en-ml` y `ml-sync` leen
`user.user_metadata?.store_id`, que vive **anidado**. Supabase no promueve `user_metadata` a la
raíz sin un custom access token hook, y en el repo no hay ninguno. Con el claim en NULL, la vista
**devuelve cero filas para todos, siempre**, aunque las tablas tuvieran datos.

Salvedad: un hook configurado en el proyecto Supabase sería invisible desde el repo. Verificar.

## Multitienda (decisión de producto confirmada)
Charlie Market es multitienda; cada tienda puede tener su propia pasarela. Eso vuelve legible el
diseño: `catalog_*` fue construido para multitienda desde el principio, por eso filtra por
`store_id`.

Existe: `tenants (id,name,slug)`, `tenant_members (user_id,tenant_id,role)`, `api_vault
(tenant_id,app_id)` con RLS, `catalog_items.tenant_id`, enum `app_role
(buyer|seller|admin|superadmin)`.

Falta: el claim `store_id` en el JWT, `articulos.tenant_id`, y el selector de tienda activa en la
UI (un usuario puede estar en N tiendas).

**Pasarelas por tienda: NO implementadas.** `create_preference` usa `MP_ACCESS_TOKEN` global y
`create-paypal-order` usa `PAYPAL_CLIENT_ID` global — todas las ventas de todas las tiendas cobran
en una única cuenta de la plataforma. El patrón correcto ya existe: `api_vault` por tenant, como
las credenciales de ML. Es un proyecto propio, no parte de esta feature.

**Backfill F2:** `articulos.vendedor_id` es un *usuario*, no una tienda, y un usuario puede estar
en varias. Hace falta una regla explícita `vendedor_id → tenant_id` antes de escribir una fila en
`catalog_items`.

## Enums confirmados (no crear nuevos — §26)
- `catalog_listing_status`: pending | syncing | active | paused | error | delisted
- `catalog_item_status`: draft | active | archived | discontinued
- `catalog_variant_status`: active | inactive | discontinued
- `catalog_sync_action`: create | update | pause | delete | **refresh_price | refresh_stock**
  (→ el vocabulario del §9 ya existe; falta la UI y el código)
- `catalog_sync_result`: success | error | skipped
- `catalog_media_type`: image | video | model_3d | document
- `item_condition`: new | like_new | good | fair | poor → **5 valores contra los 6 en español de
  la UI**; el backfill necesita mapeo y pierde un nivel.

## Precio maestro — encontrado
`catalog_variants` tiene `price`, `compare_price`, `cost_price`. El §6 ya tiene dónde vivir:
maestro en la variante, overrides por canal en `catalog_prices`. **Hueco:** `resolve_price` no cae
al maestro — sin fila en `catalog_prices`, `publicar-en-ml` aborta con `422 No price found`. Ese
fallback es tarea de F4.

## Estado de migraciones (bloquea F1)
`supabase db pull` falla: "remote migration history does not match local files". El CLI sólo ve
`supabase/migrations/20260607_api_vault.sql`; hay **3 migraciones más en `migrations/` en la raíz
del repo, invisibles para el CLI**, y todos los nombres usan timestamps de 8 dígitos en vez de los
14 (YYYYMMDDHHMMSS) que espera la convención. Diagnosticar con `supabase migration list` antes de
reparar nada.

## Bugs fuera de alcance detectados en este pase
1. `create_preference` manda a MercadoPago `notification_url = .../functions/v1/mp-webhook`
   (guion) pero el directorio es `mp_webhook` (guion bajo) → los IPN de MP probablemente nunca
   llegan. Verificar con `supabase functions list`.
2. `mp_webhook` escribe `ordenes.estado="pagado"`; `paypal-webhook` escribe
   `ordenes.payment_status="paid"`; `AdminOrders` lee sólo `payment_status` → las ventas de
   MercadoPago nunca figuran como pagadas ni suman a la facturación.
3. `publicar-en-ml` usa `currency ?? "ARS"` en un marketplace uruguayo.

---

# FASE 1.5 — CANONICAL CONTRACT FREEZE (2026-08-22)

Fase documental. Cero código, cero migraciones, cero cambios en Supabase.

## Source of Truth
`catalog_*` es el modelo master/channel **existente y canónico** de core-market:
`catalog_items` · `catalog_variants` · `catalog_listings` · `catalog_prices` ·
`catalog_inventory` · `catalog_media` · `catalog_taxonomy` · `catalog_events` ·
`catalog_sync_log` · `catalog_locations` · `catalog_nodes`, más `resolve_price()`,
`v_catalog_variants_full` y `v_catalog_listings_priced`.

NO crear: otro master de producto, otra tabla de listings, otro motor de precios,
otro sistema de stock, otro sistema de sincronización, otra arquitectura multicanal.

## Legacy / Compatibility
`articulos` queda como superficie legada. Consumidores que todavía la leen:
`carritoApi.ts`, `AdminExport`, `AdminImport` y la pantalla sin rutear
`AdminMisPublicaciones`. No se elimina. Las 13 tablas `zz_deprecated_*` siguen
renombradas, con datos intactos y sin DROP.

## Correcciones al plan (el código real manda)
Tres supuestos del plan de F2 ya no se sostienen, verificados contra el repo:

1. **"Migrar los 4 artículos existentes" — sin objeto.** Esos 4 se borraron en el
   vaciado autorizado. Hoy hay **2 productos**, ambos nacidos ya en `catalog_*`.
   No hay backfill que diseñar ni script que escribir.

2. **Tenancy NO está pendiente: está implementada.** Migraciones
   `20260822000000/000050/000100`, aplicadas. Existen `store_members`,
   `stores.owner_id`, la tienda `charlie-market`
   (`78db7daa-b92a-45d3-88ef-1e715d6d549b`) y `custom_access_token_hook`, que está
   **habilitado y verificado**: devuelve el claim `store_id`. Ya se insertó en
   `catalog_*` con RLS activo. La instrucción "no implementar el hook todavía"
   llegó después del hecho.
   Matiz: **no existe tabla `tenants`** — el registro de tiendas se llama `stores`.
   Y no existe selector de tienda activa en la UI (un usuario en N tiendas no puede
   elegir).

3. **Second Hand ya no es sólo `articulos.tipo`.** El código migrado lo modela como
   `catalog_listings.channel = 'secondhand'`. La decisión de producto confirmada es
   que es **excluyente con Market** (un artículo es nuevo o usado), así que se
   comporta como tipo aunque esté almacenado como canal. Esa tensión queda abierta.

## Blockers de F2
- **F-1 · Autorización admin.** `is_admin()` es SECURITY DEFINER y decide por
  `raw_user_meta_data ->> 'role'`, escribible por el propio usuario desde el
  navegador. Gobierna la policy `catalog_nodes_admin_write`. Existen el enum
  `app_role` y `profiles.role`, sin uso. NO corregido en esta fase.
- **F-2 · Esquema `catalog_*` sin versionar.** Las 11 tablas existen sólo en la base;
  su DDL no está en el repo. Antes de modificarlas: obtener DDL exacto, versionarlo,
  y verificar constraints, enums, RLS, vistas y funciones. `supabase db pull` exige
  Docker, ausente en esta máquina. NO ejecutado.

## Contrato
El contrato de módulo es **C1–C9** del CVE. core-market queda **fuera del ámbito de
evaluación** por no ser un módulo Charlie (excepción E-1) — no "incumple". Detalle en
`CLAUDE.md` del repo Charlie. No se creó ningún contrato nuevo.

## Cierre
STATUS: CONTRACT FROZEN · CODE CHANGES: 0 · MIGRATIONS: 0 · SUPABASE CHANGES: 0 ·
NEW CONTRACTS: 0 · F2: BLOCKED hasta resolver F-1 y F-2.
