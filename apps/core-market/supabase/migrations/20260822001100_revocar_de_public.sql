-- ============================================================================
-- Revocar tambien de PUBLIC: sin esto la revocacion anterior no surtio efecto
-- ============================================================================
-- La migracion 20260822001000 revoco estas funciones de `anon` y
-- `authenticated`, pero al verificarlo contra produccion seguian ejecutandose
-- con la anon key.
--
-- Causa: en PostgreSQL, CREATE FUNCTION otorga EXECUTE a PUBLIC por defecto.
-- `anon` es miembro de PUBLIC, asi que conserva el privilegio aunque se le
-- revoque de forma directa. Hay que revocar de PUBLIC.
--
-- service_role no se ve afectado: tiene un GRANT explicito, que sobrevive a
-- la revocacion de PUBLIC. Los webhooks y las edge functions siguen andando.
--
-- Las tres admin_* conservan `authenticated` a proposito: hoy las llama el
-- panel. Que un usuario autenticado cualquiera pueda ejecutarlas sigue siendo
-- deuda, y depende de F-1 para cerrarse bien.
-- ============================================================================

begin;

revoke all on function public.confirmar_pago(uuid, text, jsonb)   from public;
revoke all on function public.get_mp_token(text)                  from public;
revoke all on function public.get_ml_token(text)                  from public;
revoke all on function public.update_order_status(uuid, text)     from public;
revoke all on function public.reconcile_stock()                   from public;
revoke all on function public.descontar_stock(uuid, integer)      from public, anon;
revoke all on function public.crear_orden(uuid, jsonb) from public, anon;

revoke all on function public.admin_update_product(uuid, text, numeric, integer, text) from public;
revoke all on function public.admin_publish_ml(uuid)              from public;
revoke all on function public.admin_fix_stock(uuid, integer, text) from public;

-- Se re-otorga a authenticated lo que el panel necesita, porque revocar de
-- PUBLIC tambien se lo quita.
grant execute on function public.admin_update_product(uuid, text, numeric, integer, text) to authenticated;
grant execute on function public.admin_publish_ml(uuid)                                   to authenticated;
grant execute on function public.admin_fix_stock(uuid, integer, text)                     to authenticated;

commit;
