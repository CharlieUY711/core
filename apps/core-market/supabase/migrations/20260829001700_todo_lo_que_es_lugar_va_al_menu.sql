-- ===========================================================================
-- El Dashboard no tiene menú: los lugares van al menú
-- ===========================================================================
--
-- EL CRITERIO, LLEVADO HASTA EL FINAL
-- Un Dashboard responde "¿cómo está esto?". Todo lo demás —Tiendas,
-- Territorios, Definiciones, Taxonomía, Herramientas y Apps— son pantallas
-- donde se entra, se hace algo y se sale. Son lugares, y los lugares van al
-- menú.
--
-- Tenerlos como secciones de una barra adentro del Dashboard era dos
-- navegaciones para lo mismo: el menú te llevaba al Dashboard y ahí había otra
-- barra con las verdaderas destinos. Ahora el menú lleva directo, y el
-- Dashboard queda para lo único que sabe hacer: mostrar cómo está todo.
--
-- Y ASÍ DESAPARECE UNA DUPLICACIÓN
-- "Herramientas y Apps" estaba en el menú Y como sección del configurador, con
-- la misma vista. Ahora es una sola entrada: si quien mira es CORE Market,
-- ahí mismo aparecen los interruptores. No hay dos lugares que mantener.
--
-- FALTABA `solo_plataforma`
-- Ya existía `solo_tiendas` —lo que no le corresponde a la plataforma— pero no
-- su espejo. La taxonomía la usan todas las tiendas y la define la plataforma:
-- una tienda no puede tocar los departamentos de todas. Sin esta columna, o la
-- veía cualquiera, o había que dejar esas entradas fuera del catálogo y volver
-- a escribirlas a mano en el menú — que es de donde venimos.
-- ===========================================================================

begin;

alter table plataforma_apps
  add column if not exists solo_plataforma boolean not null default false;

comment on column plataforma_apps.solo_plataforma is
  'Sólo CORE Market. El espejo de solo_tiendas: lo que administra la plataforma y una tienda no puede tocar.';

insert into plataforma_apps
  (codigo, tipo, nombre, icono, para, orden, en_sidebar, solo_tiendas, solo_plataforma)
values
  ('taxonomia', 'funcionalidad', 'Taxonomía', '🗂',
   'Departamentos, categorías y subcategorías: la estructura con la que se clasifica todo.',
   80, true, false, true),

  ('tiendas', 'funcionalidad', 'Tiendas', '🏪',
   'Crear y configurar las tiendas que venden en la plataforma.',
   210, true, false, true),

  ('territorios', 'funcionalidad', 'Territorios', '🌎',
   'Países: su moneda, sus impuestos, sus zonas y su tipo de cambio.',
   220, true, false, true),

  ('definiciones', 'funcionalidad', 'Definiciones', '📐',
   'Qué existe: países, zonas, monedas e idiomas.',
   230, true, false, true)

on conflict (codigo) do update set
  nombre          = excluded.nombre,
  icono           = excluded.icono,
  para            = excluded.para,
  orden           = excluded.orden,
  en_sidebar      = true,
  solo_plataforma = true;

-- El Vault guarda las credenciales de la plataforma.
update plataforma_apps set solo_plataforma = true where codigo = 'vault';

-- ---------------------------------------------------------------------------
-- El catálogo, con el espejo
-- ---------------------------------------------------------------------------
-- `create or replace` no puede agregarle una columna al retorno de una
-- función que devuelve tabla: hay que soltarla. Es la unica forma.
drop function if exists public.catalogo_de_apps(boolean);

