-- ===========================================================================
-- La Biblioteca es del vendedor, no de la persona
-- ===========================================================================
--
-- Ver docs/architecture/vendedor.md.
--
-- LO QUE PASABA
-- `media_library` guardaba `user_id` y nada mas. Los archivos eran de QUIEN LOS
-- SUBIO, asi que dos operadores del mismo vendedor no compartian las fotos de
-- los articulos de ese vendedor: cada uno veia las suyas, y las del articulo
-- que el otro cargo no aparecian en ninguna parte.
--
-- Las fichas de articulo (`catalogo_market`) ya son del vendedor. Los archivos
-- no lo eran, asi que "la Biblioteca" eran en realidad dos cosas con dueños
-- distintos pegadas en la misma pantalla.
--
-- EL MOMENTO
-- `media_library` tiene CERO filas hoy. Este cambio es gratis ahora y caro
-- despues: con archivos cargados habria que decidir a que vendedor va cada uno
-- y aceptar que alguien deje de ver lo que veia.
--
-- `user_id` SE QUEDA
-- No es redundante: dice QUIEN subio el archivo, que es rastro util y una
-- pregunta distinta de a quien pertenece. Deja de gobernar quien lo ve.
--
-- EL DEFAULT NO ES COMODIDAD
-- `tenant_id` se llena desde el claim del token, en la base. Si dependiera de
-- que cada pantalla se acuerde de mandarlo, alcanzaria con que una no lo haga
-- para que un archivo quede sin vendedor -invisible para todos, ocupando
-- lugar-. Hoy insertan dos pantallas; manana, cualquiera.
-- ===========================================================================

begin;

alter table public.media_library
  add column if not exists tenant_id uuid references public.stores(id);

comment on column public.media_library.tenant_id is
  'El vendedor dueño del archivo. Lo llena el default desde el claim store_id: ninguna pantalla tiene que acordarse.';
comment on column public.media_library.user_id is
  'Quién lo subió. Es rastro, no permiso: quién lo ve lo decide tenant_id.';

-- Los que ya estaban: al vendedor por defecto de quien los subio. Hoy son cero,
-- y la sentencia queda igual para que la migracion sea correcta en cualquier
-- base donde se aplique, no solo en esta.
update public.media_library m
   set tenant_id = (
     select sm.store_id from public.store_members sm
      where sm.user_id = m.user_id
      order by sm.is_default desc, sm.created_at asc
      limit 1)
 where m.tenant_id is null;

alter table public.media_library
  alter column tenant_id set default ((auth.jwt() ->> 'store_id')::uuid);

create index if not exists media_library_tenant on public.media_library (tenant_id);

-- ---------------------------------------------------------------------------
-- Quien lo ve
-- ---------------------------------------------------------------------------
-- Habia OCHO politicas para cuatro operaciones: dos juegos completos,
-- `*_own_media` y `ml_*_own`, que decian exactamente lo mismo con distinto
-- nombre. Se van las ocho y quedan cuatro.
drop policy if exists select_own_media on public.media_library;
drop policy if exists insert_own_media on public.media_library;
drop policy if exists update_own_media on public.media_library;
drop policy if exists delete_own_media on public.media_library;
drop policy if exists ml_select_own    on public.media_library;
drop policy if exists ml_insert_own    on public.media_library;
drop policy if exists ml_update_own    on public.media_library;
drop policy if exists ml_delete_own    on public.media_library;

create policy media_del_vendedor_lee on public.media_library
  for select using (tenant_id = ((auth.jwt() ->> 'store_id')::uuid));

-- Al insertar se exige que sea el vendedor activo Y que el rastro diga la
-- verdad: sin lo segundo se podria subir algo a nombre de otro.
create policy media_del_vendedor_inserta on public.media_library
  for insert with check (
    tenant_id = ((auth.jwt() ->> 'store_id')::uuid)
    and user_id = auth.uid());

create policy media_del_vendedor_actualiza on public.media_library
  for update using (tenant_id = ((auth.jwt() ->> 'store_id')::uuid))
          with check (tenant_id = ((auth.jwt() ->> 'store_id')::uuid));

create policy media_del_vendedor_borra on public.media_library
  for delete using (tenant_id = ((auth.jwt() ->> 'store_id')::uuid));

-- ---------------------------------------------------------------------------
-- Y el archivo, no solo la fila
-- ---------------------------------------------------------------------------
-- Borrar en la Biblioteca borra las dos cosas: el objeto del bucket y la fila.
-- Las politicas del bucket permitian borrar solo dentro de la carpeta propia
-- -`<user_id>/...`-, asi que un companero de vendedor iba a poder borrar la
-- fila y NO el archivo: el objeto quedaba huerfano, ocupando lugar, sin nada
-- que lo muestre y sin que nadie se entere.
--
-- Se agrega el permiso por vendedor. Las de la carpeta propia se quedan: un
-- archivo subido antes de tener fila sigue siendo borrable por quien lo subio.
drop policy if exists "el vendedor borra sus archivos" on storage.objects;
create policy "el vendedor borra sus archivos" on storage.objects
  for delete using (
    bucket_id in ('biblioteca', 'videos')
    and exists (
      select 1 from public.media_library m
       where m.bucket = storage.objects.bucket_id
         and m.path   = storage.objects.name
         and m.tenant_id = ((auth.jwt() ->> 'store_id')::uuid)));

commit;
