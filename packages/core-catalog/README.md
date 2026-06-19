# CORE Market — Migración a catalog_* (sesión 20260617)

## Qué se hizo en esta sesión

### Problema resuelto
`ml-sync` y `publicar-en-ml` apuntaban a tablas viejas
(`productos_market`, `product_prices`, `ml_listings`, `ml_sync_queue`).
Esta sesión los reescribió completamente sobre `catalog_items` +
`catalog_variants` + `catalog_listings` + el nuevo `catalog_prices`.

---

## Archivos generados

```
migrations/
  20260617_catalog_prices.sql          ← tabla + función resolve_price()
  20260617_catalog_listings_cleanup.sql ← elimina price_override (obsoleto)

functions/
  publicar-en-ml/index.ts              ← publica/actualiza variante en ML
  ml-sync/index.ts                     ← sincronización batch ML → catalog_*
```

---

## Modelo de precios — decisiones

### Por qué NO alcanzaba `catalog_listings.price_override`
Un campo único no soporta:
- n precios por variante con dimensiones propias
- Herencia ítem → variante
- Precios de campaña con vigencia temporal
- Listas de precio por canal/cliente

### `catalog_prices` — dimensiones

| Columna      | Tipo       | Obligatorio | Semántica                              |
|--------------|------------|-------------|----------------------------------------|
| variant_id   | UUID       | uno de dos  | Precio específico de variante          |
| item_id      | UUID       | uno de dos  | Precio heredado a todas sus variantes  |
| currency     | CHAR(3)    | ✓           | ISO 4217: ARS, UYU, USD               |
| channel      | TEXT       | nullable    | NULL = aplica a todos los canales      |
| price_list   | TEXT       | nullable    | 'retail', 'wholesale', etc.            |
| country      | CHAR(2)    | nullable    | ISO 3166-1 alpha-2                     |
| campaign     | TEXT       | nullable    | slug de campaña                        |
| valid_from   | TIMESTAMPTZ| nullable    | inicio de vigencia                     |
| valid_until  | TIMESTAMPTZ| nullable    | fin de vigencia                        |
| amount       | NUMERIC    | ✓           | precio FINAL al consumidor             |
| priority     | SMALLINT   | ✓ (def 10)  | mayor número gana en caso de conflicto |

**Convención de priority sugerida:**
```
10  precio base global
20  + por canal
30  + por lista
40  + por país/moneda
50  + por campaña
```
Combinar sumando: campaña+canal = 70, campaña+canal+país = 80, etc.

### `resolve_price()` — función SQL

```sql
SELECT (resolve_price(
  '<variant-uuid>',   -- p_variant_id
  'ARS',              -- p_currency (obligatorio)
  p_channel  => 'mercadolibre',
  p_country  => 'AR',
  p_campaign => 'black-friday-2026'
)).amount;
```

Herencia: busca primero a nivel variante, luego a nivel ítem padre.
Gana la fila con mayor `priority`. Devuelve NULL si no hay precio.
Llamable desde Edge Functions vía `supabase.rpc('resolve_price', {...})`.

**Dirección de cálculo:** el `amount` es precio final al consumidor.
Los márgenes/reportes descuentan impuestos y comisiones hacia adentro.

---

## `publicar-en-ml` — lógica

**Body:**
```json
{
  "variantId": "uuid",
  "priceContext": {
    "currency": "ARS",
    "channel": "mercadolibre",
    "country": "AR",
    "priceList": "retail",
    "campaign": null
  }
}
```

**Flujo:**
1. Valida JWT, extrae storeId del claim
2. Lee variante desde `v_catalog_variants_full`
3. Lee listing existente desde `catalog_listings` (si existe → PUT, si no → POST)
4. Llama `resolve_price()` para obtener precio vigente
5. Lee imágenes desde `catalog_media` (hasta 12, tipo 'image')
6. Suma stock de `catalog_inventory` (todas las locations)
7. Marca listing como `syncing`
8. POST o PUT a ML API
9. Actualiza listing → `active` o `error`
10. Inserta fila en `catalog_sync_log`

**Fuente de verdad:** el sistema local. ML se actualiza para reflejar
el catálogo, no al revés.

**`channel_attrs` de ML** (en `catalog_listings.channel_attrs`):
```json
{
  "category_id":    "MLA1234",
  "listing_type_id": "gold_special",
  "condition":       "new",
  "buying_mode":     "buy_it_now",
  "shipping_mode":   "me2",
  "free_shipping":   false,
  "local_pick_up":   false,
  "extra_attributes": [
    { "id": "ALPHANUMERIC_MODEL", "value_name": "XYZ-100" }
  ]
}
```
Todo lo específico de ML vive en JSONB sin tocar el schema de catalog_*.

---

## `ml-sync` — lógica

**Body:**
```json
{
  "statuses":    ["pending", "error"],
  "limit":       50,
  "priceContext": { "currency": "ARS", "country": "AR" }
}
```

**Flujo por listing:**
1. `resolve_price()` → precio local vigente
2. Suma stock local desde `catalog_inventory`
3. GET `/items/{external_id}` en ML
4. Compara precio y stock
5. Si no hay diferencia → `skipped`, marca listing `active`
6. Si hay diferencia → PUT `/items/{id}` con valores locales
7. Actualiza `catalog_listings.status` + `synced_at`
8. Inserta `catalog_sync_log`

**Concurrencia:** 5 listings en paralelo por batch para no saturar ML API.
**Techo:** máximo 200 listings por invocación (ajustar con `limit`).

---

## Orden de ejecución de migraciones

```
1. 20260617_core_catalog_v2.sql          (ya existía)
2. 20260617_catalog_prices.sql           (nuevo)
3. 20260617_catalog_listings_cleanup.sql (nuevo — elimina price_override)
```

⚠️ La migración 3 es irreversible sin backup. Verificar que ninguna
función ni query apunte a `price_override` antes de ejecutarla.

---

## Pendiente para próxima sesión

- [ ] Diseño del adapter genérico `ChannelSyncAdapter` para soportar
      Meta/IG y otros canales sin duplicar lógica de ml-sync
- [ ] `PROVIDER_REGISTRY` en core-mlmp para generalizar OAuthService
      más allá de MercadoLibre/MercadoPago
- [ ] Migrar `ml-webhook` y `mp_webhook` a catalog_*
- [ ] Poblar catalog_prices con datos reales (hoy las tablas están vacías)
- [ ] Borrar `apps/core-market/supabase/functions/ml_webhook/` (boilerplate vacío)
