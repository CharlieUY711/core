-- ===========================================================================
-- Precio objetivo por canal
-- ===========================================================================
--
-- El modelo de precios ya soportaba overrides por canal -catalog_prices con
-- `channel` no nulo gana sobre la fila maestra-, pero no habia forma de
-- fijarlos: actualizar_publicacion escribe siempre la fila maestra.
--
-- Vender al mismo precio en todos lados no es lo normal. Cada canal cobra su
-- comision, tiene su competencia y su publico, y el precio que conviene en uno
-- no es el que conviene en otro. Sin poder fijarlo por canal, esa decision no
-- se puede tomar.
--
-- Tenant y permisos: la funcion es SECURITY INVOKER a proposito. El aislamiento
-- lo hace RLS sobre catalog_prices via la variante; que la funcion no eleve
-- privilegios es lo que impide fijarle precio a la variante de otra tienda.
-- ===========================================================================

create or replace function public.fijar_precio_canal(
  p_variant_id uuid,
  p_channel    text,
  p_amount     numeric,
  p_currency   text default 'UYU'
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_existe uuid;
begin
  if p_variant_id is null then
    raise exception 'Falta la variante.' using errcode = '22023';
  end if;
  if p_channel is null or btrim(p_channel) = '' then
    raise exception 'Falta el canal. Para el precio maestro va actualizar_publicacion.'
      using errcode = '22023';
  end if;
  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'La moneda tiene que ser un codigo de tres letras.' using errcode = '22023';
  end if;

  -- Precio nulo o cero significa "sin precio propio en este canal": se borra
  -- el override y vuelve a mandar el maestro. Guardar un cero seria publicar
  -- gratis, que no es lo que nadie quiere decir.
  if p_amount is null or p_amount <= 0 then
    delete from catalog_prices
     where variant_id = p_variant_id
       and channel    = p_channel
       and currency   = p_currency;
    return;
  end if;

  select id into v_existe
    from catalog_prices
   where variant_id = p_variant_id
     and channel    = p_channel
     and currency   = p_currency
   limit 1;

  if v_existe is null then
    -- priority 10: por encima del maestro, que se inserta en 0.
    insert into catalog_prices (variant_id, channel, currency, amount, priority)
    values (p_variant_id, p_channel, p_currency, p_amount, 10);
  else
    update catalog_prices set amount = p_amount where id = v_existe;
  end if;
end;
$$;

comment on function public.fijar_precio_canal(uuid, text, numeric, text) is
  'Fija o borra el precio de una variante para un canal. Amount nulo o cero borra el override y devuelve el control al precio maestro.';

grant execute on function public.fijar_precio_canal(uuid, text, numeric, text)
  to authenticated;
