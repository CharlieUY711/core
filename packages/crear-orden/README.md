# Fix: crear-orden guarda persona/empresa + datos de contacto (v3 — corregido contra la función real)

## Qué hay acá
```
migrations/20260703_ordenes_persona_empresa.sql   ← ALTER TABLE ordenes (columnas nuevas, ya corregido: ADD CONSTRAINT sin IF NOT EXISTS -> DO block)
migrations/20260704_crear_orden_segura_v3.sql     ← CREATE OR REPLACE FUNCTION crear_orden_segura (reescrita sobre la función REAL, no sobre una inferencia)
functions/crear-orden/index.ts                    ← Edge Function (sin cambios respecto a la v2 anterior, sigue siendo compatible)
```

## Por qué existe una v3
Se corrió `pg_get_functiondef('crear_orden_segura'::regproc)` contra la base real y
apareció una función bastante más completa de lo que se había inferido para la v2
anterior. La v2 tenía **regresiones reales**, no simplificaciones:

- Eliminaba la rama `productos_secondhand` (la real sí la tiene).
- Ignoraba `product_prices.price_oddy` (pricing multicanal) — usaba siempre `precio` plano.
- Usaba estados inventados (`'active'` como único válido) en vez de los reales
  (`'paused'` / `'sold'` para market, con auto-`sold` al llegar a stock 0).
- Asumía una columna `stock_ilimitado` que **no existe** en la función real — hubiera
  fallado al ejecutarse la migración.
- Cambiaba el modelo de ítems de `order_items` (tabla normalizada, la real) a un
  JSONB embebido en `ordenes.items`.

v3 restaura 1:1 la lógica real (ambas ramas de producto, pricing con `product_prices`,
estados correctos) y agrega los campos nuevos (contacto + persona/empresa) sin tirar
nada de lo que ya funcionaba. Además, escribe un resumen en `ordenes.items` (JSONB)
como efecto secundario **deseado**: `OrdenPage.tsx` ya lee esa columna y hoy nada la
llena (la función real solo escribe en `order_items`) — así que probablemente el
comprador ve la lista de ítems vacía en su confirmación de orden hoy mismo, un bug
preexistente que esto corrige de paso, sin sacar `order_items`.

## ⚠️ Cosa que NO toqué, a propósito, y que sigue abierta
La función real **nunca usa `moneda`/`total_usd`** — solo escribe `total_uyu`,
sin importar la moneda del producto. `create_preference` sí lee
`orden.moneda === "USD" ? total_usd : total_uyu` para armar el pago. Si hoy
`productos_market` tiene productos en USD, es posible que ya se estén cobrando mal
(como si fueran UYU). No lo "arreglé" en este cambio porque es un tema aparte
(conversión real, quizás con `bcuApi.ts`) y no quiero mezclar un fix de facturación
con este cambio de contacto/persona-empresa. Queda anotado para revisar aparte.

## Orden para aplicar esto
1. **Backup de `ordenes` primero**:
   ```sql
   CREATE TABLE ordenes_backup_20260704 AS SELECT * FROM ordenes;
   ```
2. Correr `migrations/20260703_ordenes_persona_empresa.sql`.
3. Correr `migrations/20260704_crear_orden_segura_v3.sql`.
4. Deployar el Edge Function:
   ```
   supabase functions deploy crear-orden
   ```
5. Probar: un checkout de un producto `market` y uno `secondhand`, persona y empresa,
   y confirmar en `ordenes` que se completan los campos nuevos y que `items` (JSONB)
   ya no queda vacío.

## Lo que sigue igual que antes (no cambió en esta vuelta)
- Columnas reales de `ordenes` confirmadas por código: `id, created_at, user_id,
  source, estado, payment_status, total_uyu, total_usd, moneda, tipo_cambio,
  mp_payment_id, mp_preference_id, paypal_order_id, nombre_cliente, email_cliente,
  telefono_cliente, direccion_entrega, items`.
- `ordenesApi.ts` sigue con el tipo `Orden` desactualizado (usa `usuario_id`,
  `estado_pago`, `total`, columnas que no existen) — no es parte de este cambio.
- El bug de `CarritoModule.tsx` con `.from("products")` sigue sin tocar — es código
  muerto (copia duplicada que no se usa), no bloquea nada.
