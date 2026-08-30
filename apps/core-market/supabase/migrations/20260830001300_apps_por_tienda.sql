-- Qué herramientas y apps tiene habilitada cada tienda.
--
-- HASTA HOY NO EXISTÍA. `plataforma_apps` dice qué OFRECE la plataforma, y con
-- eso alcanzaba mientras hubo una sola tienda: todas veían todo lo ofrecido.
-- Con dos tiendas ya no: COMITA puede querer Mercado Libre y otra no, y hoy no
-- hay dónde decirlo.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- SÓLO HERRAMIENTAS Y APPS. LAS FUNCIONALIDADES NO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Una funcionalidad es una pantalla —la Biblioteca, los Pedidos—: es parte del
-- producto y la tiene todo el mundo. Apagarle la Biblioteca a una tienda sería
-- venderle un producto distinto, no configurar el mismo.
--
-- Una herramienta o una app sí: tienen credencial, cuestan, y dependen de que
-- la tienda tenga cuenta del otro lado. Ahí la pregunta "¿la usa esta tienda?"
-- tiene sentido.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ESTO NO ES LO MISMO QUE `stores.capacidades`, AUNQUE SE PAREZCA
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `capacidades` —búsqueda ampliada, catálogo por marca— es qué CONSUME esa
-- tienda de servicios que se cobran distinto. Es una decisión comercial.
--
-- Esto otro es qué herramientas y apps puede conectar. Es una decisión de
-- alcance.
--
-- Se parecen lo suficiente como para confundirlas y son distintas lo suficiente
-- como para que unirlas hoy sea un refactor con riesgo y sin valor pedido.
-- Queda anotado: si algún día las dos preguntas se responden juntas, esto es lo
-- que hay que unificar.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- LA AUSENCIA DE FILA
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Significa NO habilitada. Es lo contrario de lo que pasa hoy, así que la
-- migración escribe una fila habilitada por cada tienda y cada herramienta o
-- app ofrecida: nadie pierde nada de lo que ya tenía.
--
-- Y a partir de acá, una herramienta nueva llega apagada a las tiendas
-- existentes. Es lo correcto cuando cuesta plata: que algo empiece a gastar
-- porque alguien lo agregó al catálogo sería una factura que nadie pidió.

create table if not exists public.tienda_apps (
  store_id   uuid not null references public.stores(id) on delete cascade,
  codigo     text not null references public.plataforma_apps(codigo) on delete cascade,
  habilitada boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, codigo)
);

comment on table public.tienda_apps is
  'Qué herramientas y apps del catálogo tiene habilitada cada tienda. Sin fila, '
  'no habilitada. Las funcionalidades no van acá: son parte del producto.';

create index if not exists tienda_apps_store_idx on public.tienda_apps (store_id);

alter table public.tienda_apps enable row level security;

-- Se lee desde el panel de la tienda; se escribe sólo desde la plataforma.
-- Que una tienda se habilite sola lo que le cuesta plata a otro es
-- exactamente lo que no puede pasar.
drop policy if exists "tienda_apps: la tienda ve las suyas" on public.tienda_apps;
create policy "tienda_apps: la tienda ve las suyas"
  on public.tienda_apps for select
  using (exists (select 1 from store_members m
                  where m.store_id = tienda_apps.store_id
                    and m.user_id = auth.uid()));

-- Lo que ya tenían: todo lo ofrecido, habilitado. Sin esto, la migración
-- apagaría de golpe lo que todas las tiendas venían usando.
insert into public.tienda_apps (store_id, codigo, habilitada)
select s.id, a.codigo, true
  from public.stores s
 cross join public.plataforma_apps a
 where a.tipo in ('herramienta', 'app')
   and a.activa
   and not coalesce(a.solo_plataforma, false)
on conflict (store_id, codigo) do nothing;

-- ── Ver qué tiene una tienda ───────────────────────────────────────────
--
-- Devuelve TODO el catálogo de herramientas y apps con su estado, no sólo lo
-- habilitado: para poder prender algo hay que verlo apagado primero. Es la
-- misma trampa que ya corregimos dos veces.
create or replace function public.apps_de_tienda(p_store_id uuid)
returns table (codigo text, tipo text, nombre text, icono text, para text,
               vault_platforms text[], habilitada boolean)
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
           coalesce(t.habilitada, false)
      from plataforma_apps a
      left join tienda_apps t
        on t.codigo = a.codigo and t.store_id = p_store_id
     where a.tipo in ('herramienta', 'app')
       and a.activa
       and not coalesce(a.solo_plataforma, false)
     order by a.tipo, a.orden, a.nombre;
end;
$$;

-- ── Prender o apagar una ───────────────────────────────────────────────
create or replace function public.habilitar_app_de_tienda(
  p_store_id uuid, p_codigo text, p_habilitada boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sólo la plataforma: habilitar una herramienta que se cobra es una decisión
  -- comercial, no una preferencia de quien la usa.
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market habilita herramientas y apps.' using errcode = '42501';
  end if;

  if not exists (select 1 from plataforma_apps
                  where codigo = p_codigo and tipo in ('herramienta', 'app')) then
    raise exception 'No existe la herramienta o app "%".', p_codigo using errcode = 'P0002';
  end if;

  insert into tienda_apps (store_id, codigo, habilitada)
  values (p_store_id, p_codigo, p_habilitada)
  on conflict (store_id, codigo)
    do update set habilitada = excluded.habilitada, updated_at = now();
end;
$$;

grant execute on function public.apps_de_tienda(uuid)                        to authenticated;
grant execute on function public.habilitar_app_de_tienda(uuid, text, boolean) to authenticated;

revoke execute on function public.apps_de_tienda(uuid)                        from public, anon;
revoke execute on function public.habilitar_app_de_tienda(uuid, text, boolean) from public, anon;
