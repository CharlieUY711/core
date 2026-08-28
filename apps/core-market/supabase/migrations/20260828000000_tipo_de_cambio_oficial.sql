-- ===========================================================================
-- Tipo de cambio oficial: uno solo, de la plataforma
-- ===========================================================================
--
-- QUE PROBLEMA RESUELVE
-- Habia tres tipos de cambio distintos y ninguno funcionaba:
--
--   1. `src/app/services/bcuApi.ts` le pegaba al BCU desde el navegador y, si
--      fallaba, devolvia 42/44 hardcodeado sin avisar que era inventado.
--   2. `exchange_rates` -que el checkout exige para facturar un carrito
--      mixto USD+UYU- estaba vacia y nadie la escribia. Un carrito mixto no se
--      podia facturar.
--   3. La ficha del articulo tenia un campo de TC con check "Auto" y una
--      fuente con fecha y hora, guardados en `atributos` de cada articulo. No
--      lo llenaba nadie, y decia "BCU" aunque el numero lo hubiera tipeado una
--      persona.
--
-- DECISION
-- El tipo de cambio es de la plataforma y es el oficial del BCU. No es del
-- articulo -un articulo no tiene tipo de cambio propio- ni de la tienda: la
-- tienda lo toma de la plataforma. Hay un solo numero, verificable contra la
-- publicacion del BCU de ese dia, y la orden queda estampada con el que uso.
--
-- El TC de una factura no puede salir del cliente: si cada visitante consulta
-- al BCU por su cuenta, el numero que termina en la orden depende de que le
-- contesto al navegador del comprador. Por eso lo escribe un job server-side y
-- todos -vidriera y checkout- leen la misma fila.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- La fuente
-- ---------------------------------------------------------------------------
-- `exchange_rate_sources` ya existia y estaba vacia. Se siembra el BCU.
--
-- Sobre la columna `api_key`: no se usa y no se va a usar. El BCU es publico,
-- no hay credencial que guardar, y el dia que aparezca una fuente que si la
-- pida, esa credencial va al API Vault -que es el lugar de las credenciales-,
-- no a una columna de esta tabla. Guardar secretos en dos lugares distintos
-- termina con dos verdades y una de las dos vencida.
insert into exchange_rate_sources (name, source_type, url, status, config)
select
  'BCU',
  'central_bank',
  'https://cotizaciones.bcu.gub.uy/wscotizaciones/rest/cotizacion/ultimas/1',
  'active',
  jsonb_build_object(
    'moneda_bcu', 2222,   -- codigo del dolar USA en el nomenclador del BCU
    'tipo', 2,            -- cotizacion interbancaria
    'oficial', true
  )
where not exists (select 1 from exchange_rate_sources where name = 'BCU');

comment on column exchange_rate_sources.api_key is
  'Sin uso. Las credenciales van al API Vault, no aca: dos lugares para el mismo secreto terminan con dos verdades y una vencida.';

-- ---------------------------------------------------------------------------
-- Compra y venta, explicitas
-- ---------------------------------------------------------------------------
-- "El oficial" no es un numero, son dos: el BCU publica compra y venta.
-- `rate` sigue siendo el que se factura -y es `venta`, que es lo que
-- corresponde para cobrar en pesos un articulo con precio en dolares-, pero
-- ahora eso esta dicho en vez de quedar implicito, y los dos quedan guardados
-- para poder auditar la fila contra la publicacion del BCU.
alter table exchange_rates
  add column if not exists compra numeric,
  add column if not exists venta  numeric;

comment on column exchange_rates.rate is
  'El que se factura. Es `venta`: cobrar en pesos un precio en dolares se hace al dolar vendedor.';
comment on column exchange_rates.compra is
  'Cotizacion compra tal cual la publica la fuente. No se factura con esta; queda para poder auditar la fila.';
comment on column exchange_rates.venta is
  'Cotizacion venta tal cual la publica la fuente. Es la que se copia en `rate`.';

-- ---------------------------------------------------------------------------
-- Quien puede leerla
-- ---------------------------------------------------------------------------
-- Las dos tablas tenian RLS prendida y CERO policies, o sea que desde el
-- cliente no las leia nadie. Por eso la vidriera terminaba consultando al BCU
-- por su cuenta: no tenia como leer la fila.
--
-- La cotizacion oficial es informacion publica -el BCU la publica-, asi que se
-- lee sin sesion. Escribir es otra cosa: la escribe el job con service_role,
-- que no pasa por RLS, y no se abre a nadie mas. Un TC que puede escribir
-- cualquiera es un precio que puede escribir cualquiera.
drop policy if exists exchange_rates_lectura_publica on exchange_rates;
create policy exchange_rates_lectura_publica
  on exchange_rates for select
  to anon, authenticated
  using (true);

-- `exchange_rate_sources` NO se abre: tiene la columna `api_key` y, aunque hoy
-- este vacia, una tabla que puede contener un secreto no se publica.

-- ---------------------------------------------------------------------------
-- La cotizacion vigente
-- ---------------------------------------------------------------------------
-- La ultima que haya, sin filtro de antiguedad, y a proposito.
--
-- El BCU no publica todos los dias: sabados, domingos y feriados no hay
-- cotizacion nueva. Y si el job falla un martes, el numero del lunes sigue
-- estando. Negarse a vender porque el BCU no publico es peor que facturar al
-- dolar del viernes, asi que la unica razon para bloquear es no tener ninguna
-- cotizacion -que es lo que ya hace `crear_orden_segura`-. Lo viejo se avisa,
-- no se bloquea: por eso la funcion devuelve tambien `valid_at`, para que
-- quien la use pueda decir de cuando es.
create or replace function public.tipo_cambio_vigente(
  p_from text default 'USD',
  p_to   text default 'UYU'
)
returns table (rate numeric, compra numeric, venta numeric, valid_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select r.rate, r.compra, r.venta, r.valid_at
    from exchange_rates r
   where r.from_currency = p_from
     and r.to_currency   = p_to
   order by r.valid_at desc
   limit 1;
$$;

comment on function public.tipo_cambio_vigente(text, text) is
  'Ultima cotizacion, sin filtro de antiguedad: el BCU no publica fines de semana ni feriados. Devuelve valid_at para que el consumidor pueda avisar de cuando es.';

grant execute on function public.tipo_cambio_vigente(text, text) to anon, authenticated;

commit;
