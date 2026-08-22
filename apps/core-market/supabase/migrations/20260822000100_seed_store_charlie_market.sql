-- ============================================================================
-- F1 (seed) — Tienda inicial y membresía del dueño
-- ============================================================================
-- Idempotente: se puede correr varias veces sin duplicar.
--
-- Se separa de la migración estructural a propósito: esto es DATO, no esquema.
-- Si mañana hay varias tiendas, esta migración no se toca — se cargan por la
-- UI de administración.
--
-- Después de correr esto hay que CERRAR Y VOLVER A ABRIR SESIÓN: el claim
-- `store_id` se emite al crear el token, así que un token viejo no lo tiene.
-- ============================================================================

begin;

do $$
declare
  v_user_id  uuid;
  v_store_id uuid;
  v_email    text := 'cvaralla@gmail.com';   -- dueño; ajustar si cambia
begin
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    raise exception 'No existe un usuario con email %. Revisar antes de continuar.', v_email;
  end if;

  -- Tienda ------------------------------------------------------------------
  select id into v_store_id from public.stores where codigo = 'charlie-market';

  if v_store_id is null then
    insert into public.stores (codigo, nombre, tipo, owner_id)
    values ('charlie-market', 'Charlie Market', 'market', v_user_id)
    returning id into v_store_id;

    raise notice 'Tienda creada: %', v_store_id;
  else
    update public.stores
       set owner_id   = coalesce(owner_id, v_user_id),
           updated_at = now()
     where id = v_store_id;

    raise notice 'Tienda ya existente: %', v_store_id;
  end if;

  -- Membresía ---------------------------------------------------------------
  insert into public.store_members (store_id, user_id, is_default)
  values (v_store_id, v_user_id, true)
  on conflict (store_id, user_id) do update set is_default = true;

  raise notice 'Membresía lista para % en la tienda %', v_email, v_store_id;
end $$;

commit;

-- ── Verificación ────────────────────────────────────────────────────────────
-- Debe devolver una fila con el email, el nombre de la tienda y is_default = true.
select u.email, s.nombre as tienda, s.codigo, sm.is_default
  from public.store_members sm
  join public.stores s   on s.id = sm.store_id
  join auth.users   u    on u.id = sm.user_id;
