-- ===========================================================================
-- La URL del BCU que estaba en el codigo no existe
-- ===========================================================================
--
-- La migracion anterior sembro la fuente con el endpoint que venia de
-- `src/app/services/bcuApi.ts`:
--
--   https://cotizaciones.bcu.gub.uy/wscotizaciones/rest/cotizacion/ultimas/1?moneda=2222&tipo=2
--
-- Ese endpoint devuelve 404. No es que se rompio: no existe. O sea que el
-- codigo que decia consultar al BCU nunca trajo una cotizacion, y no se noto
-- porque al fallar devolvia 42/44 hardcodeado — el sistema mostraba un dolar
-- inventado y parecia andar.
--
-- Lo que el BCU si publica es un servicio SOAP, `awsbcucotizaciones`, con su
-- WSDL. Se le pide un rango de fechas y devuelve una fila por dia habil, con
-- TCC (compra) y TCV (venta).
--
-- Se pide un rango y no "hoy" porque el BCU no publica fines de semana ni
-- feriados: pedir un solo dia devuelve vacio varias veces por mes.
-- ===========================================================================

begin;

update exchange_rate_sources
   set url        = 'https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones',
       source_type = 'central_bank',
       config     = jsonb_build_object(
         'protocolo',        'soap',
         'moneda_bcu',       2222,   -- "DOLAR USA" en el nomenclador del BCU
         'grupo',            0,
         'dias_hacia_atras', 10,     -- alcanza para cubrir feriados largos
         'oficial',          true
       ),
       updated_at = now()
 where name = 'BCU';

commit;
