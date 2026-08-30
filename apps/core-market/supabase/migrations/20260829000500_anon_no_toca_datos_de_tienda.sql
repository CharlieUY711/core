-- ===========================================================================
-- `anon` no toca datos de una tienda
-- ===========================================================================
--
-- Supabase concede EXECUTE a `anon`, `authenticated` y `service_role` en toda
-- función nueva del esquema `public`, por privilegios por defecto. Es un grant
-- DIRECTO, no herencia de PUBLIC: revocar de PUBLIC —lo que hizo 000400— no lo
-- quita.
--
-- Estas funciones abortan sin `store_id` en la sesión, así que `anon` no podía
-- hacer daño. Pero apoyarse en un chequeo de adentro cuando la puerta se puede
-- cerrar es dejarla abierta por costumbre: el día que alguien agregue una
-- función parecida y olvide el chequeo, la puerta ya está abierta y nadie lo
-- va a notar.
-- ===========================================================================

begin;

revoke execute on function public.guardar_fichas_biblioteca(text, text, jsonb)                        from anon;
revoke execute on function public.guardar_ficha_biblioteca(text, text, text, text, text)              from anon;
revoke execute on function public.actualizar_ficha_biblioteca(uuid, text, text, text, text, text[])   from anon;
revoke execute on function public.eliminar_ficha_biblioteca(uuid)                                      from anon;
revoke execute on function public.eliminar_publicacion(uuid[])                                         from anon;
revoke execute on function public.ficha_para_publicacion(uuid, text, text, text, text)                 from anon;

commit;
