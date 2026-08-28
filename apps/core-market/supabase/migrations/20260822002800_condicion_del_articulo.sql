-- ===========================================================================
-- La condicion del articulo no tenia donde guardarse
-- ===========================================================================
--
-- catalog_producto_base.tipo es 'market' o 'secondhand': es el canal, no el
-- estado de la cosa. En el modelo nuevo no quedo ninguna columna para la
-- condicion, asi que lo que el formulario pedia -Nuevo, Usado, Para reparar- se
-- descartaba al guardar. Un campo que se completa y no se persiste es peor que
-- no tenerlo: quien lo carga cree que quedo dicho.
--
-- EL VOCABULARIO YA EXISTE
-- El enum item_condition esta en la base desde antes -new, like_new, good,
-- fair, poor- y hoy solo lo referencia una tabla deprecada. Se reusa en vez de
-- inventar otra lista: dos vocabularios para la misma cosa terminan con la
-- mitad del catalogo en uno y la mitad en el otro, y ninguna consulta que los
-- cruce.
--
-- Los cinco valores cubren el caso nuevo y el usado sin mezclarlos con el
-- canal, que era el otro problema: "Nuevo" no es lo contrario de "Second Hand".
-- ===========================================================================

alter table catalog_producto_base
  add column if not exists condicion public.item_condition;

comment on column catalog_producto_base.condicion is
  'Estado del articulo, con el vocabulario de item_condition. Distinto de `tipo`, que es el canal (market / secondhand).';

-- Lo que ya existe es de Market y esta sin usar: es lo que declara su tipo.
update catalog_producto_base
   set condicion = 'new'
 where condicion is null and tipo = 'market';
