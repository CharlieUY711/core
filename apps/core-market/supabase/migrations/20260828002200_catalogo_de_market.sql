-- ===========================================================================
-- El catálogo de Market: lo que se lee una vez, sirve para todas las tiendas
-- ===========================================================================
--
-- QUÉ CAMBIA
-- Hoy cada tienda que da de alta un artículo sale a leer la web por su cuenta:
-- buscar la marca, ubicar su representante, traer la página por el proxy,
-- extraer los productos con un modelo. Son cuatro llamadas encadenadas, tardan,
-- cuestan, y el resultado se descarta apenas se cierra el formulario.
--
-- La siguiente tienda que cargue un producto de la misma marca repite todo.
--
-- Guardándolo, la lectura se hace UNA vez y queda: la próxima búsqueda de esa
-- marca es una consulta a esta tabla. Instantánea, gratis, e igual para todos.
-- Y mejora sola: cada marca que alguien lee queda disponible para el resto.
--
-- ES DE LA PLATAFORMA, NO DE UNA TIENDA
-- Por eso no tiene `tenant_id`. Un producto de Olivares de Santa Laura es el
-- mismo producto sin importar quién lo venda; lo que es de cada tienda es su
-- precio, su stock y su publicación — eso vive en `catalog_variante`.
--
-- LO QUE GUARDA NO ES UN ARTÍCULO
-- Es lo que el fabricante o su representante publican: nombre, familia,
-- descripción y precio de referencia. No tiene precio de venta, ni stock, ni
-- canal: no es algo que se venda, es algo que se puede dar de alta.
-- ===========================================================================

begin;

create table if not exists catalogo_market (
  id           uuid primary key default gen_random_uuid(),

  -- La marca, normalizada para poder buscarla sin acentos ni espacios. Se
  -- guarda también como se escribe, que es lo que se muestra.
  marca        text not null,
  marca_norm   text not null,
  -- Dominio de donde se leyó: el del fabricante, o el de su representante.
  -- Queda a la vista para que quien lo use sepa a quién le está creyendo.
  fuente       text not null,

  nombre       text not null,
  nombre_norm  text not null,
  familia      text,
  descripcion  text,

  -- Precio publicado por la fuente. NO es el precio de venta de nadie: es
  -- referencia. Puede ser null y eso es normal.
  precio_ref   numeric(14,2),
  moneda       text,

  leido_at     timestamptz not null default now(),
  created_at   timestamptz not null default now(),

  -- Un producto por marca. Si la misma marca se relee, se actualiza en vez de
  -- duplicarse: un catálogo con el mismo producto tres veces es peor que uno
  -- desactualizado.
  unique (marca_norm, nombre_norm)
);

create index if not exists catalogo_market_marca_idx on catalogo_market (marca_norm);
create index if not exists catalogo_market_leido_idx on catalogo_market (leido_at);

comment on table catalogo_market is
  'Catalogo de la plataforma: lo que las marcas publican, leido una vez y compartido por todas las tiendas. No tiene tenant_id a proposito — un producto es el mismo sin importar quien lo venda.';
comment on column catalogo_market.precio_ref is
  'Precio publicado por la fuente. Es referencia, no el precio de venta de ninguna tienda.';
comment on column catalogo_market.leido_at is
  'Cuando se leyo. Es lo que permite saber que hay que refrescar y que no.';

alter table catalogo_market enable row level security;

-- Lo lee cualquiera con sesión: es un catálogo de referencia, no datos de
-- nadie. Escribirlo va por la RPC, que normaliza y deduplica.
drop policy if exists catalogo_market_lectura on catalogo_market;
create policy catalogo_market_lectura
  on catalogo_market for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Normalizar igual que el front
-- ---------------------------------------------------------------------------
-- Sin acentos, sin espacios, sin puntuación: "Colinas de Garzón" y
-- "colinasdegarzon" tienen que encontrarse. Es la misma regla que usa el
-- buscador de marcas, y tiene que dar igual de los dos lados.
create or replace function public.normalizar_texto(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           lower(translate(coalesce(p, ''),
             'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
             'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')),
           '[^a-z0-9]', '', 'g');
$$;

-- ---------------------------------------------------------------------------
-- Buscar en el catálogo de Market
-- ---------------------------------------------------------------------------
create or replace function public.catalogo_market_de_marca(
  p_marca text,
  p_dias_frescura integer default 7
)
returns table (
  nombre text, familia text, descripcion text,
  precio_ref numeric, moneda text, fuente text, leido_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.nombre, c.familia, c.descripcion, c.precio_ref, c.moneda, c.fuente, c.leido_at
    from catalogo_market c
   where c.marca_norm = normalizar_texto(p_marca)
     -- Lo viejo no se devuelve: mejor volver a leer que ofrecer un catálogo de
     -- hace medio año como si fuera el de hoy.
     and c.leido_at > now() - make_interval(days => p_dias_frescura)
   order by c.familia nulls last, c.nombre;
$$;

comment on function public.catalogo_market_de_marca(text, integer) is
  'El catalogo guardado de una marca, si es reciente. Vacio significa "hay que leerlo": no se devuelve lo viejo como si fuera de hoy.';

-- ---------------------------------------------------------------------------
-- Guardar lo que se leyó
-- ---------------------------------------------------------------------------
create or replace function public.guardar_catalogo_market(
  p_marca  text,
  p_fuente text,
  p_items  jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_n    integer := 0;
begin
  if coalesce(btrim(p_marca), '') = '' then
    raise exception 'Falta la marca.' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    continue when coalesce(btrim(v_item->>'nombre'), '') = '';

    insert into catalogo_market (
      marca, marca_norm, fuente, nombre, nombre_norm,
      familia, descripcion, precio_ref, moneda, leido_at
    ) values (
      btrim(p_marca), normalizar_texto(p_marca), coalesce(p_fuente, ''),
      btrim(v_item->>'nombre'), normalizar_texto(v_item->>'nombre'),
      nullif(btrim(coalesce(v_item->>'familia','')), ''),
      nullif(btrim(coalesce(v_item->>'descripcion','')), ''),
      nullif(v_item->>'precio', '')::numeric,
      nullif(btrim(coalesce(v_item->>'moneda','')), ''),
      now()
    )
    on conflict (marca_norm, nombre_norm) do update set
      -- Se refresca lo que puede haber cambiado; el nombre y la marca son la
      -- identidad y no se tocan.
      fuente      = excluded.fuente,
      familia     = coalesce(excluded.familia, catalogo_market.familia),
      descripcion = coalesce(excluded.descripcion, catalogo_market.descripcion),
      precio_ref  = excluded.precio_ref,
      moneda      = excluded.moneda,
      leido_at    = now();

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

comment on function public.guardar_catalogo_market(text, text, jsonb) is
  'Guarda el catalogo leido de una marca. Actualiza por (marca, nombre) en vez de duplicar: el mismo producto tres veces es peor que uno desactualizado.';

grant execute on function public.normalizar_texto(text)                      to anon, authenticated;
grant execute on function public.catalogo_market_de_marca(text, integer)     to authenticated;
grant execute on function public.guardar_catalogo_market(text, text, jsonb)  to authenticated;

commit;
