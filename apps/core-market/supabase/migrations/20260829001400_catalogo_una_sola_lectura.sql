-- ===========================================================================
-- Una sola lectura del catálogo, para las dos vistas
-- ===========================================================================
--
-- El catálogo se muestra en dos lugares: "Herramientas y Apps" —lo que hay
-- disponible— y el configurador de CORE Market, que es lo mismo más los
-- interruptores. Deben ser la misma vista.
--
-- Pero leían distinto: la vista usaba `catalogo_de_apps()`, que devuelve sólo
-- las activas, y el configurador leía la tabla directo para poder ver las
-- apagadas —si no, desactivar una la hacía desaparecer de la pantalla que la
-- desactivó, sin forma de volver a encenderla.
--
-- Dos caminos de lectura para lo mismo terminan mostrando cosas distintas. Se
-- unifican en una función con un parámetro: `p_todas` incluye las inactivas, y
-- sólo la plataforma puede pedirlo, porque para una tienda "inactiva" quiere
-- decir "no existe".
-- ===========================================================================

begin;

drop function if exists public.catalogo_de_apps();

create or replace function public.catalogo_de_apps(p_todas boolean default false)
returns table (
  codigo text, tipo text, nombre text, icono text, para text,
  orden integer, en_sidebar boolean, solo_tiendas boolean,
  activa boolean, vault_platform text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_todas and not soy_la_plataforma() then
    raise exception 'Sólo CORE Market ve las que están apagadas.' using errcode = '42501';
  end if;

  return query
    select a.codigo, a.tipo, a.nombre, a.icono, a.para,
           a.orden, a.en_sidebar, a.solo_tiendas, a.activa, a.vault_platform
      from plataforma_apps a
     where (p_todas or a.activa)
       and not (a.solo_tiendas and soy_la_plataforma())
     order by a.orden, a.nombre;
end;
$$;

comment on function public.catalogo_de_apps(boolean) is
  'Lo que se le ofrece a esta sesión. Con p_todas incluye las apagadas, y eso sólo lo ve la plataforma.';

grant  execute on function public.catalogo_de_apps(boolean) to authenticated;
revoke execute on function public.catalogo_de_apps(boolean) from anon;

commit;
