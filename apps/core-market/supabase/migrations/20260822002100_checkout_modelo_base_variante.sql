-- ===========================================================================
-- Portar el checkout al modelo Producto Base / Variante
-- ===========================================================================
--
-- El catalogo se reorganizo -catalog_items/variants/listings pasaron a
-- catalog_producto_base/variante/canal_listing, y catalog_prices e
-- catalog_inventory desaparecieron- pero crear_orden_segura quedo apuntando al
-- modelo viejo. Seguia llamando a resolve_price, que ya no existe: cualquier
-- compra fallaba.
--
-- El port ademas simplifica, porque el modelo nuevo es mas simple:
--
--   precio  : de resolve_price(variante, moneda, canal) sobre catalog_prices,
--             con overrides por lista/pais/campania, a v.precio y v.moneda.
--   stock   : de sumar catalog_inventory por ubicacion y descontar recorriendo
--             ubicaciones, a v.stock y un update.
--
-- Lo que se pierde: el precio distinto por canal. Queda anotado como decision
-- a tomar, no como olvido: vender al mismo precio en un marketplace que en la
-- tienda propia rara vez conviene, porque las comisiones no son las mismas.
-- ===========================================================================

create or replace function public.crear_orden_segura(
  p_user_id        uuid,
  p_items          jsonb,
  p_nombre         text,
  p_email          text,
  p_telefono       text default null,
  p_direccion      text default null,
  p_ciudad         text default null,
  p_codigo_postal  text default null,
  p_tipo_comprador text default 'persona',
  p_documento      text default null,
  p_razon_social   text default null,
  p_source         text default 'web'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $_$
DECLARE
  v_order_id       UUID;
  v_total_uyu      NUMERIC := 0;
  v_total_usd      NUMERIC := 0;
  v_item           JSONB;
  v_product_id     UUID;
  v_quantity       INT;
  v_tipo           TEXT;
  v_price          NUMERIC;
  v_currency       TEXT;
  v_stock          INT;
  v_status         TEXT;
  v_items_out      JSONB := '[]'::JSONB;
  v_nombre_prod    TEXT;
  v_currency_final TEXT;
  v_tasa           NUMERIC;
  v_total_uyu_fact NUMERIC;
  v_restante       INT;
  v_loc            RECORD;
  -- Ya no hace falta: el precio vive en la variante.
BEGIN
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

  INSERT INTO ordenes (
    user_id, source, estado, payment_status, total_uyu, total_usd, created_at,
    nombre_cliente, email_cliente, telefono_cliente, direccion_entrega,
    ciudad_entrega, codigo_postal,
    tipo_comprador, documento, razon_social
  ) VALUES (
    p_user_id, p_source, 'pendiente', 'pending_payment', 0, 0, now(),
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

    IF v_tipo NOT IN ('market', 'secondhand') THEN
      RAISE EXCEPTION 'Tipo invalido: %', v_tipo;
    END IF;

    -- ── Variante e item, con lock sobre la variante ──
    SELECT b.titulo, b.status::text, v.precio, coalesce(v.moneda, 'UYU'), coalesce(v.stock, 0)
      INTO v_nombre_prod, v_status, v_price, v_currency, v_stock
      FROM catalog_variante v
      JOIN catalog_producto_base b ON b.id = v.producto_base_id
     WHERE v.id = v_product_id
       FOR UPDATE OF v;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no encontrado', v_product_id;
    END IF;

    IF v_status <> 'active' THEN
      RAISE EXCEPTION 'Producto % no esta disponible (estado %)', v_product_id, v_status;
    END IF;

    -- Debe estar publicado en el canal por el que se compra.
    IF NOT EXISTS (
      SELECT 1 FROM catalog_canal_listing l
       WHERE l.variante_id = v_product_id
         AND l.channel     = v_tipo
         AND l.status      = 'active'
    ) THEN
      RAISE EXCEPTION 'Producto % no esta publicado en %', v_product_id, v_tipo;
    END IF;

    -- El precio y la moneda salen de la variante, que es donde viven ahora.
    -- Antes habia que resolverlos con resolve_price contra catalog_prices,
    -- con overrides por canal, lista, pais y campania. Ese modelo permitia mas
    -- pero nadie lo usaba, y su unica consecuencia real fue el bug de la
    -- moneda truncada a un caracter.

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'Producto % no tiene precio configurado', v_product_id;
    END IF;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %. Disponible: %', v_product_id, v_stock;
    END IF;

    -- Descontar es un update sobre la variante. El modelo viejo repartia el
    -- stock en ubicaciones y habia que recorrerlas; el nuevo no las tiene, y
    -- para una tienda con un solo deposito eso sobraba.
    UPDATE catalog_variante
       SET stock = stock - v_quantity, updated_at = now()
     WHERE id = v_product_id;

    IF v_currency NOT IN ('UYU', 'USD') THEN
      RAISE EXCEPTION 'Moneda no soportada "%" para producto %', v_currency, v_product_id;
    END IF;

    -- Los items de `ordenes` viven en su columna `items` jsonb. NO se inserta
    -- en order_items: esa tabla es del modelo `orders` y sus CHECK exigen
    -- store_product_id y prohiben product_id.
    v_items_out := v_items_out || jsonb_build_object(
      'producto_id',     v_product_id,
      'producto_tipo',   v_tipo,
      'nombre',          v_nombre_prod,
      'cantidad',        v_quantity,
      'precio_unitario', v_price,
      'moneda',          v_currency
    );

    IF v_currency = 'USD' THEN
      v_total_usd := v_total_usd + (v_price * v_quantity);
    ELSE
      v_total_uyu := v_total_uyu + (v_price * v_quantity);
    END IF;

  END LOOP;

  -- ── Moneda de facturacion final ──
  IF v_total_usd > 0 AND v_total_uyu > 0 THEN
    SELECT rate INTO v_tasa
      FROM exchange_rates
     WHERE from_currency = 'USD' AND to_currency = 'UYU'
     ORDER BY valid_at DESC
     LIMIT 1;

    IF v_tasa IS NULL THEN
      RAISE EXCEPTION 'No hay tipo de cambio USD->UYU en exchange_rates. No se puede facturar un carrito mixto sin el.';
    END IF;

    v_total_uyu_fact := v_total_uyu + (v_total_usd * v_tasa);
    v_currency_final := 'UYU';

    UPDATE ordenes
       SET total_uyu   = v_total_uyu_fact,
           total_usd   = v_total_usd,
           currency    = v_currency_final,
           moneda      = v_currency_final,
           tipo_cambio = v_tasa,
           items       = v_items_out
     WHERE id = v_order_id;

    RETURN jsonb_build_object(
      'order_id', v_order_id, 'total_uyu', v_total_uyu_fact,
      'total_usd', v_total_usd, 'currency', v_currency_final, 'tipo_cambio', v_tasa
    );
  ELSE
    v_currency_final := CASE WHEN v_total_usd > 0 THEN 'USD' ELSE 'UYU' END;

    UPDATE ordenes
       SET total_uyu = v_total_uyu,
           total_usd = v_total_usd,
           currency  = v_currency_final,
           moneda    = v_currency_final,
           items     = v_items_out
     WHERE id = v_order_id;

    RETURN jsonb_build_object(
      'order_id', v_order_id, 'total_uyu', v_total_uyu,
      'total_usd', v_total_usd, 'currency', v_currency_final, 'tipo_cambio', NULL
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$_$;
