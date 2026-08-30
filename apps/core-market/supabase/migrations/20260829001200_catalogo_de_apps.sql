-- ===========================================================================
-- El catálogo de herramientas, funcionalidades y apps
-- ===========================================================================
--
-- QUÉ DEFINE LA PLATAFORMA Y QUÉ DEFINE EL CÓDIGO
--
-- El código declara lo que EXISTE. Una funcionalidad es una pantalla con una
-- ruta, una herramienta es una llamada a un servicio: eso no se puede inventar
-- desde un formulario. Si una fila apuntara a una ruta que nadie programó, el
-- menú tendría un renglón que lleva a un error.
--
-- La plataforma define lo que se OFRECE: cuáles están activas, cómo se llaman,
-- con qué ícono, en qué orden, cuáles van en el menú y cuáles son sólo para
-- tiendas. Eso sí es una decisión, y cambia sin tocar código.
--
-- El `codigo` es el contrato entre las dos mitades. La fila lo usa para
-- encontrar su ruta y su prueba del lado del código; el código lo usa para
-- encontrar su presentación acá.
--
-- POR QUÉ NO ALCANZABA LA LISTA EN EL CÓDIGO
-- Porque decidir qué se le ofrece a quién es una decisión de negocio, y estaba
-- escrita en un archivo TypeScript. Cambiarla era un despliegue. Y encima
-- convivía con `stores.capacidades`, que ya es data: dos formas de decir "esto
-- está habilitado", una en la base y otra en el código.
-- ===========================================================================

begin;

