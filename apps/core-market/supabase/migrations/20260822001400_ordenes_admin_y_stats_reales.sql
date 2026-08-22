-- ===========================================================================
-- El dashboard contaba una orden que la lista de ordenes no podia mostrar
-- ===========================================================================
--
-- Sintoma: "Ordenes totales 1 / pendientes 1" en el dashboard, y "Sin ordenes"
-- en Mis ordenes.
--
-- Dos causas, las dos reales:
--
-- 1. `admin_stats` es una vista SIN security_invoker, asi que corre con los
--    permisos de su dueño y saltea RLS por completo. Contaba TODAS las ordenes
--    de TODOS los usuarios. Ademas de la inconsistencia, es una filtracion:
--    un agregado sobre filas que quien consulta no tiene derecho a ver.
--
-- 2. La unica politica de lectura sobre `ordenes` es user_id = auth.uid(). Las
--    compras de invitados quedan con user_id NULL -el carrito funciona sin
--    login a proposito-, asi que NADIE puede verlas: ni el comprador, que no
--    tiene sesion, ni el dueño de la tienda. Una orden invisible para el
--    vendedor no sirve de nada.
--
-- Se arreglan las dos por el mismo lado: que las dos vistas pasen por RLS, y
-- que RLS diga lo correcto. Asi el numero del dashboard y la lista no pueden
-- volver a divergir, porque miran lo mismo con las mismas reglas.
--
-- De paso, las metricas de productos apuntaban a productos_market y
-- productos_secondhand, que son las tablas viejas. El catalogo real es
-- catalog_*: "Productos activos" iba a decir 0 para siempre.
-- ===========================================================================

-- --- 1. El admin ve las ordenes de la tienda ------------------------------
-- is_admin() ya es server-side y no depende de nada que el cliente pueda
-- manipular.
drop policy if exists "ordenes_select_admin" on public.ordenes;
create policy "ordenes_select_admin" on public.ordenes
  for select to authenticated
  using (public.is_admin());

drop policy if exists "order_items_select_admin" on public.order_items;
create policy "order_items_select_admin" on public.order_items
  for select to authenticated
  using (public.is_admin());

-- --- 2. Las metricas, contra el catalogo real y respetando RLS ------------
create or replace view public.admin_stats
with (security_invoker = true) as
select
  -- Ordenes: mismas filas que ve la lista, porque ahora la vista tambien
  -- pasa por las politicas de `ordenes`.
  count(*)                                                        as total_orders,
  coalesce(sum(case when o.moneda = 'USD' then o.total_usd else o.total_uyu end)
           filter (where o.estado = 'pagado'), 0::numeric)         as revenue_total,
  coalesce(sum(o.total_uyu) filter (where o.estado = 'pagado'), 0::numeric) as revenue_uyu,
  coalesce(sum(o.total_usd) filter (where o.estado = 'pagado'), 0::numeric) as revenue_usd,
  count(*) filter (where o.estado = 'pagado')                      as paid_orders,
  count(*) filter (where o.estado = 'pendiente')                   as pending_orders,

  -- Productos: variantes activas de items activos.
  (select count(*)
     from public.catalog_variants v
     join public.catalog_items i on i.id = v.item_id
    where v.status = 'active' and i.status = 'active')             as active_products,

  -- Sin stock: variante activa sin unidades disponibles, contando tambien las
  -- que no tienen fila de inventario -no tener inventario es no tener stock-.
  (select count(*)
     from public.catalog_variants v
     join public.catalog_items i on i.id = v.item_id
     left join lateral (
       select coalesce(sum(ci.available), 0) as disp
         from public.catalog_inventory ci
        where ci.variant_id = v.id
     ) inv on true
    where v.status = 'active' and i.status = 'active'
      and coalesce(inv.disp, 0) <= 0)                              as out_of_stock,

  (select count(*)
     from public.catalog_listings l
    where l.channel = 'mercadolibre' and l.status = 'active')      as ml_active,

  (select count(*)
     from public.catalog_listings l
    where l.channel = 'mercadolibre' and l.status = 'error')       as ml_sync_errors,

  -- Se conserva la columna para no romper a quien la lea; el catalogo de
  -- usados no se migro a catalog_*.
  (select count(*)
     from public.productos_secondhand p
    where p.status = 'active')                                     as sh_active_products
from public.ordenes o;

comment on view public.admin_stats is
  'Metricas del panel. security_invoker: cuenta solo lo que quien consulta puede ver, para que el dashboard y las listas no puedan divergir.';

grant select on public.admin_stats to authenticated;
