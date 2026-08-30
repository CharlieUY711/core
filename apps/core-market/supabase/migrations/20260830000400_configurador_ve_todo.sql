-- El configurador ve TODO, incluida "Sólo tiendas".
--
-- SÍNTOMA: Mercado Libre y Mercado Pago no aparecían en "Herramientas y Apps"
-- de CORE Market.
--
-- CAUSA: las dos tienen `solo_tiendas = true`, y la función excluía
-- `solo_tiendas and v_plataforma` SIEMPRE — también cuando la plataforma pide
-- el catálogo completo para configurarlo.
--
-- Es la misma trampa que ya corregimos con `activa`: una marca que esconde la
-- fila de la única pantalla desde la que se puede sacar esa marca. Con la
-- columna "Sólo tiendas" en la grilla del configurador y la fila invisible, el
-- casillero existe y no hay forma de llegar a él.
--
-- LA REGLA, ENTONCES:
--   p_todas = true   → es el configurador de CORE Market. Devuelve todo, sin
--                      filtrar. Filtrar acá es esconderle a quien configura
--                      justo lo que tiene que configurar.
--   p_todas = false  → es la vista de uso. Ahí sí valen `activa`,
--                      `solo_tiendas` y `solo_plataforma`: son lo que decide
--                      qué se ofrece a quién.
--
-- El permiso no cambia: `p_todas` sigue siendo sólo para la plataforma, y una
-- tienda que lo pida sigue recibiendo el mismo error.

create or replace function public.catalogo_de_apps(p_todas boolean default false)
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
     -- Sin filtro cuando es el configurador. Con filtro cuando es la vista de
     -- uso: ahí `solo_tiendas` y `solo_plataforma` sí tienen que actuar.
     where p_todas
        or (a.activa
            and not (a.solo_tiendas    and v_plataforma)
            and not (a.solo_plataforma and not v_plataforma))
     order by a.orden, a.nombre;
end;
$$;

grant  execute on function public.catalogo_de_apps(boolean) to authenticated;
revoke execute on function public.catalogo_de_apps(boolean) from public;
revoke execute on function public.catalogo_de_apps(boolean) from anon;
