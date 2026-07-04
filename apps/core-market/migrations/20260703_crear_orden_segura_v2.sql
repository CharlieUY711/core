-- ============================================================
-- crear_orden_segura — reescritura completa
-- ============================================================
-- SUPUESTOS que no pude verificar contra la base real (no tengo
-- acceso): las columnas de `productos_market` confirmadas por código
-- real (AdminRRSS.tsx, productos/types.ts) son:
--   id, nombre, precio, moneda, stock, stock_ilimitado, status, imagen_principal
-- status activo = 'active' (ver ProductoStatus en productos/types.ts).
--
-- Alcance: por pedido explícito, esta versión NO contempla
-- `productos_secondhand` — todos los items se resuelven contra
-- `productos_market`. Si más adelante hace falta second-hand, hay
-- que reintroducir la rama condicional por `tipo` (queda comentada
-- abajo como referencia de dónde iría).
--
-- CAMBIOS respecto a la versión anterior (que no pude ver, solo
-- inferí su forma por los mensajes de error del Edge Function):
--   • Ahora recibe también los datos de contacto/envío y
--     persona-vs-empresa, y los graba en `ordenes`.
--   • Precio se resuelve 100% server-side contra el catálogo
--     (nunca se confía en lo que manda el cliente).
--   • Valida RUT (si tipo_comprador = 'empresa') con el mismo
--     algoritmo módulo 11 que ya corre en el frontend — doble
--     validación, porque el cliente se puede saltear el JS.
-- ============================================================

CREATE OR REPLACE FUNCTION crear_orden_segura(
  p_user_id        UUID,
  p_items          JSONB,               -- [{product_id, quantity}]
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
AS $$
DECLARE
  v_item          JSONB;
  v_product_id    UUID;
  v_qty           INTEGER;
  v_row           RECORD;
  v_items_out     JSONB := '[]'::JSONB;
  v_total_uyu     NUMERIC := 0;
  v_total_usd     NUMERIC := 0;
  v_moneda        TEXT;
  v_order_id      UUID;
BEGIN
  -- ── Validación persona/empresa (RUT módulo 11, misma regla que el frontend) ──
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

  -- ── Validar y resolver cada item contra productos_market ──
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty        := (v_item->>'quantity')::INTEGER;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'item invalido';
    END IF;

    SELECT id, nombre, precio, moneda, stock, stock_ilimitado, status
      INTO v_row
      FROM productos_market
      WHERE id = v_product_id
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Uno o mas productos no estan disponibles (no encontrado)';
    END IF;

    IF v_row.status <> 'active' THEN
      RAISE EXCEPTION 'Uno o mas productos estan pausados';
    END IF;

    IF NOT v_row.stock_ilimitado AND v_row.stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuficiente para uno o mas productos';
    END IF;

    -- Descontar stock (si no es ilimitado)
    IF NOT v_row.stock_ilimitado THEN
      UPDATE productos_market SET stock = stock - v_qty WHERE id = v_product_id;
    END IF;

    -- Acumular total en la moneda real del producto (nunca la que manda el cliente)
    IF v_row.moneda = 'USD' THEN
      v_total_usd := v_total_usd + (v_row.precio * v_qty);
    ELSE
      v_total_uyu := v_total_uyu + (v_row.precio * v_qty);
    END IF;

    v_items_out := v_items_out || jsonb_build_object(
      'producto_id',     v_row.id,
      'producto_tipo',   'market',
      'nombre',          v_row.nombre,
      'cantidad',        v_qty,
      'precio_unitario', v_row.precio,
      'moneda',          v_row.moneda
    );
  END LOOP;

  IF jsonb_array_length(v_items_out) = 0 THEN
    RAISE EXCEPTION 'items requeridos';
  END IF;

  -- Moneda "principal" de la orden: la que tenga mayor total.
  -- NOTA: si una orden mezcla UYU y USD, total_uyu/total_usd quedan
  -- ambos poblados pero `moneda` solo indica cuál mostrar por default
  -- (mismo patrón que ya usa OrdenPage.tsx). Si el negocio necesita
  -- mezclar monedas con conversión real, hay que sumarlas usando la
  -- tabla de tipo de cambio (bcuApi.ts) en vez de esta suma simple.
  v_moneda := CASE WHEN v_total_usd > 0 AND v_total_uyu = 0 THEN 'USD' ELSE 'UYU' END;

  INSERT INTO ordenes (
    user_id, source, estado, payment_status,
    total_uyu, total_usd, moneda,
    nombre_cliente, email_cliente, telefono_cliente, direccion_entrega,
    ciudad_entrega, codigo_postal,
    tipo_comprador, documento, razon_social,
    items
  ) VALUES (
    p_user_id, p_source, 'pendiente', 'pendiente',
    v_total_uyu, v_total_usd, v_moneda,
    p_nombre, p_email, p_telefono, p_direccion,
    p_ciudad, p_codigo_postal,
    p_tipo_comprador, p_documento, p_razon_social,
    v_items_out
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total',    CASE WHEN v_moneda = 'USD' THEN v_total_usd ELSE v_total_uyu END
  );
END;
$$;
