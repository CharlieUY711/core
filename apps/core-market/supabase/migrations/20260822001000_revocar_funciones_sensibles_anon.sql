-- ============================================================================
-- Revocar de `anon` funciones SECURITY DEFINER sensibles
-- ============================================================================
-- HALLAZGO
-- Diez funciones SECURITY DEFINER estaban otorgadas al rol `anon`. SECURITY
-- DEFINER significa que se ejecutan con los privilegios del dueno e ignoran
-- RLS: cualquiera con la anon key -que es publica por diseno- podia invocarlas.
--
-- Las dos mas graves:
--   get_mp_token / get_ml_token  -> devuelven credenciales de MercadoPago y
--                                   MercadoLibre.
--   confirmar_pago               -> marca una orden como pagada. Con un
--                                   order_id, se obtiene un pedido confirmado
--                                   sin pagarlo.
--
-- No se explotaron para verificarlo: la combinacion SECURITY DEFINER + GRANT
-- TO anon es concluyente por si misma en el DDL.
--
-- CRITERIO
-- Se revoca de `anon` en todos los casos. `authenticated` se conserva solo
-- donde el panel de administracion las llama hoy, para no romperlo; esas
-- quedan registradas como deuda, porque un usuario autenticado cualquiera no
-- deberia poder ejecutar operaciones de admin. Cerrar eso depende de F-1
-- (is_admin confia en metadata que el usuario escribe).
--
-- Los webhooks y las edge functions no se ven afectados: usan SERVICE_ROLE,
-- cuyo grant se mantiene intacto.
-- ============================================================================

begin;

-- ── Sin ningun llamador en el repositorio: se cierran a anon y authenticated ──
revoke all on function public.confirmar_pago(uuid, text, jsonb)      from anon, authenticated;
revoke all on function public.get_mp_token(text)                     from anon, authenticated;
revoke all on function public.get_ml_token(text)                     from anon, authenticated;
revoke all on function public.update_order_status(uuid, text)        from anon, authenticated;
revoke all on function public.reconcile_stock()                      from anon, authenticated;

-- ── Llamadas desde el panel con sesion: se cierra solo anon ──
revoke all on function public.admin_update_product(uuid, text, numeric, integer, text)      from anon;
revoke all on function public.admin_publish_ml(uuid)                 from anon;
revoke all on function public.admin_fix_stock(uuid, integer, text)         from anon;

commit;

-- ── Verificacion ────────────────────────────────────────────────────────────
-- Ninguna de las cinco primeras debe seguir figurando para anon ni authenticated.
select p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') as service_role
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('confirmar_pago','get_mp_token','get_ml_token',
                     'update_order_status','reconcile_stock',
                     'admin_update_product','admin_publish_ml','admin_fix_stock')
 order by p.proname;
