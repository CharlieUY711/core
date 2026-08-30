-- ===========================================================================
-- Los perfiles son de personas. Una persona administra N tiendas.
-- ===========================================================================
--
-- LO QUE YA ESTABA
-- `store_members` existe desde antes y el hook de access token ya lo usa: al
-- emitir el token elige la tienda marcada por defecto, o la más antigua. O sea
-- que "una persona, varias tiendas" ya estaba modelado. Nadie lo usaba porque
-- hay una sola tienda y una sola persona.
--
-- EL ERROR QUE ESTO ARREGLA
-- `crear_tienda` -de la migración anterior- llenaba `stores.owner_id` y NO
-- creaba la fila en `store_members`. Pero el hook lee `store_members`. La
-- tienda quedaba creada, con dueño anotado, y ese dueño entraba con
-- `store_id: null`: sin ver nada, sin poder publicar, sin ninguna pista de por
-- qué. Dos formas de decir "esta tienda es de esta persona", y la que
-- importaba era la otra.
--
-- Se arregla en el origen: crear una tienda con dueño crea la membresía. Y
-- `owner_id` queda como lo que es —quién figura como titular— mientras que el
-- acceso lo da `store_members`, que es lo que el sistema realmente lee.
--
-- MULTITERRITORIO
-- Una tienda opera en un territorio. Vender en dos países son dos tiendas, con
-- su moneda, sus impuestos y su inscripción fiscal, porque eso es lo que son:
-- dos operaciones distintas. Lo que las une es la persona, que las ve todas y
-- se mueve entre ellas.
--
-- Por eso hace falta cambiar de tienda activa: el token lleva UNA, y hasta
-- ahora no había forma de cambiarla sin tocar la base a mano.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Crear una tienda crea la membresía de su dueño
-- ---------------------------------------------------------------------------
create or replace function public.crear_tienda(
  p_codigo       text,
  p_nombre       text,
  p_owner_email  text default null,
  p_capacidades  text[] default '{}',
  p_vidrieras    text[] default '{}',
  p_moneda_base  text default 'UYU',
  p_pais         text default 'UY'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_id    uuid;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market crea tiendas.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_codigo), '') = '' or coalesce(btrim(p_nombre), '') = '' then
    raise exception 'La tienda necesita código y nombre.' using errcode = '22023';
  end if;
  if exists (select 1 from stores where codigo = btrim(p_codigo)) then
    raise exception 'Ya existe una tienda con el código "%".', btrim(p_codigo)
      using errcode = '23505';
  end if;

  if coalesce(btrim(p_owner_email), '') <> '' then
    select id into v_owner from auth.users where lower(email) = lower(btrim(p_owner_email));
    if v_owner is null then
      raise exception 'No hay ningún usuario con el correo "%". La tienda necesita un dueño que exista.',
        btrim(p_owner_email) using errcode = 'P0002';
    end if;
  end if;

  insert into stores (
    codigo, nombre, tipo, owner_id, is_active, es_plataforma,
    capacidades, vidrieras, moneda_base, pais
  ) values (
    btrim(p_codigo), btrim(p_nombre), null, v_owner, true, false,
    coalesce(p_capacidades, '{}'), coalesce(p_vidrieras, '{}'),
    nullif(btrim(coalesce(p_moneda_base, '')), ''),
    nullif(btrim(coalesce(p_pais, '')), '')
  )
  returning id into v_id;

  -- LO QUE FALTABA. Sin esta fila el hook no le pone `store_id` al token y el
  -- dueño entra sin tienda: ve el panel vacío y no hay nada que se lo explique.
  if v_owner is not null then
    insert into store_members (store_id, user_id, is_default)
    values (v_id, v_owner,
            -- Su primera tienda es la que abre por defecto. Si ya tiene otras,
            -- no se le cambia la que estaba usando.
            not exists (select 1 from store_members m where m.user_id = v_owner))
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cambiar el dueño también cambia quién entra
-- ---------------------------------------------------------------------------
create or replace function public.actualizar_tienda(
  p_id           uuid,
  p_nombre       text default null,
  p_activa       boolean default null,
  p_owner_email  text default null,
  p_capacidades  text[] default null,
  p_vidrieras    text[] default null,
  p_moneda_base  text default null,
  p_pais         text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  s record;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market configura las tiendas.' using errcode = '42501';
  end if;

  select * into s from stores where id = p_id;
  if not found then
    raise exception 'La tienda no existe.' using errcode = 'P0002';
  end if;

  if s.es_plataforma and coalesce(array_length(p_vidrieras, 1), 0) > 0 then
    raise exception 'CORE Market administra la plataforma y no vende: no publica en ninguna vidriera.'
      using errcode = '42501';
  end if;
  if s.es_plataforma and p_activa is false then
    raise exception 'CORE Market no se puede desactivar.' using errcode = '42501';
  end if;

  if coalesce(btrim(p_owner_email), '') <> '' then
    select id into v_owner from auth.users where lower(email) = lower(btrim(p_owner_email));
    if v_owner is null then
      raise exception 'No hay ningún usuario con el correo "%".', btrim(p_owner_email)
        using errcode = 'P0002';
    end if;
  end if;

  update stores set
    nombre      = coalesce(nullif(btrim(p_nombre), ''), nombre),
    is_active   = coalesce(p_activa, is_active),
    owner_id    = coalesce(v_owner, owner_id),
    capacidades = coalesce(p_capacidades, capacidades),
    vidrieras   = coalesce(p_vidrieras, vidrieras),
    moneda_base = case when p_moneda_base is null then moneda_base
                       else nullif(btrim(p_moneda_base), '') end,
    pais        = case when p_pais is null then pais
                       else nullif(btrim(p_pais), '') end,
    updated_at  = now()
  where id = p_id;

  -- El dueño nuevo tiene que poder entrar. Al anterior NO se le quita el
  -- acceso acá: dejar afuera a alguien es una decisión aparte, y hacerla de
  -- rebote al cambiar un correo es la forma de perder una tienda sin querer.
  if v_owner is not null then
    insert into store_members (store_id, user_id, is_default)
    values (p_id, v_owner,
            not exists (select 1 from store_members m where m.user_id = v_owner))
    on conflict do nothing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Las tiendas de una persona
-- ---------------------------------------------------------------------------
create or replace function public.mis_tiendas()
returns table (
  id uuid, codigo text, nombre text, es_plataforma boolean,
  activa boolean, por_defecto boolean, pais text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.codigo, s.nombre, s.es_plataforma, s.is_active,
         m.is_default, s.pais
    from store_members m
    join stores s on s.id = m.store_id
   where m.user_id = auth.uid()
   order by m.is_default desc, s.nombre
$$;

comment on function public.mis_tiendas() is
  'Las tiendas que administra esta persona. Un perfil es de una persona física y puede administrar varias.';

-- ---------------------------------------------------------------------------
-- Cambiar de tienda activa
-- ---------------------------------------------------------------------------
-- OJO: el `store_id` se escribe en el token cuando el token se emite. Cambiar
-- la marca acá no cambia la sesión en curso — quien llame a esto tiene que
-- renovar la sesión después (`supabase.auth.refreshSession()`), que vuelve a
-- correr el hook. Sin eso el usuario cambia de tienda y sigue viendo la
-- anterior, que es peor que no poder cambiar.
create or replace function public.cambiar_tienda_activa(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from store_members m
      join stores s on s.id = m.store_id
     where m.user_id = auth.uid() and m.store_id = p_store_id and s.is_active)
  then
    raise exception 'No administrás esa tienda, o está inactiva.' using errcode = '42501';
  end if;

  update store_members set is_default = (store_id = p_store_id)
   where user_id = auth.uid();
end;
$$;

comment on function public.cambiar_tienda_activa(uuid) is
  'Marca cuál tienda abre esta persona. Requiere renovar la sesión: el claim se escribe al emitir el token.';

grant execute on function public.mis_tiendas()                to authenticated;
grant execute on function public.cambiar_tienda_activa(uuid)  to authenticated;
revoke execute on function public.mis_tiendas()               from anon;
revoke execute on function public.cambiar_tienda_activa(uuid) from anon;

commit;
