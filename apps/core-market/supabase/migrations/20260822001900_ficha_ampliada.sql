-- ===========================================================================
-- Ficha ampliada del articulo
-- ===========================================================================
--
-- Todo lo que sabemos del producto reunido en un lugar: identificacion,
-- atributos tecnicos, medios del fabricante, argumentos de venta y como se
-- vende hoy en cada canal.
--
-- POR QUE SE GUARDA Y NO SE ARMA CADA VEZ
-- Los datos vienen de APIs ajenas. Si la ficha se reconstruye en cada visita,
-- depende de que respondan: un canal caido deja al articulo sin informacion, y
-- un producto que sale de catalogo se lleva puesto lo que sabiamos de el.
-- Guardarla la vuelve un dato del articulo, no una consulta.
--
-- POR QUE JSONB Y NO COLUMNAS
-- La forma la define cada fuente y va a cambiar cuando se sume otra. Fijarla en
-- columnas obligaria a migrar el esquema cada vez que un canal agregue un
-- campo. Lo que si es estable -de donde salio y cuando- va aparte, porque es lo
-- que permite saber si esta al dia y volver a la fuente.
-- ===========================================================================

alter table catalog_items
  add column if not exists ficha            jsonb,
  add column if not exists ficha_fuente     text,
  add column if not exists ficha_producto_id text,
  add column if not exists ficha_at         timestamptz;

comment on column catalog_items.ficha is
  'Ficha ampliada: atributos, medios, caracteristicas y mercado, reunidos de los canales. Forma libre porque la define cada fuente.';
comment on column catalog_items.ficha_fuente is
  'Canal del que salio la ficha. Sin esto no se puede volver a la fuente ni saber a quien creerle si dos difieren.';
comment on column catalog_items.ficha_producto_id is
  'Id del producto en el catalogo de esa fuente, para refrescar sin volver a buscar por texto.';
comment on column catalog_items.ficha_at is
  'Cuando se trajo. Una ficha vieja sigue sirviendo, pero conviene saber que lo es.';

-- ---------------------------------------------------------------------------
-- Guardar la ficha
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER: el aislamiento por tienda lo hace RLS sobre catalog_items.
-- Que la funcion no eleve privilegios es lo que impide escribirle la ficha al
-- articulo de otra tienda.
create or replace function public.guardar_ficha_articulo(
  p_variant_id  uuid,
  p_ficha       jsonb,
  p_fuente      text default null,
  p_producto_id text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item uuid;
begin
  if p_variant_id is null then
    raise exception 'Falta la variante.' using errcode = '22023';
  end if;

  select item_id into v_item from catalog_variants where id = p_variant_id;
  if v_item is null then
    raise exception 'La variante no existe.' using errcode = '22023';
  end if;

  update catalog_items
     set ficha             = p_ficha,
         ficha_fuente      = coalesce(p_fuente, ficha_fuente),
         ficha_producto_id = coalesce(p_producto_id, ficha_producto_id),
         ficha_at          = now()
   where id = v_item;
end;
$$;

comment on function public.guardar_ficha_articulo(uuid, jsonb, text, text) is
  'Guarda la ficha ampliada en el item de la variante. Fuente y producto se conservan si no se envian.';

grant execute on function public.guardar_ficha_articulo(uuid, jsonb, text, text)
  to authenticated;
