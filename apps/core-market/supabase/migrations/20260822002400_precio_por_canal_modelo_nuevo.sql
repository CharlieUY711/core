-- ===========================================================================
-- Precio propio por canal
-- ===========================================================================
--
-- En el modelo nuevo el precio es una columna de la variante, y hay uno solo.
-- Eso alcanza para empezar pero no para vender: cada canal cobra su comision,
-- tiene su competencia y su publico, y el precio que conviene en uno no es el
-- que conviene en otro. Vender al mismo numero en un marketplace que en la
-- tienda propia es regalar el margen en uno de los dos.
--
-- DONDE VA
-- En catalog_canal_listing, que es la fila que ya representa "este producto en
-- este canal". No en una tabla aparte: el modelo viejo tenia catalog_prices con
-- overrides por canal, lista, pais y campania, permitia mucho mas de lo que
-- nadie usaba, y su unica consecuencia real fue un bug. Una columna al lado del
-- listing dice lo mismo que hace falta y no se puede desincronizar.
--
-- COMO MANDA
-- Si el listing tiene precio, gana para ese canal. Si no, vale el de la
-- variante. NULL significa "sin precio propio", no cero: un cero es publicar
-- gratis, y es una respuesta que nadie quiso dar.
-- ===========================================================================

begin;

alter table catalog_canal_listing
  add column if not exists precio numeric(12,4),
  add column if not exists moneda text;

alter table catalog_canal_listing drop constraint if exists canal_listing_precio_positivo;
alter table catalog_canal_listing add constraint canal_listing_precio_positivo
  check (precio is null or precio > 0);

alter table catalog_canal_listing drop constraint if exists canal_listing_moneda_iso;
alter table catalog_canal_listing add constraint canal_listing_moneda_iso
  check (moneda is null or moneda ~ '^[A-Z]{3}$');

comment on column catalog_canal_listing.precio is
  'Precio propio en este canal. NULL = vale el de la variante. Nunca cero: cero seria publicar gratis.';
comment on column catalog_canal_listing.moneda is
  'Moneda del precio propio. NULL = la de la variante.';

-- ---------------------------------------------------------------------------
-- Fijar o quitar el precio de un canal
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER a proposito: el aislamiento por tienda lo hace RLS sobre
-- catalog_canal_listing. Que la funcion no eleve privilegios es lo que impide
-- ponerle precio al producto de otra tienda.
create or replace function public.fijar_precio_canal(
  p_variante_id uuid,
  p_channel     text,
  p_precio      numeric,
  p_moneda      text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_listing uuid;
begin
  if p_variante_id is null then
    raise exception 'Falta la variante.' using errcode = '22023';
  end if;
  if p_channel is null or btrim(p_channel) = '' then
    raise exception 'Falta el canal. El precio general se cambia en la variante.'
      using errcode = '22023';
  end if;
  if p_moneda is not null and p_moneda !~ '^[A-Z]{3}$' then
    raise exception 'La moneda tiene que ser un codigo de tres letras.' using errcode = '22023';
  end if;

  select id into v_listing
    from catalog_canal_listing
   where variante_id = p_variante_id and channel = p_channel
   limit 1;

  if v_listing is null then
    raise exception 'El producto no esta en el canal "%". Activalo antes de ponerle precio.', p_channel
      using errcode = '22023';
  end if;

  -- Nulo o cero significa "sin precio propio": se borra el override y vuelve a
  -- mandar el de la variante. Guardar un cero seria publicar gratis.
  if p_precio is null or p_precio <= 0 then
    update catalog_canal_listing
       set precio = null, moneda = null, updated_at = now()
     where id = v_listing;
    return;
  end if;

  update catalog_canal_listing
     set precio = p_precio, moneda = coalesce(p_moneda, moneda), updated_at = now()
   where id = v_listing;
end;
$$;

comment on function public.fijar_precio_canal(uuid, text, numeric, text) is
  'Fija o quita el precio propio de una variante en un canal. Precio nulo o cero lo quita y devuelve el control al de la variante.';

grant execute on function public.fijar_precio_canal(uuid, text, numeric, text)
  to authenticated;

commit;
