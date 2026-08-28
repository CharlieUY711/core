-- ===========================================================================
-- Todas las monedas que ofrece el alta, y una corrida mas
-- ===========================================================================
--
-- MONEDAS
-- El formulario deja elegir UYU, USD y EUR, pero el job solo traia el dolar.
-- Un selector que ofrece una moneda para la que no hay cotizacion cambia la
-- etiqueta y no el numero: si se ofrece, tiene que poder convertirse.
--
-- Todo se cotiza contra el peso, que es como lo publica el BCU. Pasar de
-- dolares a euros se resuelve pivoteando por el peso: n monedas son n filas,
-- no n².
--
-- TERCERA CORRIDA
-- El BCU no publica a hora fija. Con dos corridas ya se cubre bien, pero una
-- tercera al mediodia acorta la ventana en la que seguimos con la cotizacion
-- de ayer, y no cuesta nada: la funcion es idempotente, asi que una corrida
-- sobre una cotizacion ya guardada no hace nada.
-- ===========================================================================

begin;

update exchange_rate_sources
   set config = config || jsonb_build_object(
         'monedas', jsonb_build_array(
           jsonb_build_object('bcu', 2222, 'iso', 'USD'),   -- DOLAR USA
           jsonb_build_object('bcu', 1111, 'iso', 'EUR')    -- EURO
         )
       ),
       updated_at = now()
 where name = 'BCU';

select cron.unschedule('tipo-de-cambio-mediodia')
 where exists (select 1 from cron.job where jobname = 'tipo-de-cambio-mediodia');

-- 17:00 UTC son las 14:00 en Montevideo, entre las dos corridas que ya habia.
select cron.schedule(
  'tipo-de-cambio-mediodia',
  '0 17 * * *',
  $$
  select extensions.http_post(
    url     := 'https://pukbgsgrtjqprijpecob.supabase.co/functions/v1/tipo-de-cambio',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

commit;
