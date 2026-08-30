-- ===========================================================================
-- Revocar de PUBLIC, no de los roles
-- ===========================================================================
--
-- EL ERROR
-- La migración 000200 hizo esto para cerrar el catálogo compartido:
--
--   revoke execute on function guardar_catalogo_market(...) from anon;
--   revoke execute on function guardar_catalogo_market(...) from authenticated;
--
-- Y no cerró nada. Postgres concede `EXECUTE` a **PUBLIC** por defecto en toda
-- función nueva, y `anon` y `authenticated` heredan de PUBLIC. Revocarles el
-- permiso directo no les quita el que reciben por herencia: siguen pudiendo
-- ejecutarla.
--
-- Se ve en `information_schema.routine_privileges`, que después del revoke
-- seguía listando `PUBLIC: EXECUTE`. El revoke corrió sin error — simplemente
-- quitó algo que no era lo que daba el acceso.
--
-- LA FORMA CORRECTA
-- Revocar de PUBLIC primero, y recién después conceder a quien corresponda.
-- Es la única manera de que una función quede realmente cerrada.
--
-- POR QUÉ IMPORTA ACÁ
-- `guardar_catalogo_market` escribe el catálogo que ven TODAS las tiendas y no
-- tiene ninguna verificación de quién llama: no mira la sesión, no mira el
-- tenant. Con `anon` pudiendo ejecutarla, cualquiera en internet podía
-- escribir en el catálogo compartido sin siquiera iniciar sesión.
--
-- Se aprovecha el paso para hacer lo mismo con las demás funciones que tocan
-- datos de una tienda. Esas sí verifican la sesión —abortan sin `store_id`—
-- así que el riesgo era menor, pero depender de un chequeo adentro cuando la
-- puerta puede estar cerrada es dejar la puerta abierta por costumbre.
-- ===========================================================================

begin;

-- El catálogo compartido: sólo la plataforma.
revoke execute on function public.guardar_catalogo_market(text, text, jsonb) from public;
grant  execute on function public.guardar_catalogo_market(text, text, jsonb) to service_role;

-- Lo que es de una tienda: hace falta una sesión con tienda.
revoke execute on function public.guardar_fichas_biblioteca(text, text, jsonb) from public;
grant  execute on function public.guardar_fichas_biblioteca(text, text, jsonb) to authenticated;

revoke execute on function public.guardar_ficha_biblioteca(text, text, text, text, text) from public;
grant  execute on function public.guardar_ficha_biblioteca(text, text, text, text, text) to authenticated;

revoke execute on function public.actualizar_ficha_biblioteca(uuid, text, text, text, text, text[]) from public;
grant  execute on function public.actualizar_ficha_biblioteca(uuid, text, text, text, text, text[]) to authenticated;

revoke execute on function public.eliminar_ficha_biblioteca(uuid) from public;
grant  execute on function public.eliminar_ficha_biblioteca(uuid) to authenticated;

revoke execute on function public.eliminar_publicacion(uuid[]) from public;
grant  execute on function public.eliminar_publicacion(uuid[]) to authenticated;

revoke execute on function public.ficha_para_publicacion(uuid, text, text, text, text) from public;
grant  execute on function public.ficha_para_publicacion(uuid, text, text, text, text) to authenticated;

commit;
