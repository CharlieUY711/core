-- ===========================================================================
-- La base de personas es una sola
-- ===========================================================================
--
-- LA DEFINICIÓN
-- Hay UNA base de personas y UNA de organizaciones. Todos somos personas: en
-- unos casos compradores, en otros vendedores, en otros administradores. El
-- papel es del CONTEXTO, no de la identidad — nadie es "un comprador" y además
-- "un administrador" como si fueran dos registros.
--
-- Eso ya es cierto en el esquema: las personas viven en `auth.users` y las
-- organizaciones en `stores`; el papel lo dice `store_members.rol`, que es de
-- la relación entre las dos y no de ninguna de ellas.
--
-- DONDE NO ERA CIERTO
-- `personas_de_la_plataforma()` hacía `join store_members`, así que sólo veía a
-- quienes ya pertenecen a algún vendedor. Medido hoy: 2 personas en la base y
-- la pantalla mostraba 1.
--
-- Un comprador que nunca entró a un vendedor era invisible. Y también lo era el
-- caso que más importa: alguien que se registró y no está en ninguno —que es
-- exactamente la respuesta cuando escribe "no puedo entrar"—. La lista que
-- tenía que contestar esa pregunta era la única que no podía.
--
-- LO QUE CAMBIA
-- Se listan TODAS, y de cada una se dice qué es en este momento: en cuántos
-- vendedores está y con qué rol, y cuántas compras hizo. Sin ese contexto, una
-- lista de personas sola no sirve para decidir nada.
--
-- `left join`, no `join`: la diferencia entre las dos es justamente lo que
-- estaba faltando.
-- ===========================================================================

begin;

drop function if exists public.personas_de_la_plataforma();

create function public.personas_de_la_plataforma()
returns table (
  user_id uuid, correo text, tiendas bigint, roles text, nombres text,
  desde timestamptz, ultimo_acceso timestamptz,
  -- Comprar es de la persona, no del vendedor: por eso se cuenta acá y no en
  -- ninguna vista de vendedor. Ver docs/architecture/vendedor.md.
  compras bigint
)
language plpgsql
stable
security definer
set search_path = public
as $FN$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market ve las personas.' using errcode = '42501';
  end if;

  return query
    select u.id, u.email::text,
           count(m.store_id),
           -- Los roles distintos que tiene: alguien puede ser dueño de un
           -- vendedor y operador de otro, y eso importa.
           string_agg(distinct m.rol, ' · ' order by m.rol),
           string_agg(s.nombre, ' · ' order by s.nombre),
           u.created_at,
           u.last_sign_in_at,
           (select count(*) from ordenes o where o.user_id = u.id)
      from auth.users u
      -- LEFT: quien no está en ningún vendedor es la persona que más hay que
      -- poder ver, no la que se descarta.
      left join store_members m on m.user_id = u.id
      left join stores s        on s.id = m.store_id
     group by u.id, u.email, u.created_at, u.last_sign_in_at
     order by u.email;
end;
$FN$;

grant  execute on function public.personas_de_la_plataforma() to authenticated;
revoke execute on function public.personas_de_la_plataforma() from public, anon;

commit;
