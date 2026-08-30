-- Pedidos, no "Órdenes" ni "Mis pedidos".
--
-- "Orden" es la palabra de la base -`orders`, `payment_status`- y ahí se queda:
-- renombrar la tabla sería romper todo lo que la referencia para arreglar una
-- etiqueta. Lo que se lee en pantalla es "Pedidos".
--
-- El nombre sale del catálogo, que leen el menú lateral Y la barra de arriba.
-- Por eso se cambia acá: cambiarlo en la pantalla dejaba el menú diciendo una
-- cosa y la barra otra.

update public.plataforma_apps
   set nombre = 'Pedidos'
 where codigo = 'pedidos';
