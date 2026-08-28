-- ===========================================================================
-- Todas las cotizaciones vigentes de una
-- ===========================================================================
--
-- `tipo_cambio_vigente` devuelve una. El formulario del articulo necesita
-- todas: cuando alguien cambia la moneda del precio hay que convertir el
-- numero, y para eso hace falta la cotizacion de la moneda que deja y la de la
-- que elige, sin saber de antemano cuales son.
--
-- Pedirlas de a una seria una consulta por moneda cada vez que se abre un
-- articulo. Son tres filas: van juntas.
--
-- No se resuelve con un select desde el cliente porque hace falta la ultima
-- POR MONEDA -un distinct on- y PostgREST no lo expone.
-- ===========================================================================

begin;

create or replace function public.tipos_de_cambio_vigentes(
  p_to text default 'UYU'
)
returns table (from_currency text, rate numeric, valid_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct on (r.from_currency)
         r.from_currency::text, r.rate, r.valid_at
    from exchange_rates r
   where r.to_currency = p_to
   order by r.from_currency, r.valid_at desc;
$$;

comment on function public.tipos_de_cambio_vigentes(text) is
  'La ultima cotizacion de cada moneda contra p_to. Sin filtro de antiguedad: el BCU no publica fines de semana ni feriados, y valid_at viene para que el consumidor pueda decir de cuando es.';

grant execute on function public.tipos_de_cambio_vigentes(text) to anon, authenticated;

commit;
