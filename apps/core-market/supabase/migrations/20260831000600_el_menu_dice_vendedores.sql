-- ===========================================================================
-- El menú dice Vendedores
-- ===========================================================================
--
-- Ver docs/architecture/vendedor.md, paso 5.
--
-- "Tiendas" listaba lo que ahora sabemos que son vendedores: no todos tienen
-- vidriera, y el que la tiene puede no haberla tenido siempre. Llamar "Tiendas"
-- a la lista dejaba afuera del nombre a la mitad de lo que muestra.
--
-- Y SE VA EL ENCABEZADO DE SECCIÓN
-- La sección se llamaba "Vendedores" y su primera entrada pasa a llamarse
-- igual. Un encabezado que repite el nombre de lo que agrupa no agrupa nada:
-- ocupa una línea para decir dos veces lo mismo.
--
-- Quedan las dos entradas sueltas y pegadas —210 y 215—, que es la misma
-- vecindad que daba la sección, sin la línea de más. La capacidad de agrupar
-- del menú no se toca: sigue ahí para cuando haya tres o cuatro cosas que
-- agrupar de verdad.
--
-- Las TABLAS no se renombran. `stores`, `store_members` y `store_id` siguen
-- diciendo "store": renombrarlas toca todas las políticas RLS y todas las RPC,
-- es la parte cara y riesgosa, y no agrega ninguna funcionalidad. Se renombra
-- donde el nombre se lee, que es la pantalla.
-- ===========================================================================

begin;

update public.plataforma_apps
   set nombre  = 'Vendedores',
       para    = 'Quién vende: empresas y particulares, con su documento, sus miembros y dónde publica cada uno.',
       seccion = null
 where codigo = 'tiendas';

update public.plataforma_apps
   set para    = 'Quiénes operan a los vendedores, en cuáles y con qué rol.',
       seccion = null
 where codigo = 'personas';

commit;
