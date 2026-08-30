-- Hay cosas que no se apagan.
--
-- El catálogo trataba todo como opcional por tienda, y no lo es. Los pedidos,
-- las credenciales, el perfil de la persona y el editor son parte del producto:
-- una tienda sin ellos no es una tienda con menos funciones, es una tienda que
-- no se puede usar.
--
-- Y el tipo de cambio es el caso que de verdad hacía falta marcar, porque SÍ
-- estaba en `tienda_apps` y se podía apagar: sin cotización, un precio en otra
-- moneda no se puede convertir. No es una herramienta que la tienda elige — es
-- una que necesita para mostrar un precio.
--
-- POR QUÉ UNA COLUMNA Y NO UNA LISTA EN EL CÓDIGO
-- Porque la pantalla que muestra el casillero y la función que lo guarda tienen
-- que estar de acuerdo. Con una lista escrita en el front, el casillero se
-- vería apagado y el servidor lo dejaría cambiar igual; con una en el back, la
-- pantalla ofrecería apagar algo que después falla. Una columna la leen los dos.

alter table public.plataforma_apps
  add column if not exists obligatoria boolean not null default false;

comment on column public.plataforma_apps.obligatoria is
  'No se puede apagar por tienda: es parte del producto o hace falta para que '
  'algo básico funcione.';

update public.plataforma_apps
   set obligatoria = true
 where codigo in (
   -- Funcionalidades: pantallas del producto. Ya no estaban en `tienda_apps`
   -- —sólo van ahí herramientas y apps— pero queda dicho, que es distinto de
   -- quedar implícito: mañana alguien las agrega y la marca ya está puesta.
   'pedidos', 'vault', 'perfil', 'editorpro',
   -- Y la que sí se podía apagar: sin cotización no hay forma de convertir un
   -- precio a otra moneda.
   'bcu'
 );

-- ── Que no se pueda apagar de verdad ───────────────────────────────────
--
-- El control va en el servidor y no sólo en la pantalla: una pantalla se puede
-- saltear, y esto tiene que valer también para lo que llame a la función
-- directo.
create or replace function public.habilitar_app_de_tienda(
  p_store_id uuid, p_codigo text, p_habilitada boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obligatoria boolean;
  v_nombre      text;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market habilita herramientas y apps.' using errcode = '42501';
  end if;

  select obligatoria, nombre into v_obligatoria, v_nombre
    from plataforma_apps
   where codigo = p_codigo and tipo in ('herramienta', 'app');

  if v_nombre is null then
    raise exception 'No existe la herramienta o app "%".', p_codigo using errcode = 'P0002';
  end if;

  if v_obligatoria and not p_habilitada then
    raise exception '% no se puede apagar: hace falta para que la tienda funcione.', v_nombre
      using errcode = '23514';
  end if;

  insert into tienda_apps (store_id, codigo, habilitada)
  values (p_store_id, p_codigo, p_habilitada)
  on conflict (store_id, codigo)
    do update set habilitada = excluded.habilitada, updated_at = now();
end;
$$;

-- ── Y que la pantalla lo sepa antes de ofrecerlo ───────────────────────
--
-- Se borra primero: agregar una columna al `returns table` es cambiar el tipo
-- de retorno, y `create or replace` no puede.
drop function if exists public.apps_de_tienda(uuid);

create function public.apps_de_tienda(p_store_id uuid)
returns table (codigo text, tipo text, nombre text, icono text, para text,
               vault_platforms text[], habilitada boolean, obligatoria boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (soy_la_plataforma() or exists (
        select 1 from store_members m
         where m.store_id = p_store_id and m.user_id = auth.uid())) then
    raise exception 'No pertenecés a esa tienda.' using errcode = '42501';
  end if;

  return query
    select a.codigo, a.tipo, a.nombre, a.icono, a.para, a.vault_platforms,
           -- Una obligatoria está habilitada siempre, tenga fila o no: si no,
           -- una tienda creada antes de que se marcara aparecería sin ella.
           coalesce(t.habilitada, false) or a.obligatoria,
           a.obligatoria
      from plataforma_apps a
      left join tienda_apps t
        on t.codigo = a.codigo and t.store_id = p_store_id
     where a.tipo in ('herramienta', 'app')
       and a.activa
       and not coalesce(a.solo_plataforma, false)
     order by a.obligatoria desc, a.tipo, a.orden, a.nombre;
end;
$$;

grant  execute on function public.apps_de_tienda(uuid) to authenticated;
revoke execute on function public.apps_de_tienda(uuid) from public, anon;
