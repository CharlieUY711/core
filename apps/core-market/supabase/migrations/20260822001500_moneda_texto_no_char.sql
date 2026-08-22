-- ===========================================================================
-- La moneda se estaba guardando truncada a una letra
-- ===========================================================================
--
-- Sintoma: un producto con precio UYU 60.000 aparecia como "UYU 0" en la lista
-- de publicaciones, la vista previa mostraba 60.000, y Mercado Libre respondia
-- "El producto no tiene precio en UYU". Tres respuestas distintas para el mismo
-- precio.
--
-- CAUSA
-- En Postgres, `character` sin longitud es `character(1)`. `resolve_price`
-- declara `p_currency character`, asi que 'UYU' se convierte en 'U' al entrar.
-- Y las funciones de escritura hacian `p_currency::char`, guardando 'U' en
-- catalog_prices.currency, que es text.
--
-- De ahi las tres respuestas:
--   * resolve_price busca 'U' y encuentra 'U'   -> la vidriera mostraba 60.000
--   * catalog_publicaciones compara text con text: 'U' = 'UYU' es falso
--     -> master_price NULL -> la lista mostraba 0
--   * un precio guardado correctamente como 'UYU' no lo encuentra nadie
--     -> "no tiene precio en UYU"
--
-- Ningun codigo ISO de moneda entra en un char(1). La firma hacia imposible
-- que el sistema funcionara con datos correctos, y solo "andaba" mientras
-- escritura y lectura se equivocaban igual.
--
-- SE ARREGLA
--   1. resolve_price pasa a recibir text.
--   2. Se quitan todos los casts ::char de las funciones que escriben o leen.
--   3. Se normalizan las filas ya guardadas.
--   4. Un CHECK impide que vuelva a entrar una moneda de menos de 3 letras.
-- ===========================================================================

-- --- 1. Normalizar lo guardado -------------------------------------------
--
-- ATENCION: 'UYU' y 'USD' truncan las dos a 'U', asi que el dato original no
-- se puede recuperar del valor. Se asume UYU porque es el default de
-- crear_publicacion y actualizar_publicacion, las unicas funciones que
-- escribieron con el cast roto. Si alguna publicacion tenia precio en dolares
-- cargado por esa via, hay que corregirla a mano.
update catalog_prices set currency = 'UYU' where currency = 'U';
update catalog_prices set currency = 'USD' where currency = 'S';
update catalog_prices set currency = 'EUR' where currency = 'E';

-- --- 2. resolve_price con text -------------------------------------------
-- Se crea como sobrecarga y la vieja se borra recien en 20260822001600, DESPUES
-- de rehacer las funciones que la llaman: catalog_publicaciones y
-- catalog_vidriera son `language sql`, asi que Postgres registra la dependencia
-- y un drop antes de tiempo falla.
create or replace function public.resolve_price(
  p_variant_id uuid,
  p_currency   text,
  p_channel    text        default null,
  p_price_list text        default null,
  p_country    text        default null,
  p_campaign   text        default null,
  p_at         timestamptz default null
) returns catalog_prices
language plpgsql
stable
as $$
DECLARE
  v_at      TIMESTAMPTZ := COALESCE(p_at, NOW());
  v_item_id UUID;
  v_result  catalog_prices;
BEGIN
  -- Nivel variante (mayor prioridad)
  SELECT cp.*
  INTO   v_result
  FROM   catalog_prices cp
  WHERE  cp.variant_id  = p_variant_id
    AND  cp.currency    = p_currency
    AND  (cp.channel    IS NULL OR cp.channel    = p_channel)
    AND  (cp.price_list IS NULL OR cp.price_list = p_price_list)
    AND  (cp.country    IS NULL OR cp.country    = p_country)
    AND  (cp.campaign   IS NULL OR cp.campaign   = p_campaign)
    AND  (cp.valid_from  IS NULL OR cp.valid_from  <= v_at)
    AND  (cp.valid_until IS NULL OR cp.valid_until >  v_at)
  ORDER BY cp.priority DESC
  LIMIT 1;

  IF FOUND THEN RETURN v_result; END IF;

  -- Fallback: nivel item padre
  SELECT item_id INTO v_item_id
  FROM   catalog_variants
  WHERE  id = p_variant_id;

  IF v_item_id IS NULL THEN RETURN NULL; END IF;

  SELECT cp.*
  INTO   v_result
  FROM   catalog_prices cp
  WHERE  cp.item_id     = v_item_id
    AND  cp.currency    = p_currency
    AND  (cp.channel    IS NULL OR cp.channel    = p_channel)
    AND  (cp.price_list IS NULL OR cp.price_list = p_price_list)
    AND  (cp.country    IS NULL OR cp.country    = p_country)
    AND  (cp.campaign   IS NULL OR cp.campaign   = p_campaign)
    AND  (cp.valid_from  IS NULL OR cp.valid_from  <= v_at)
    AND  (cp.valid_until IS NULL OR cp.valid_until >  v_at)
  ORDER BY cp.priority DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

comment on function public.resolve_price(uuid, text, text, text, text, text, timestamptz) is
  'Resuelve el precio vigente para una variante dado un contexto (canal, lista, pais, campania). p_currency es text: un codigo ISO no entra en el character(1) que declaraba antes.';

-- --- 3. Que no vuelva a entrar una moneda truncada ------------------------
alter table catalog_prices drop constraint if exists catalog_prices_currency_iso;
alter table catalog_prices add constraint catalog_prices_currency_iso
  check (currency ~ '^[A-Z]{3}$');
