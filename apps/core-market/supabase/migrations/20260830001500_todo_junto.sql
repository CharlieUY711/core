-- Todo lo que una tienda tiene habilitado, en una sola lista.
--
-- Estaban en dos lugares distintos que respondían la misma pregunta: la tabla
-- de herramientas y apps, y abajo un bloque aparte de "Capacidades" con dos
-- casillas. Para saber qué tiene una tienda había que mirar en dos lados y
-- saber de antemano cuál de los dos.
--
-- Lo separé yo, en `20260830001300`, con el argumento de que una era una
-- decisión comercial y la otra de alcance. Es cierto y da igual: desde la
-- pantalla las dos son «qué tiene habilitado esta tienda», y esa es la pregunta
-- que hay que poder responder de un vistazo.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- UN CUARTO TIPO, PORQUE UNA CAPACIDAD NO ES UNA HERRAMIENTA
-- ═══════════════════════════════════════════════════════════════════════════
--
--   FUNCIONALIDAD  una pantalla. Parte del producto.
--   HERRAMIENTA    un servicio que trabaja adentro de otra pantalla.
--   APP            un sistema de terceros con tu cuenta del otro lado.
--   CAPACIDAD      lo que CONSUME servicios que se cobran distinto.
--
-- Meterlas como «herramienta» habría sido más corto y falso: la búsqueda
-- ampliada no es un servicio, es permiso para gastar el que ya existe. Y esa
-- diferencia es justo la que importa cuando se factura.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- Y `tienda_apps` PASA A SER LA ÚNICA VERDAD
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `stores.capacidades` deja de leerse. La columna se conserva —es de donde sale
-- este backfill y borrarla es irreversible— pero ya no la mira nadie: si se
-- siguiera leyendo habría dos fuentes para lo mismo, que es exactamente lo que
-- este cambio viene a sacar.

alter table public.plataforma_apps
  drop constraint if exists plataforma_apps_tipo_check;
alter table public.plataforma_apps
  add constraint plataforma_apps_tipo_check
  check (tipo in ('funcionalidad', 'herramienta', 'app', 'capacidad'));

insert into public.plataforma_apps
  (codigo, tipo, nombre, icono, para, orden, activa, en_sidebar, obligatoria)
values
  ('busqueda_ampliada', 'capacidad', 'Búsqueda ampliada', '🔎',
   'Salir a la web para completar el alta: marca, logo, artículo, fotos, videos. Consume búsquedas.',
   310, true, false, false),
  ('catalogo_por_marca', 'capacidad', 'Catálogo por marca', '📚',
   'Leer el catálogo del fabricante y cargar de a varios. Consume búsquedas, el proxy y un modelo de lenguaje.',
   320, true, false, false)
on conflict (codigo) do update
   set tipo = excluded.tipo, nombre = excluded.nombre,
       icono = excluded.icono, para = excluded.para, orden = excluded.orden;

-- Lo que cada tienda ya tenía, tal cual. Sin esto, el cambio le apagaría de
-- golpe a todas las capacidades que venían usando.
insert into public.tienda_apps (store_id, codigo, habilitada)
select s.id, c.codigo, true
  from public.stores s
 cross join (values ('busqueda_ampliada'), ('catalogo_por_marca')) as c(codigo)
 where c.codigo = any(coalesce(s.capacidades, '{}'))
on conflict (store_id, codigo) do nothing;

-- Y las que no tenía quedan explícitamente apagadas, en vez de sin fila: una
-- fila que dice «no» y una fila que no existe se ven igual desde afuera, y la
-- diferencia importa el día que alguien pregunte si se decidió o se olvidó.
insert into public.tienda_apps (store_id, codigo, habilitada)
select s.id, c.codigo, false
  from public.stores s
 cross join (values ('busqueda_ampliada'), ('catalogo_por_marca')) as c(codigo)
 where not (c.codigo = any(coalesce(s.capacidades, '{}')))
on conflict (store_id, codigo) do nothing;

-- ── Las capacidades salen de donde sale todo lo demás ──────────────────
create or replace function public.mis_capacidades()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  -- Leía `stores.capacidades`. Ahora sale de `tienda_apps`, que es la única
  -- lista de qué tiene habilitado una tienda. Dos fuentes para lo mismo es
  -- garantizar que un día digan cosas distintas.
  select coalesce(array_agg(t.codigo), '{}')
    from tienda_apps t
    join plataforma_apps a on a.codigo = t.codigo
   where t.store_id = mi_tienda()
     and t.habilitada
     and a.tipo = 'capacidad';
$$;

-- ── La lista completa, de una ──────────────────────────────────────────
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
           -- Una funcionalidad y una obligatoria están habilitadas siempre,
           -- tengan fila o no: son parte del producto.
           coalesce(t.habilitada, false) or a.obligatoria or a.tipo = 'funcionalidad',
           a.obligatoria or a.tipo = 'funcionalidad'
      from plataforma_apps a
      left join tienda_apps t
        on t.codigo = a.codigo and t.store_id = p_store_id
     -- TODOS los tipos: antes se excluían las funcionalidades y por eso CORE
     -- Editor no aparecía en ningún lado. No poder apagarlas no es razón para
     -- esconderlas — al contrario, saber qué incluye el producto es parte de
     -- saber qué tiene la tienda.
     where a.activa
       and not coalesce(a.solo_plataforma, false)
     order by
       case a.tipo when 'funcionalidad' then 1 when 'capacidad' then 2
                   when 'herramienta' then 3 else 4 end,
       a.orden, a.nombre;
end;
$$;

grant  execute on function public.apps_de_tienda(uuid) to authenticated;
revoke execute on function public.apps_de_tienda(uuid) from public, anon;
