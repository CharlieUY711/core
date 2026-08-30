-- Meta —Instagram, Facebook, WhatsApp— entra al catálogo como APP.
--
-- POR QUÉ "APP" Y NO "HERRAMIENTA"
-- Porque del otro lado hay una CUENTA tuya: una página de Facebook, un perfil
-- de Instagram Business, un número de WhatsApp Business. Una herramienta es un
-- servicio con clave que trabaja adentro de otra pantalla —el tipo de cambio,
-- la búsqueda web—; acá vas a una pantalla y administrás tus cuentas.
--
-- ESTAR INSTALADA NO ES ESTAR CONECTADA, y por eso importa el `vault_platform`:
-- el catálogo cruza la fila contra las credenciales del Vault para decir si
-- está cargada. Se apunta a 'Instagram' porque es una sola fila para tres
-- plataformas y hay que elegir una; las otras dos se ven en la pantalla, que
-- muestra "configuradas" y "conectadas" por separado.
--
-- QUEDA APAGADA (`activa = false`)
-- El código nunca corrió: vivía en `packages/core-meta` sin `package.json`, con
-- un import a una ruta que no existe. Compila y está montado, pero nadie lo
-- probó contra una cuenta real. Se prende desde el configurador de CORE Market
-- cuando alguien lo haya probado de verdad.

insert into public.plataforma_apps
  (codigo, tipo, nombre, icono, para, orden, activa, en_sidebar, vault_platform)
values
  ('meta', 'app', 'Meta', '📣',
   'Instagram, Facebook y WhatsApp en una pantalla: ver cuentas, publicar y avisar.',
   60, false, false, 'Instagram')
on conflict (codigo) do update
   set tipo           = excluded.tipo,
       nombre         = excluded.nombre,
       icono          = excluded.icono,
       para           = excluded.para,
       vault_platform = excluded.vault_platform;