create function public.catalogo_de_apps(p_todas boolean default false)
returns table (
  codigo text, tipo text, nombre text, icono text, para text,
  orden integer, en_sidebar boolean, solo_tiendas boolean,
  solo_plataforma boolean, activa boolean, vault_platform text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plataforma boolean := soy_la_plataforma();
begin
  if p_todas and not v_plataforma then
    raise exception 'Sólo CORE Market ve las que están apagadas.' using errcode = '42501';
  end if;

  return query
    select a.codigo, a.tipo, a.nombre, a.icono, a.para,
           a.orden, a.en_sidebar, a.solo_tiendas, a.solo_plataforma,
           a.activa, a.vault_platform
      from plataforma_apps a
     where (p_todas or a.activa)
       and not (a.solo_tiendas    and v_plataforma)
       and not (a.solo_plataforma and not v_plataforma)
     order by a.orden, a.nombre;
end;
$$;

-- El parametro nuevo cambia la firma: sin soltar la vieja quedarian dos
-- versiones y una llamada con parametros nombrados no sabria a cual ir.
drop function if exists public.actualizar_app(text, text, text, text, integer, boolean, boolean, boolean);

create or replace function public.actualizar_app(
  p_codigo          text,
  p_nombre          text default null,
  p_icono           text default null,
  p_para            text default null,
  p_orden           integer default null,
  p_en_sidebar      boolean default null,
  p_solo_tiendas    boolean default null,
  p_activa          boolean default null,
  p_solo_plataforma boolean default null
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

  -- Las dos a la vez no significan nada: no la vería nadie.
  if coalesce(p_solo_tiendas, false) and coalesce(p_solo_plataforma, false) then
    raise exception 'No puede ser sólo de tiendas y sólo de la plataforma a la vez: no la vería nadie.'
      using errcode = '22023';
  end if;

  update plataforma_apps set
    nombre          = coalesce(nullif(btrim(p_nombre), ''), nombre),
    icono           = coalesce(nullif(btrim(p_icono), ''), icono),
    para            = coalesce(nullif(btrim(p_para), ''), para),
    orden           = coalesce(p_orden, orden),
    en_sidebar      = coalesce(p_en_sidebar, en_sidebar),
    solo_tiendas    = coalesce(p_solo_tiendas, solo_tiendas),
    solo_plataforma = coalesce(p_solo_plataforma, solo_plataforma),
    activa          = coalesce(p_activa, activa),
    updated_at      = now()
  where codigo = p_codigo;

  if not found then
    raise exception 'No existe ninguna app con el código "%".', p_codigo using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- El Dashboard: sólo monitores
-- ---------------------------------------------------------------------------
create or replace function public.estado_de_la_plataforma()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market ve el estado de la plataforma.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'territorios_sin_configurar', (
      select count(*) from countries p
       where not (
         exists (select 1 from currencies m where m.country_id = p.id and m.status = 'active')
         and exists (select 1 from tax_rates r where r.country_id = p.id and r.status = 'active'))
    ),
    'territorios_total', (select count(*) from countries),
    'herramientas_sin_verificar', (select count(*) from api_vault where last_checked_at is null),
    'herramientas_con_error',     (select count(*) from api_vault where status = 'error'),
    'canales_sin_conectar', (
      (case when (select count(*) from ml_credentials where is_active) = 0 then 1 else 0 end)
      + (case when (select count(*) from mp_credentials where is_active) = 0 then 1 else 0 end)
    ),
    'publicaciones_de_la_plataforma', (
      select count(*) from catalog_producto_base b where b.tenant_id = tienda_plataforma()
    ),
    'tiendas',         (select count(*) from stores where not es_plataforma),
    'tiendas_activas', (select count(*) from stores where not es_plataforma and is_active),
    'tiendas_sin_duenio', (
      select count(*) from stores s
       where not s.es_plataforma
         and not exists (select 1 from store_members m where m.store_id = s.id)
    ),
    'cotizacion_mas_vieja', (
      select min(x.valid_at) from (
        select distinct on (r.from_currency, r.to_currency) r.valid_at
          from exchange_rates r
         order by r.from_currency, r.to_currency, r.valid_at desc
      ) x
    ),
    'fichas_compartidas', (select count(*) from catalogo_market where compartida),

    -- Monitores. No se tocan desde el Dashboard: cada uno tiene su lugar, y
    -- repetir el control acá sería tener dos lugares donde cambiar lo mismo.
    'funcionalidades', (select count(*) from plataforma_apps where tipo = 'funcionalidad' and activa),
    'herramientas',    (select count(*) from plataforma_apps where tipo = 'herramienta'   and activa),
    'apps',            (select count(*) from plataforma_apps where tipo = 'app'           and activa),
    'departamentos',   (select count(*) from departamentos where activo),
    'categorias',      (select count(*) from categorias    where activo),
    'subcategorias',   (select count(*) from subcategorias)
  ) into v;

  return v;
end;
$$;

grant  execute on function public.catalogo_de_apps(boolean) to authenticated;
grant  execute on function public.actualizar_app(text, text, text, text, integer, boolean, boolean, boolean, boolean) to authenticated;
revoke execute on function public.catalogo_de_apps(boolean) from anon;
revoke execute on function public.actualizar_app(text, text, text, text, integer, boolean, boolean, boolean, boolean) from anon;

commit;
