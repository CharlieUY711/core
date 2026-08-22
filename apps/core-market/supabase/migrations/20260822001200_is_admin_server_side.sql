-- ============================================================================
-- F-1: mover la autorizacion de admin a una fuente server-side
-- ============================================================================
-- PROBLEMA
-- is_admin() es SECURITY DEFINER y decidia asi:
--
--     select 1 from auth.users
--      where id = auth.uid() and raw_user_meta_data ->> 'role' = 'admin'
--
-- raw_user_meta_data es la metadata que el propio usuario escribe con
-- supabase.auth.updateUser({ data: ... }), llamada que esta app ya hace desde
-- el navegador en dos pantallas. Cualquiera con sesion podia otorgarse admin y
-- pasar los ~14 guardas `if not is_admin() then raise 'Acceso denegado'`, mas
-- la policy catalog_nodes_admin_write.
--
-- POR QUE NO ALCANZA CON MOVERLO A profiles.role
-- La policy `profiles_update_own` permite UPDATE sobre la fila propia sin
-- restringir columnas. Mover el rol ahi y no tocar nada mas seria mudar el
-- agujero de lugar: el usuario cambiaria profiles.role en vez de la metadata.
-- Por eso ademas se protege la columna con un trigger.
--
-- ORDEN
-- Primero se puebla profiles y se marca al duenio como admin; recien despues
-- se reemplaza is_admin(). Al reves, la funcion nueva leeria una tabla vacia y
-- dejaria a todos afuera del panel. Va todo en una transaccion.
-- ============================================================================

begin;

-- ── 1. Backfill: profiles esta vacia y hay usuarios existentes ──────────────
-- handle_new_user() cubre los altas nuevas, pero los usuarios creados antes
-- de que existiera ese trigger no tienen fila.
insert into public.profiles (id, email, role)
select u.id, u.email, 'buyer'::public.app_role
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id)
   and u.email is not null;

-- ── 2. El duenio pasa a admin ───────────────────────────────────────────────
update public.profiles
   set role = 'admin'::public.app_role, updated_at = now()
 where email = 'cvaralla@gmail.com';

do $$
begin
  if not exists (select 1 from public.profiles where role in ('admin','superadmin')) then
    raise exception 'Ningun profile quedo como admin. Se aborta para no perder el acceso al panel.';
  end if;
end $$;

-- ── 3. Proteger la columna role ─────────────────────────────────────────────
-- RLS no puede restringir por columna, asi que va por trigger: se permite el
-- cambio server-side (auth.uid() nulo: service_role o migracion) o hecho por
-- alguien que ya es admin. Nadie puede promoverse a si mismo.
create or replace function public.profiles_protect_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is null then
      return new;
    end if;
    if exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role in ('admin','superadmin')
    ) then
      return new;
    end if;
    raise exception 'No se puede modificar el rol' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_role on public.profiles;
create trigger trg_profiles_protect_role
  before update on public.profiles
  for each row execute function public.profiles_protect_role();

-- ── 4. Recien ahora, is_admin() lee la fuente server-side ───────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid()
       and role in ('admin'::public.app_role, 'superadmin'::public.app_role)
  );
$$;

comment on function public.is_admin() is
  'Autorizacion de admin desde profiles.role, columna server-side protegida por '
  'trg_profiles_protect_role. Antes leia raw_user_meta_data, que el propio '
  'usuario puede escribir.';

commit;

-- ── Verificacion ────────────────────────────────────────────────────────────
select email, role from public.profiles order by role, email;
