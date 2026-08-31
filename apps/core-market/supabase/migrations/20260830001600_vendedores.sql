-- El menú puede agrupar, y "Vendedores" es el primer grupo.
--
-- Hasta ahora el menú era una lista plana: Dashboard, y después todo lo que
-- tuviera `en_sidebar`. Con cinco entradas alcanzaba; con más, "Tiendas" y
-- "Personas" quedan sueltas entre cosas que no tienen nada que ver.
--
-- LA SECCIÓN VA EN EL CATÁLOGO, NO EN LA BARRA
-- Porque el menú ya sale del catálogo: lo que se ofrece lo decide CORE Market
-- en su configurador. Escribir los grupos en el código de la barra sería el
-- segundo lugar donde decidir lo mismo, y el que se olvida siempre es el
-- segundo.
--
-- `seccion` en null significa suelta arriba, que es lo que son todas hoy: nadie
-- se mueve por agregar esta columna.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- Y PERSONAS, QUE FALTABA
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Se puede ver una tienda y quiénes trabajan en ella. No se puede ver una
-- persona y en qué tiendas está. Es la misma información mirada al revés, y es
-- la que hace falta cuando alguien escribe: "no puedo entrar".

alter table public.plataforma_apps
  add column if not exists seccion text;

comment on column public.plataforma_apps.seccion is
  'Grupo del menú lateral. En null, la entrada va suelta arriba.';

insert into public.plataforma_apps
  (codigo, tipo, nombre, icono, para, orden, activa, en_sidebar, solo_plataforma, obligatoria, seccion)
values
  ('personas', 'funcionalidad', 'Personas', '👤',
   'Quiénes administran tiendas, en cuáles y con qué rol.',
   215, true, true, true, false, 'Vendedores')
on conflict (codigo) do update
   set nombre = excluded.nombre, icono = excluded.icono,
       para = excluded.para, seccion = excluded.seccion,
       en_sidebar = excluded.en_sidebar, solo_plataforma = excluded.solo_plataforma;

update public.plataforma_apps set seccion = 'Vendedores' where codigo = 'tiendas';

-- ── Las personas, y en qué tiendas están ───────────────────────────────
create or replace function public.personas_de_la_plataforma()
returns table (
  user_id uuid, correo text, tiendas bigint, roles text, nombres text,
  desde timestamptz, ultimo_acceso timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market ve las personas.' using errcode = '42501';
  end if;

  return query
    select u.id, u.email::text,
           count(m.store_id),
           -- Los roles distintos que tiene: alguien puede ser dueño de una
           -- tienda y operador de otra, y eso importa.
           string_agg(distinct m.rol, ' · ' order by m.rol),
           string_agg(s.nombre, ' · ' order by s.nombre),
           min(m.created_at),
           u.last_sign_in_at
      from auth.users u
      join store_members m on m.user_id = u.id
      join stores s        on s.id = m.store_id
     group by u.id, u.email, u.last_sign_in_at
     order by u.email;
end;
$$;

grant  execute on function public.personas_de_la_plataforma() to authenticated;
revoke execute on function public.personas_de_la_plataforma() from public, anon;
