-- ===========================================================================
-- Sacar las funciones que quedaron apuntando al modelo viejo
-- ===========================================================================
--
-- Al reorganizar el catalogo quedaron conviviendo dos versiones de la misma
-- funcion. Postgres las admite como sobrecargas, pero eso no las vuelve
-- inofensivas: PostgREST resuelve por nombre de parametro, asi que una llamada
-- con la firma vieja entra en la funcion vieja y falla contra tablas que ya no
-- existen. Un error asi no dice "esta funcion quedo obsoleta", dice "relation
-- catalog_prices does not exist", y encontrarlo cuesta.
-- ===========================================================================

begin;

-- --- actualizar_publicacion: dos firmas -----------------------------------
-- La nueva suma p_tipo y trabaja sobre catalog_producto_base / catalog_variante.
-- La vieja escribia en catalog_prices y catalog_items. Se saca la vieja: quien
-- llame sin p_tipo va a caer en la nueva, que tiene ese parametro con default.
drop function if exists public.actualizar_publicacion(
  uuid, text, text, text, numeric, text, text, integer
);

-- --- fijar_precio_canal ---------------------------------------------------
-- Escribia el override de precio por canal en catalog_prices. Esa tabla ya no
-- existe: en el modelo nuevo el precio es una columna de la variante y hay uno
-- solo.
--
-- Se saca en vez de dejarla fallando. Pero conviene decir que se pierde una
-- capacidad, no un detalle: vender al mismo precio en un marketplace que en la
-- tienda propia rara vez conviene, porque las comisiones no son las mismas.
-- Recuperarlo es agregarle a catalog_canal_listing un precio propio que, cuando
-- este cargado, le gane al de la variante. Queda como decision a tomar.
drop function if exists public.fijar_precio_canal(uuid, text, numeric, text);

commit;
