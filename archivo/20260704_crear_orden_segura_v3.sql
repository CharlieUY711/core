-- ============================================================
-- crear_orden_segura — v3: restaura la lógica original real +
-- agrega datos de contacto/persona-empresa
-- ============================================================
-- CONTEXTO: la v2 anterior fue escrita SIN ver el código real de esta
-- función (solo infiriendo por el Edge Function) y como resultado
-- introdujo regresiones reales respecto a la versión en producción
-- (ver pg_get_functiondef corrido contra la base real):
--   • Eliminaba la rama `productos_secondhand` por completo.
--   • Ignoraba `product_prices.price_oddy` (pricing multicanal),
--     usando siempre `precio` de la tabla base.
--   • Usaba estados inventados ('active' como único válido) en vez
--     de los reales ('paused' / 'sold' para market).
--   • Asumía una columna `stock_ilimitado` que no existe en la función
--     real (hubiera fallado al ejecutarse).
--   • Cambiaba el modelo de ítems de `order_items` (tabla normalizada,
--     la que usa la función real) a un JSONB embebido en `ordenes.items`.
--
-- Esta v3 restaura 1:1 la lógica de la función real (branches
-- market/secondhand, pricing con product_prices, estados correctos,
-- auto-marcado sold/inactive) y usa `order_items` como la función
-- real, en vez de reemplazarla por otra cosa.
--
-- Además, escribe un resumen en `ordenes.items` (JSONB) porque
-- `OrdenPage.tsx` ya lo lee y hoy nada lo llena (bug preexistente,
-- no introducido acá) — esto lo corrige como efecto secundario, sin
-- eliminar `order_items`.
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_orden_segura(
  p_user_id        UUID,
  p_items          JSONB,               -- [{product_id, quantity, tipo}]
  p_nombre         TEXT,
  p_email          TEXT,
  p_telefono       TEXT DEFAULT NULL,
  p_direccion      TEXT DEFAULT NULL,
  p_ciudad         TEXT DEFAULT NULL,
  p_codigo_postal  TEXT DEFAULT NULL,
  p_tipo_comprador TEXT DEFAULT 'persona',
  p_documento      TEXT DEFAULT NULL,
  p_razon_social   TEXT DEFAULT NULL,
  p_source         TEXT DEFAULT 'web'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_order_id    UUID;
  v_total       NUMERIC := 0;
  v_item        JSONB;
  v_product_id  UUID;
  v_quantity    INT;
  v_tipo        TEXT;
  v_price       NUMERIC;
  v_stock       INT;
  v_status      TEXT;
  v_items_out   JSONB := '[]'::JSONB;   -- resumen para ordenes.items
  v_nombre_prod TEXT;
BEGIN
  -- ── Validación persona/empresa (igual que v2, esto sí era nuevo y correcto) ──
  IF p_tipo_comprador NOT IN ('persona', 'empresa') THEN
    RAISE EXCEPTION 'tipo_comprador invalido';
  END IF;

  IF p_tipo_comprador = 'empresa' THEN
    IF p_razon_social IS NULL OR btrim(p_razon_social) = '' THEN
      RAISE EXCEPTION 'razon_social requerida para empresa';
    END IF;
    IF p_documento IS NULL OR p_documento !~ '^[0-9]{12}$' THEN
      RAISE EXCEPTION 'RUT invalido';
    END IF;
  END IF;

  IF p_nombre IS NULL OR btrim(p_nombre) = '' THEN
    RAISE EXCEPTION 'nombre requerido';
  END IF;
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email invalido';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items requeridos';
  END IF;

  -- ── Crear orden en estado pendiente (igual que la función real) ──
  INSERT INTO ordenes (
    user_id, source, estado, payment_status, total_uyu, created_at,
    nombre_cliente, email_cliente, telefono_cliente, direccion_entrega,
    ciudad_entrega, codigo_postal,
    tipo_comprador, documento, razon_social
  ) VALUES (
    p_user_id, p_source, 'pendiente', 'pendiente', 0, now(),
    p_nombre, p_email, p_telefono, p_direccion,
    p_ciudad, p_codigo_postal,
    p_tipo_comprador, p_documento, p_razon_social
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP

    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity   := (v_item->>'quantity')::INT;
    v_tipo       := COALESCE(v_item->>'tipo', 'market');

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Cantidad invalida para producto %', v_product_id;
    END IF;

    IF v_tipo = 'market' THEN

      SELECT
        COALESCE(pp.price_oddy, pm.precio),
        pm.stock,
        pm.status,
        pm.nombre
      INTO v_price, v_stock, v_status, v_nombre_prod
      FROM productos_market pm
      LEFT JOIN product_prices pp ON pp.product_id = pm.id
      WHERE pm.id = v_product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto % no encontrado', v_product_id;
      END IF;

      IF v_status = 'paused' THEN
        RAISE EXCEPTION 'Producto % esta pausado', v_product_id;
      END IF;

      IF v_status = 'sold' OR v_stock < v_quantity THEN
        RAISE EXCEPTION 'Stock insuficiente para producto %. Disponible: %', v_product_id, v_stock;
      END IF;

      UPDATE productos_market
      SET
        stock  = stock - v_quantity,
        status = CASE WHEN stock - v_quantity <= 0 THEN 'sold' ELSE status END
      WHERE id = v_product_id;

    ELSIF v_tipo = 'secondhand' THEN

      SELECT
        COALESCE(pp.price_oddy, ps.precio),
        ps.status,
        ps.nombre
      INTO v_price, v_status, v_nombre_prod
      FROM productos_secondhand ps
      LEFT JOIN product_prices pp ON pp.product_id = ps.id
      WHERE ps.id = v_product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto secondhand % no encontrado', v_product_id;
      END IF;

      IF v_status != 'active' THEN
        RAISE EXCEPTION 'Producto secondhand % no disponible', v_product_id;
      END IF;

      UPDATE productos_secondhand
      SET status = 'inactive', estado = 'vendido'
      WHERE id = v_product_id;

    ELSE
      RAISE EXCEPTION 'Tipo invalido: %', v_tipo;
    END IF;

    -- Tabla normalizada (igual que la función real)
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES (v_order_id, v_product_id, v_quantity, v_price);

    -- Resumen JSONB (nuevo — para que ordenes.items deje de estar vacío,
    -- que es lo que hoy lee OrdenPage.tsx)
    v_items_out := v_items_out || jsonb_build_object(
      'producto_id',     v_product_id,
      'producto_tipo',   v_tipo,
      'nombre',          v_nombre_prod,
      'cantidad',        v_quantity,
      'precio_unitario', v_price
    );

    v_total := v_total + (v_price * v_quantity);

  END LOOP;

  UPDATE ordenes SET total_uyu = v_total, items = v_items_out WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total',    v_total
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;
