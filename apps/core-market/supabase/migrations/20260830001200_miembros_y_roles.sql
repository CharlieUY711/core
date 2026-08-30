-- Miembros y roles de una tienda.
--
-- HOY UNA TIENDA TIENE UNA SOLA PERSONA, y no por diseño: la pantalla deja
-- cambiar "el dueño" y nada más. Un comercio con dos personas —quien atiende y
-- quien factura— no se puede armar.
--
-- Y todas las personas pueden todo, porque no hay ningún rol: `store_members`
-- guarda quién entra, no qué puede hacer.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- QUÉ MANDA, Y QUÉ NO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- El acceso lo da `store_members`: es lo que lee `custom_access_token_hook`
-- para poner `store_id` en el token. `stores.owner_id` NO da acceso —está
-- documentado así desde `20260829001000`— y queda como lo que es: quién figura
-- como titular.
--
-- Los roles van entonces en `store_members`, que es donde vive el acceso.
-- Ponerlos en `stores` sería tener el permiso separado de lo que lo otorga.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- TRES ROLES, NI UNO MÁS
-- ═══════════════════════════════════════════════════════════════════════════
--
--   DUEÑO          Manda. Agrega y saca personas, y es el único que puede
--                  sacar a otro dueño.
--   ADMINISTRADOR  Configura la tienda y publica. No toca quién entra.
--   OPERADOR       El día a día: carga artículos, atiende pedidos. No cambia
--                  la configuración ni las credenciales.
--
-- Tres, porque son las tres cosas distintas que alguien hace en un comercio.
-- Con dos, el que atiende termina pudiendo cambiar las claves de cobro; con
-- cinco, nadie sabe cuál darle a quién y todos terminan siendo dueños.
--
-- SIEMPRE TIENE QUE QUEDAR UN DUEÑO. Sin eso, una tienda puede quedarse sin
-- nadie que pueda dar de alta a nadie: viva, con gente adentro, y sin forma de
-- arreglarla desde el panel.

alter table public.store_members
  add column if not exists rol text not null default 'operador';

alter table public.store_members
  drop constraint if exists store_members_rol_check;
alter table public.store_members
  add constraint store_members_rol_check
  check (rol in ('duenio', 'administrador', 'operador'));

comment on column public.store_members.rol is
  'duenio: manda y administra miembros. administrador: configura y publica. '
  'operador: el día a día. El acceso lo da la fila; el rol dice hasta dónde.';

-- Quien figura como titular es dueño. Es lo que ya era de hecho: hasta ahora
-- toda persona con acceso podía todo.
update public.store_members sm
   set rol = 'duenio'
  from public.stores s
 where s.id = sm.store_id
   and s.owner_id = sm.user_id
   and sm.rol = 'operador';

-- Una tienda sin ningún dueño no se puede administrar. Si alguna quedó así
-- -porque su titular no era miembro-, el miembro más viejo pasa a dueño: es
-- quien estuvo desde el principio.
update public.store_members sm
   set rol = 'duenio'
 where sm.id in (
   select distinct on (m.store_id) m.id
     from public.store_members m
    where not exists (
      select 1 from public.store_members d
       where d.store_id = m.store_id and d.rol = 'duenio')
    order by m.store_id, m.created_at
 );

