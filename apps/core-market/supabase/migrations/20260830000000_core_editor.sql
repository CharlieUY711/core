-- CORE Editor, no "Editor Pro".
--
-- El nombre sale del catálogo: lo leen el menú lateral Y la barra de arriba.
-- Por eso se cambia acá y no en la pantalla — cambiarlo en un solo lugar dejaba
-- el menú diciendo una cosa y la barra otra.
--
-- El código (`editorpro`) NO se toca: es la identidad de la fila, la referencian
-- `RUTAS` en el front y las filas de configuración de cada tienda. Renombrar el
-- código sería romper esas referencias para arreglar una etiqueta.

update public.plataforma_apps
   set nombre = 'CORE Editor'
 where codigo = 'editorpro';
