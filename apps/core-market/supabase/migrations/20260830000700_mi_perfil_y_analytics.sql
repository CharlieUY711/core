-- Mi perfil entra al catálogo. Analytics se apaga porque no existe.
--
-- MI PERFIL
-- Es una funcionalidad como cualquier otra —una pantalla con una ruta,
-- `/admin/profile`— y no estaba en el catálogo, así que no aparecía en
-- "Herramientas y Apps" ni se podía configurar desde ningún lado.
--
-- `en_sidebar = false` a propósito: el perfil se abre con el lápiz de la ficha
-- de arriba a la izquierda, no desde el menú. Ponerlo en el menú sería tenerlo
-- en dos lugares.
--
-- ANALYTICS PROMETÍA UNA PANTALLA QUE NO EXISTE
-- Figuraba activa, con ruta `/admin/analytics` declarada en el código, y esa
-- ruta NO ESTÁ en el router: no hay ningún `AdminAnalytics`. Abrirla llevaba a
-- una pantalla en blanco.
--
-- Se apaga en vez de borrarse: la fila guarda que la funcionalidad está
-- prevista, y el día que exista la pantalla se prende y listo. Borrarla sería
-- perder esa decisión. Apagada sigue estando a la vista en el configurador, que
-- es donde tiene que estar algo que falta.

insert into public.plataforma_apps
  (codigo, tipo, nombre, icono, para, orden, activa, en_sidebar, vault_platform)
values
  ('perfil', 'funcionalidad', 'Mi perfil', '👤',
   'Los datos de la persona: documento, direcciones, contacto y preferencias.',
   80, true, false, null)
on conflict (codigo) do update
   set tipo   = excluded.tipo,
       nombre = excluded.nombre,
       icono  = excluded.icono,
       para   = excluded.para;

update public.plataforma_apps
   set activa = false,
       para   = 'Qué se ve, qué se vende y de dónde viene. Todavía no existe la pantalla.'
 where codigo = 'analytics';