-- ── Quién puede tocar los miembros ─────────────────────────────────────
--
-- Una sola definición, para que las tres funciones no puedan discrepar. La
-- plataforma también, porque es quien crea las tiendas y tiene que poder
-- arreglar una que quedó sin dueño accesible.
create or replace function public.puede_administrar_miembros(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select soy_la_plataforma() or exists (
    select 1 from store_members m
     where m.store_id = p_store_id
       and m.user_id = auth.uid()
       and m.rol = 'duenio');
$$;

-- ── Ver quiénes son ────────────────────────────────────────────────────
create or replace function public.miembros_de_tienda(p_store_id uuid)
returns table (user_id uuid, correo text, rol text, es_predeterminada boolean, desde timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Sólo quien pertenece a esa tienda, o la plataforma. Ver quiénes trabajan en
  -- un comercio ajeno no es asunto de nadie.
  if not (soy_la_plataforma() or exists (
        select 1 from store_members m
         where m.store_id = p_store_id and m.user_id = auth.uid())) then
    raise exception 'No pertenecés a esa tienda.' using errcode = '42501';
  end if;

  return query
    select m.user_id, u.email::text, m.rol, m.is_default, m.created_at
      from store_members m
      join auth.users u on u.id = m.user_id
     where m.store_id = p_store_id
     order by (m.rol = 'duenio') desc, u.email;
end;
$$;

-- ── Agregar a alguien ──────────────────────────────────────────────────
create or replace function public.agregar_miembro(
  p_store_id uuid, p_correo text, p_rol text default 'operador'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if not puede_administrar_miembros(p_store_id) then
    raise exception 'Sólo el dueño de la tienda agrega personas.' using errcode = '42501';
  end if;

  if p_rol not in ('duenio', 'administrador', 'operador') then
    raise exception 'Rol desconocido: %', p_rol using errcode = '22023';
  end if;

  -- Tiene que ser alguien que YA existe: agregar por correo a quien no tiene
  -- cuenta crearía un miembro que nunca va a poder entrar.
  select id into v_user from auth.users where lower(email) = lower(trim(p_correo));
  if v_user is null then
    raise exception 'No hay ninguna cuenta con el correo %. Tiene que registrarse primero.', p_correo
      using errcode = 'P0002';
  end if;

  insert into store_members (store_id, user_id, rol, is_default)
  values (p_store_id, v_user, p_rol, false)
  on conflict (store_id, user_id) do update set rol = excluded.rol;
end;
$$;

-- ── Cambiarle el rol ───────────────────────────────────────────────────
create or replace function public.cambiar_rol_miembro(
  p_store_id uuid, p_user_id uuid, p_rol text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not puede_administrar_miembros(p_store_id) then
    raise exception 'Sólo el dueño de la tienda cambia roles.' using errcode = '42501';
  end if;

  if p_rol not in ('duenio', 'administrador', 'operador') then
    raise exception 'Rol desconocido: %', p_rol using errcode = '22023';
  end if;

  update store_members set rol = p_rol
   where store_id = p_store_id and user_id = p_user_id;

  -- Se revisa DESPUÉS de escribir y adentro de la misma transacción: así el
  -- control ve el resultado real y no una simulación de lo que iba a pasar.
  if not exists (select 1 from store_members
                  where store_id = p_store_id and rol = 'duenio') then
    raise exception 'La tienda quedaría sin dueño: nadie podría volver a dar de alta a nadie.'
      using errcode = '23514';
  end if;
end;
$$;

-- ── Sacar a alguien ────────────────────────────────────────────────────
create or replace function public.sacar_miembro(p_store_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not puede_administrar_miembros(p_store_id) then
    raise exception 'Sólo el dueño de la tienda saca personas.' using errcode = '42501';
  end if;

  delete from store_members
   where store_id = p_store_id and user_id = p_user_id;

  if not exists (select 1 from store_members
                  where store_id = p_store_id and rol = 'duenio') then
    raise exception 'Es el último dueño: la tienda quedaría sin nadie que pueda administrarla.'
      using errcode = '23514';
  end if;
end;
$$;

grant execute on function public.miembros_de_tienda(uuid)                 to authenticated;
grant execute on function public.agregar_miembro(uuid, text, text)        to authenticated;
grant execute on function public.cambiar_rol_miembro(uuid, uuid, text)    to authenticated;
grant execute on function public.sacar_miembro(uuid, uuid)                to authenticated;
grant execute on function public.puede_administrar_miembros(uuid)         to authenticated;

revoke execute on function public.miembros_de_tienda(uuid)              from public, anon;
revoke execute on function public.agregar_miembro(uuid, text, text)     from public, anon;
revoke execute on function public.cambiar_rol_miembro(uuid, uuid, text) from public, anon;
revoke execute on function public.sacar_miembro(uuid, uuid)             from public, anon;
revoke execute on function public.puede_administrar_miembros(uuid)      from public, anon;
