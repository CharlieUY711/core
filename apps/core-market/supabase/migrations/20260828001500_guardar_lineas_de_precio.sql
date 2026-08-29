-- ===========================================================================
-- Guardar las líneas de precio de un artículo
-- ===========================================================================
--
-- REEMPLAZA TODAS, NO ACTUALIZA UNA
-- La pantalla edita el conjunto: se agregan líneas con el "+", se quitan con la
-- "×", y se guarda todo junto. Una RPC que actualizara de a una obligaría a la
-- pantalla a llevar la cuenta de qué cambió, qué se agregó y qué se borró — y
-- esa contabilidad se desincroniza en cuanto alguien edita desde otro lado.
--
-- Mandar el conjunto entero y reemplazarlo es lo mismo que ve el usuario: esto
-- es lo que quedó.
--
-- EN UNA TRANSACCIÓN
-- Borrar y volver a insertar deja un instante sin líneas. Adentro de la
-- función eso no se ve desde afuera; si fueran dos llamadas separadas, una
-- consulta en el medio veria el articulo sin precios.
-- ===========================================================================

begin;

create or replace function public.guardar_lineas_de_precio(
  p_variante_id uuid,
  p_lineas      jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_linea  jsonb;
  v_dest   text[];
  v_n      integer := 0;
begin
  if not exists (select 1 from catalog_variante where id = p_variante_id) then
    raise exception 'La publicación no existe o no pertenece a esta tienda.'
      using errcode = '42501';
  end if;

  delete from catalog_precio where variante_id = p_variante_id;

  for v_linea in select * from jsonb_array_elements(coalesce(p_lineas, '[]'::jsonb)) loop
    v_dest := array(select jsonb_array_elements_text(v_linea->'destinos'));

    -- Una linea sin destinos no rige en ningun lado y una sin precio no dice
    -- nada: se saltean en vez de guardarse a medias. La pantalla permite tener
    -- una linea a medio llenar mientras se escribe, y eso no es un error.
    if coalesce(array_length(v_dest, 1), 0) = 0 then continue; end if;
    if coalesce((v_linea->>'precio')::numeric, 0) <= 0 then continue; end if;

    insert into catalog_precio (
      variante_id, destinos, precio, moneda, tax_rate_id, etiqueta,
      desde, hasta, hora_desde, hora_hasta, dias, prioridad
    ) values (
      p_variante_id,
      v_dest,
      (v_linea->>'precio')::numeric,
      coalesce(upper(v_linea->>'moneda'), 'UYU'),
      nullif(v_linea->>'tax_rate_id','')::uuid,
      nullif(v_linea->>'etiqueta',''),
      nullif(v_linea->>'desde','')::timestamptz,
      nullif(v_linea->>'hasta','')::timestamptz,
      nullif(v_linea->>'hora_desde','')::time,
      nullif(v_linea->>'hora_hasta','')::time,
      case when v_linea ? 'dias' and jsonb_typeof(v_linea->'dias') = 'array'
           then array(select (jsonb_array_elements_text(v_linea->'dias'))::smallint)
           else null end,
      coalesce((v_linea->>'prioridad')::integer, 0)
    );
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

comment on function public.guardar_lineas_de_precio(uuid, jsonb) is
  'Reemplaza TODAS las lineas de precio del articulo por las que se mandan. La pantalla edita el conjunto, asi que se guarda el conjunto. Devuelve cuantas quedaron.';

-- ---------------------------------------------------------------------------
-- Leerlas
-- ---------------------------------------------------------------------------
create or replace function public.lineas_de_precio(p_variante_id uuid)
returns setof catalog_precio
language sql
stable
security invoker
set search_path = public
as $$
  select * from catalog_precio
   where variante_id = p_variante_id
   order by prioridad desc, created_at;
$$;

grant execute on function public.guardar_lineas_de_precio(uuid, jsonb) to authenticated;
grant execute on function public.lineas_de_precio(uuid)                to anon, authenticated;

commit;