create table if not exists plataforma_apps (
  id           uuid primary key default gen_random_uuid(),
  codigo       text not null unique,
  tipo         text not null check (tipo in ('funcionalidad', 'herramienta', 'app')),
  nombre       text not null,
  icono        text,
  para         text,
  orden        integer not null default 100,
  -- Si va en el menú. Todas aparecen en "Herramientas y Apps"; ésta decide
  -- cuáles además están a un click, que es lo que se usa para operar.
  en_sidebar   boolean not null default false,
  -- CORE Market administra y no vende: hay cosas que no le corresponden.
  solo_tiendas boolean not null default false,
  activa       boolean not null default true,
  -- Con qué nombre está su credencial en el Vault. Null en las
  -- funcionalidades, que no tienen credencial que pueda faltar.
  vault_platform text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table plataforma_apps is
  'Qué se ofrece y cómo se presenta. Lo que EXISTE lo declara el código: el `codigo` es el contrato entre los dos.';
comment on column plataforma_apps.codigo is
  'La llave contra el código: de ahí salen la ruta y la prueba. Una fila con un código que el código no conoce no se muestra.';
comment on column plataforma_apps.en_sidebar is
  'Si además va en el menú. Todas aparecen en el catálogo; ésta decide cuáles se usan a diario.';

insert into plataforma_apps (codigo, tipo, nombre, icono, para, orden, en_sidebar, solo_tiendas, vault_platform) values
  ('biblioteca',    'funcionalidad', 'Biblioteca',        '📚', 'Lo que se sabe: artículos, fotos y documentos.',                 10, true,  false, null),
  ('publicaciones', 'funcionalidad', 'Mis publicaciones', '🏷', 'Lo que se está vendiendo, y en qué canales.',                    20, true,  true,  null),
  ('pedidos',       'funcionalidad', 'Mis pedidos',       '📦', 'Lo que compraron y hay que despachar.',                          30, true,  true,  null),
  ('editor',        'funcionalidad', 'Editor',            '🎨', 'La vidriera: cómo se ve la tienda.',                             40, true,  true,  null),
  ('editorpro',     'funcionalidad', 'Editor Pro',        '🖼', 'Editor de imágenes: recorte, ajustes, fondos.',                  50, true,  false, null),
  ('vault',         'funcionalidad', 'API Vault',         '🔐', 'Las credenciales de las herramientas y las apps.',               60, true,  false, null),
  ('analytics',     'funcionalidad', 'Analytics',         '📊', 'Qué se ve, qué se vende y de dónde viene.',                      70, false, false, null),

  ('serper',        'herramienta',   'Búsqueda web',      '🔎', 'Trabaja al dar de alta: encuentra la marca, su logo, artículos, fotos y videos.', 110, false, false, 'Serper.dev'),
  ('bcu',           'herramienta',   'Tipo de cambio',    '💱', 'Trabaja al convertir un precio. Trae la cotización oficial del BCU.',            120, false, false, null),
  ('mapbox',        'herramienta',   'Mapas',             '🗺', 'Trabaja en Mi perfil: completa la dirección y ubica la calle.',                  130, false, false, 'Mapbox'),

  ('ml',            'app',           'Mercado Libre',     '🛒', 'Publicar y sincronizar en el canal.', 210, false, true, 'MercadoLibre'),
  ('mp',            'app',           'Mercado Pago',      '💳', 'Cobrar.',                             220, false, true, 'MercadoPago')
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- Leerlo
-- ---------------------------------------------------------------------------
-- Lo lee cualquier sesión con tienda: es su menú. Las inactivas no salen, y
-- las de tienda no salen para la plataforma.
create or replace function public.catalogo_de_apps()
returns table (
  codigo text, tipo text, nombre text, icono text, para text,
  orden integer, en_sidebar boolean, solo_tiendas boolean,
  activa boolean, vault_platform text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.codigo, a.tipo, a.nombre, a.icono, a.para,
         a.orden, a.en_sidebar, a.solo_tiendas, a.activa, a.vault_platform
    from plataforma_apps a
   where a.activa
     and not (a.solo_tiendas and soy_la_plataforma())
   order by a.orden, a.nombre
$$;

comment on function public.catalogo_de_apps() is
  'Lo que se le ofrece a esta sesión. Sin las inactivas y sin las que no le corresponden.';

-- ---------------------------------------------------------------------------
-- Configurarlo
-- ---------------------------------------------------------------------------
-- No se crean ni se borran filas: lo que existe lo declara el código. Acá se
-- decide cómo se presenta y si se ofrece.
create or replace function public.actualizar_app(
  p_codigo       text,
  p_nombre       text default null,
  p_icono        text default null,
  p_para         text default null,
  p_orden        integer default null,
  p_en_sidebar   boolean default null,
  p_solo_tiendas boolean default null,
  p_activa       boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market configura las herramientas y apps.' using errcode = '42501';
  end if;

  update plataforma_apps set
    nombre       = coalesce(nullif(btrim(p_nombre), ''), nombre),
    icono        = coalesce(nullif(btrim(p_icono), ''), icono),
    para         = coalesce(nullif(btrim(p_para), ''), para),
    orden        = coalesce(p_orden, orden),
    en_sidebar   = coalesce(p_en_sidebar, en_sidebar),
    solo_tiendas = coalesce(p_solo_tiendas, solo_tiendas),
    activa       = coalesce(p_activa, activa),
    updated_at   = now()
  where codigo = p_codigo;

  if not found then
    raise exception 'No existe ninguna app con el código "%".', p_codigo using errcode = 'P0002';
  end if;
end;
$$;

alter table plataforma_apps enable row level security;

-- Sin política de escritura: se configura por función, que verifica quién
-- llama. Y la lectura va por `catalogo_de_apps()`, que ya filtra.
create policy plataforma_apps_lectura on plataforma_apps
  for select to authenticated using (true);

grant  execute on function public.catalogo_de_apps() to authenticated;
grant  execute on function public.actualizar_app(text, text, text, text, integer, boolean, boolean, boolean) to authenticated;
revoke execute on function public.catalogo_de_apps() from anon;
revoke execute on function public.actualizar_app(text, text, text, text, integer, boolean, boolean, boolean) from anon;

commit;
