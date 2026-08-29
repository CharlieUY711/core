-- ===========================================================================
-- Corrección: la taxonomía no estaba vacía, estaba desactivada
-- ===========================================================================
--
-- La migración anterior partió de una lectura equivocada. `select count(*)
-- from departamentos where activo` daba 0 y se leyó como "no hay
-- departamentos". Lo que había eran 31, todos con `activo = false` — un árbol
-- completo, con sus categorías, cargado el 2026-08-25 y desactivado.
--
-- Al sembrar "los que no existan por nombre" se crearon duplicados con nombres
-- casi iguales: "Celulares y Teléfonos" al lado de "Celulares y Telefonía",
-- "Electrodomésticos" al lado de "Electrodomésticos y Aires Acondicionados".
-- Dos departamentos que son el mismo departamento es peor que ninguno: los
-- artículos se reparten entre los dos y ninguna lista queda completa.
--
-- Esta migración deshace eso y hace lo que correspondía desde el principio:
-- activar el árbol que ya estaba.
--
-- QUÉ SE ACTIVA
-- Todo. Cuáles vende la tienda es una decisión de la tienda, no mía: es más
-- fácil desactivar tres que descubrir que falta uno. Se desactivan desde la
-- misma tabla cuando se sepa.
-- ===========================================================================

begin;

-- Primero las categorías de los departamentos duplicados, después ellos.
delete from categorias c
 using departamentos d
 where c.departamento_id = d.id
   and d.created_at::date = date '2026-08-29';

delete from departamentos
 where created_at::date = date '2026-08-29';

-- El árbol que ya estaba, en pie.
update departamentos set activo = true where activo is distinct from true;
update categorias    set activo = true where activo is distinct from true;
update subcategorias set activo = true where activo is distinct from true;

commit;
