-- ===========================================================================
-- `catalog_precio` se aísla por tienda, como su tabla hermana
-- ===========================================================================
--
-- DOS ERRORES DE LA MIGRACIÓN ANTERIOR
--
-- 1. La tabla quedó con una sola policy, de SELECT. Sin INSERT ni DELETE,
--    `guardar_lineas_de_precio` —que corre como invoker— no podía escribir
--    nada: borraba cero filas e insertaba cero, en silencio.
--
-- 2. Y esa policy era `using (true)` para `anon`. O sea que cualquiera podía
--    leer las líneas de precio de TODAS las tiendas, con sus etiquetas de
--    campaña incluidas. Eso es una filtración, no una comodidad.
--
-- No hacía falta ninguna de las dos cosas: la vidriera no lee esta tabla
-- directo, lee `precio_de_canal`, que es SECURITY DEFINER y por lo tanto pasa
-- por encima de RLS. Abrirla "para que la tienda pueda leer" resolvía un
-- problema que no existía y creaba uno que sí.
--
-- Se copia la policy de `catalog_canal_listing`, que es la tabla hermana y
-- resuelve exactamente lo mismo: una fila es de la tienda dueña del producto
-- base del que cuelga la variante.
-- ===========================================================================

begin;

drop policy if exists catalog_precio_lectura on catalog_precio;

create policy catalog_precio_tenant_isolation
  on catalog_precio for all
  using (
    variante_id in (
      select v.id
        from catalog_variante v
        join catalog_producto_base b on b.id = v.producto_base_id
       where b.tenant_id = ((auth.jwt() ->> 'store_id')::uuid)
    )
  )
  with check (
    variante_id in (
      select v.id
        from catalog_variante v
        join catalog_producto_base b on b.id = v.producto_base_id
       where b.tenant_id = ((auth.jwt() ->> 'store_id')::uuid)
    )
  );

comment on table catalog_precio is
  'Lineas de precio: un precio, a que destinos aplica y cuando rige. Aislada por tienda igual que catalog_canal_listing. La vidriera no la lee directo: lee precio_de_canal, que es SECURITY DEFINER.';

commit;
