-- Las credenciales de la app de Meta pasan a ser de servidor.
--
-- SÍNTOMA: `META_APP_ID` y `META_APP_SECRET` cargadas, con los nombres exactos,
-- y la pantalla diciendo "falta el identificador y la clave secreta".
--
-- CAUSA: la función las busca con `solo_servidor = true`, y el formulario del
-- Vault no marca esa columna: guarda una credencial normal. Nombre correcto,
-- valor correcto, y aun así invisible para quien la necesita.
--
-- Y ADEMÁS ERA UN PROBLEMA DE SEGURIDAD, no sólo de que no funcionara. Una
-- credencial normal la puede leer su dueño desde el panel: la clave secreta de
-- la app estuvo llegando al navegador. Con ella, cualquiera se hace pasar por
-- nuestra app contra Meta.
--
-- Se corrigen las que ya están. Que las próximas nazcan bien lo arregla el
-- formulario, que ahora sabe cuáles son de servidor porque está declarado en
-- `ui/credencialesRequeridas.ts`.

update public.api_vault
   set solo_servidor = true,
       -- El tipo también: una clave secreta no es una "api key". Es lo que
       -- decide cómo se muestra y qué se espera de ella.
       type = case when name = 'META_APP_SECRET' then 'secret' else type end
 where platform = 'Meta'
   and name in ('META_APP_ID', 'META_APP_SECRET');
