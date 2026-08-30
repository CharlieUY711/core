-- Una credencial por NOMBRE, no una por plataforma.
--
-- SÍNTOMA: "duplicate key value violates unique constraint
-- api_vault_platform_global_uidx" al cargar la clave secreta de Meta, después
-- de haber cargado el identificador.
--
-- CAUSA: había un índice único por (platform) —y otro por (platform, tenant_id)—
-- que permite UNA sola credencial por plataforma. Meta necesita dos: el
-- identificador de la app y su clave. Instagram, Facebook y WhatsApp necesitan
-- tres cada una.
--
-- ESTO NO ERA UN PROBLEMA DEL FORMULARIO
-- El flujo de conexión escribe NUEVE entradas repartidas en cuatro plataformas.
-- Habría fallado en la segunda de Meta, en medio del callback de Facebook, con
-- el usuario mirando una ventana que se cierra. El error salió antes porque
-- alguien cargó dos a mano; si no, aparecía la primera vez que se conectara.
--
-- DE DÓNDE VENÍA
-- De cuando una credencial por plataforma era cierto: Mercado Libre guarda un
-- único JSON con todo adentro. Meta no funciona así —lee entradas sueltas por
-- nombre exacto— y el índice quedó de la etapa anterior.
--
-- LO QUE SÍ HAY QUE IMPEDIR
-- Dos credenciales con el MISMO nombre en la misma plataforma y el mismo dueño:
-- ahí sí no habría forma de saber cuál vale, y quien la lee se queda con la
-- primera que encuentra. El índice pasa a ser por (platform, name, tenant_id).
--
-- Se comprobó antes de tocar nada que hoy no hay ninguna plataforma con más de
-- una credencial: el cambio no rompe nada existente.

drop index if exists public.api_vault_platform_global_uidx;
drop index if exists public.api_vault_platform_tenant_uidx;

-- Las de una tienda: una por (plataforma, nombre) dentro de esa tienda.
create unique index if not exists api_vault_platform_name_tenant_uidx
  on public.api_vault (platform, name, tenant_id)
  where tenant_id is not null;

-- Las globales: `tenant_id is null` no se puede comparar con `=`, así que un
-- índice sobre las tres columnas NO las cubre. Va uno aparte, como estaba.
create unique index if not exists api_vault_platform_name_global_uidx
  on public.api_vault (platform, name)
  where tenant_id is null;
