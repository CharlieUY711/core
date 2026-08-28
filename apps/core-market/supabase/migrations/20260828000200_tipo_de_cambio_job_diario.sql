-- ===========================================================================
-- El job que escribe la cotizacion, todos los dias
-- ===========================================================================
--
-- Sin esto, `exchange_rates` queda con la fila que se cargo a mano y se va
-- poniendo vieja. El checkout no se rompe -factura con la ultima que haya-,
-- pero factura con un dolar de hace semanas, que es peor que romperse porque
-- no se nota.
--
-- DOS VECES POR DIA, A PROPOSITO
-- El BCU no publica la cotizacion del dia a una hora fija. Con una sola
-- corrida a las 10 de la manana, los dias que publica mas tarde nos quedamos
-- con la de ayer hasta el dia siguiente. La segunda corrida de la tarde lo
-- levanta. Correr dos veces no cuesta nada: la funcion es idempotente -la fila
-- esta identificada por (source_id, from, to, valid_at)- asi que la segunda
-- corrida sobre una cotizacion ya guardada no hace nada.
--
-- SIN CLAVES ACA
-- La funcion esta desplegada con --no-verify-jwt, asi que el job la llama sin
-- Authorization. Es lo que se quiere: no hay ninguna credencial escrita en una
-- migracion, que es un archivo versionado. Lo unico que alguien puede hacer
-- llamandola por su cuenta es que le pidamos al BCU la misma cotizacion otra
-- vez y la guardemos igual; no hay nada que escribir de afuera.
-- ===========================================================================

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Idempotente: si ya estaba agendado, se reemplaza en vez de duplicarse.
select cron.unschedule('tipo-de-cambio-manana')
 where exists (select 1 from cron.job where jobname = 'tipo-de-cambio-manana');
select cron.unschedule('tipo-de-cambio-tarde')
 where exists (select 1 from cron.job where jobname = 'tipo-de-cambio-tarde');

-- Horarios en UTC. Montevideo es UTC-3: 13:00 UTC son las 10:00 y 21:00 UTC
-- son las 18:00.
select cron.schedule(
  'tipo-de-cambio-manana',
  '0 13 * * *',
  $$
  select extensions.http_post(
    url     := 'https://pukbgsgrtjqprijpecob.supabase.co/functions/v1/tipo-de-cambio',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'tipo-de-cambio-tarde',
  '0 21 * * *',
  $$
  select extensions.http_post(
    url     := 'https://pukbgsgrtjqprijpecob.supabase.co/functions/v1/tipo-de-cambio',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

commit;
