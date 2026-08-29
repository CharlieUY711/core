-- ===========================================================================
-- La key de Serper estaba guardada bajo la plataforma equivocada
-- ===========================================================================
--
-- `buscar-web` resuelve la credencial por `platform = 'Serper.dev'`. La key
-- estaba cargada con `name = 'Serper.dev'` pero `platform = 'Otro'`, asi que la
-- busqueda no la encontraba nunca y la funcion devolvia "No hay una API key de
-- Serper.dev cargada en el Vault".
--
-- Eso apagaba CUATRO cosas de una vez, todas por la misma causa:
--   - el logo de la marca,
--   - las sugerencias de articulo,
--   - las imagenes,
--   - los videos.
--
-- Se veian como cuatro funciones distintas que no andaban. Era una sola linea
-- de configuracion.
--
-- Nota: 'Serper.dev' YA existe en la lista de plataformas del Vault
-- (apiVaultTypes.ts, categoria "Busqueda"), asi que se podia elegir. La entrada
-- venia de antes de que estuviera, o se eligio "Otro" por costumbre.
--
-- No toca el valor de la credencial, solo como se clasifica.
-- ===========================================================================

begin;

update api_vault
   set platform = 'Serper.dev', updated_at = now()
 where name = 'Serper.dev'
   and platform <> 'Serper.dev';

commit;
