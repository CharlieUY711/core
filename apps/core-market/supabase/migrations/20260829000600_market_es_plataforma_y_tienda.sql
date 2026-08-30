-- ===========================================================================
-- Market es la plataforma Y es una tienda
-- ===========================================================================
--
-- LA AMBIGÜEDAD
-- `catalogo_market.tenant_id IS NULL` significaba dos cosas a la vez:
--
--   "la leen todas las tiendas"     (a quién se comparte)
--   "no es de ninguna tienda"       (de quién es)
--
-- Y Market es las dos: es la plataforma que publica el catálogo compartido, y
-- es también una tienda —`charlie-market`, la única que existe hoy— que vende.
-- Por eso al operador de Market el panel le decía "esta ficha es de la
-- plataforma, no se puede borrar desde acá": le negaba lo que en realidad es
-- suyo, porque el modelo no tenía forma de expresar que es las dos cosas.
--
-- POR QUÉ NO ALCANZA CON DARLE LAS FICHAS A LA TIENDA MARKET
-- Sería lo obvio: sacar el NULL y poner el id de Market. Pero entonces "ser de
-- Market" pasaría a significar "compartida", y toda ficha PRIVADA de Market
-- —lo que carga para vender y no quiere publicar como catálogo— se volvería
-- visible para el resto de las tiendas. La propiedad no puede llevar dos
-- significados; es el mismo error que estamos sacando.
--
-- CÓMO QUEDA
-- Dos columnas para dos preguntas distintas:
--
--   tenant_id   de quién es. Quién la edita. Nunca nulo.
--   compartida  si las demás tiendas la leen.
--
-- El catálogo de Market es "de la tienda Market Y compartida". Sus fichas
-- privadas son "de la tienda Market y no compartidas". Una ficha de otra
-- tienda nunca es compartida, y esa es la regla de dirección: la información
-- va de Market a las tiendas, no al revés.
--
-- LO QUE ESTO SIMPLIFICA
-- Desaparece el caso especial. Editar una ficha vuelve a ser una sola
-- pregunta: "¿es mía?". El operador de Market puede corregir el catálogo
-- compartido porque es suyo, sin ningún permiso aparte. Antes había que
-- inventarle una excepción; ahora no hay nada que exceptuar.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Cuál de las tiendas es la plataforma
-- ---------------------------------------------------------------------------
-- No se deduce de `tipo`: `tipo` es la clase de vidriera —market, second,
-- gourmet— y mañana hay diez tiendas con tipo 'market' que no son la
-- plataforma. Ser la plataforma es otra cosa y necesita decirse aparte.
alter table stores
  add column if not exists es_plataforma boolean not null default false;

comment on column stores.es_plataforma is
  'La tienda que además ES la plataforma: publica el catálogo compartido. Sólo una.';

-- Una sola, y que lo garantice la base: dos plataformas es un empate que
-- nadie sabe resolver en tiempo de ejecución.
create unique index if not exists stores_una_sola_plataforma
  on stores ((true)) where es_plataforma;

update stores set es_plataforma = true where codigo = 'charlie-market';

create or replace function public.tienda_plataforma()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select id from stores where es_plataforma limit 1 $$;

comment on function public.tienda_plataforma() is
  'La tienda que es la plataforma. Un solo lugar donde se sabe cuál es.';

grant execute on function public.tienda_plataforma() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Separar "de quién es" de "quién la lee"
-- ---------------------------------------------------------------------------
alter table catalogo_market
  add column if not exists compartida boolean not null default false;

comment on column catalogo_market.compartida is
  'Si la leen todas las tiendas. Sólo la plataforma comparte: es la regla de dirección.';
comment on column catalogo_market.tenant_id is
  'De quién es la ficha, y por lo tanto quién la edita. Nunca nulo.';

-- Lo que era de nadie pasa a ser de Market, y compartido.
update catalogo_market
   set tenant_id = tienda_plataforma(), compartida = true
 where tenant_id is null;

alter table catalogo_market alter column tenant_id set not null;

-- Ahora que no hay nulos, la identidad se puede escribir derecho. El
-- `coalesce` existía sólo para que el NULL no rompiera la unicidad.
drop index if exists catalogo_market_ficha_unica;
create unique index catalogo_market_ficha_unica
  on catalogo_market (tenant_id, marca_norm, nombre_norm);

-- ---------------------------------------------------------------------------
-- Quién lee qué
-- ---------------------------------------------------------------------------
drop policy if exists catalogo_market_lectura on catalogo_market;

create policy catalogo_market_lectura on catalogo_market
  for select to authenticated
  using (
    tenant_id = ((auth.jwt() ->> 'store_id')::uuid)   -- lo mío
    or compartida                                     -- y lo que Market comparte
  );

comment on policy catalogo_market_lectura on catalogo_market is
  'Lo propio y lo compartido. Una tienda no ve lo privado de otra, ni siquiera lo privado de Market.';

-- ---------------------------------------------------------------------------
-- Las funciones, sin el caso especial
-- ---------------------------------------------------------------------------
create or replace function public.buscar_en_biblioteca(
  p_texto text,
  p_marca text default null,
  p_limite integer default 20
)
returns table (
  id uuid, marca text, nombre text, familia text, descripcion text,
  imagen text, precio_ref numeric, moneda text, fuente text,
  propia boolean, leido_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.marca, c.nombre, c.familia, c.descripcion,
         c.imagen, c.precio_ref, c.moneda, c.fuente,
         c.tenant_id = ((auth.jwt() ->> 'store_id')::uuid) as propia,
         c.leido_at
    from catalogo_market c
   where (c.tenant_id = ((auth.jwt() ->> 'store_id')::uuid) or c.compartida)
     and (p_marca is null or c.marca_norm = normalizar_texto(p_marca))
     and (coalesce(btrim(p_texto), '') = ''
          or c.nombre_norm like '%' || normalizar_texto(p_texto) || '%')
   -- Lo propio primero. Para el operador de Market su catálogo compartido ES
   -- lo propio, que es exactamente como lo debe ver.
   order by (c.tenant_id = ((auth.jwt() ->> 'store_id')::uuid)) desc,
            c.marca, c.familia nulls last, c.nombre
   limit greatest(1, least(p_limite, 100));
$$;

create or replace function public.ficha_para_publicacion(
  p_tenant      uuid,
  p_marca       text,
  p_titulo      text,
  p_descripcion text default null,
  p_imagen      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marca  text := normalizar_texto(coalesce(p_marca, ''));
  v_nombre text := normalizar_texto(coalesce(p_titulo, ''));
  v_id     uuid;
begin
  if coalesce(btrim(p_titulo), '') = '' then
    return null;
  end if;

  -- 1. La propia de la tienda.
  select id into v_id from catalogo_market
   where tenant_id = p_tenant and marca_norm = v_marca and nombre_norm = v_nombre;
  if v_id is not null then return v_id; end if;

  -- 2. La compartida. Copiarla sería multiplicar el mismo conocimiento.
  select id into v_id from catalogo_market
   where compartida and marca_norm = v_marca and nombre_norm = v_nombre
   limit 1;
  if v_id is not null then return v_id; end if;

  -- 3. Una nueva, de la tienda. Nunca compartida: compartir es de la
  --    plataforma, y esto lo llama cualquiera que publique.
  insert into catalogo_market (
    tenant_id, compartida, marca, marca_norm, fuente, nombre, nombre_norm,
    descripcion, imagen, leido_at
  ) values (
    p_tenant, false, coalesce(btrim(p_marca), ''), v_marca,
    'publicación', btrim(p_titulo), v_nombre,
    nullif(btrim(coalesce(p_descripcion, '')), ''),
    nullif(btrim(coalesce(p_imagen, '')), ''),
    now()
  )
  on conflict (tenant_id, marca_norm, nombre_norm)
  do update set leido_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- La publicación sólo escribe fotos en una ficha que es de su misma tienda.
-- Antes la condición era `f.tenant_id is not null`, que ahora es siempre
-- verdadera: sin esto, una tienda le escribiría las fotos al catálogo de
-- Market.
create or replace function public.publicacion_toma_de_la_ficha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f record;
begin
  if new.ficha_id is null then
    new.ficha_id := ficha_para_publicacion(
      new.tenant_id, new.marca, new.titulo, new.descripcion,
      case when array_length(new.fotos_base, 1) > 0 then new.fotos_base[1] end);
  end if;

  if new.ficha_id is null then return new; end if;

  select * into f from catalogo_market where id = new.ficha_id;
  if not found then return new; end if;

  if coalesce(btrim(new.titulo), '') = '' then
    new.titulo := f.nombre;
  end if;
  if coalesce(btrim(new.descripcion), '') = '' then
    new.descripcion := f.descripcion;
  end if;

  if coalesce(array_length(new.fotos_base, 1), 0) = 0 then
    new.fotos_base := f.fotos;

  elsif coalesce(array_length(f.fotos, 1), 0) = 0
        and f.tenant_id = new.tenant_id then
    -- Primera carga y la ficha es de esta misma tienda: se queda con ellas.
    -- Si la ficha es de Market, no: sería subirle información a la plataforma
    -- y cambiarle las fotos a todas las demás tiendas.
    update catalogo_market
       set fotos = new.fotos_base, imagen = new.fotos_base[1]
     where id = new.ficha_id;
  end if;

  return new;
end;
$$;

-- Editar y borrar vuelven a una sola pregunta: ¿es mía?
create or replace function public.actualizar_ficha_biblioteca(
  p_id          uuid,
  p_nombre      text default null,
  p_marca       text default null,
  p_familia     text default null,
  p_descripcion text default null,
  p_fotos       text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := ((auth.jwt() ->> 'store_id')::uuid);
  f record;
begin
  if v_tenant is null then
    raise exception 'No hay tienda en la sesión.' using errcode = '42501';
  end if;

  select * into f from catalogo_market where id = p_id;
  if not found then
    raise exception 'La ficha no existe.' using errcode = 'P0002';
  end if;

  -- Una sola condición. El operador de Market edita el catálogo compartido
  -- porque es suyo; no hace falta ninguna excepción.
  if f.tenant_id <> v_tenant then
    if f.compartida then
      raise exception 'Esta ficha es del catálogo de Market y la comparten todas las tiendas. Guardala como ficha propia para cambiarla.'
        using errcode = '42501';
    end if;
    raise exception 'La ficha no es de esta tienda.' using errcode = '42501';
  end if;

  if (p_nombre is not null and btrim(p_nombre) <> f.nombre)
     or (p_marca is not null and btrim(p_marca) <> f.marca) then
    if exists (
      select 1 from catalogo_market c
       where c.tenant_id = v_tenant
         and c.id <> p_id
         and c.marca_norm  = normalizar_texto(coalesce(p_marca,  f.marca))
         and c.nombre_norm = normalizar_texto(coalesce(p_nombre, f.nombre)))
    then
      raise exception 'Ya tenés otro artículo con esa marca y ese título. Dos títulos son dos artículos.'
        using errcode = '23505';
    end if;
  end if;

  -- `compartida` NO es parámetro: no se cambia desde acá. Compartir al
  -- catálogo es una decisión de la plataforma, no un campo más del formulario.
  update catalogo_market set
    nombre      = coalesce(nullif(btrim(p_nombre), ''), nombre),
    nombre_norm = case when coalesce(btrim(p_nombre), '') <> ''
                       then normalizar_texto(p_nombre) else nombre_norm end,
    marca       = coalesce(nullif(btrim(p_marca), ''), marca),
    marca_norm  = case when coalesce(btrim(p_marca), '') <> ''
                       then normalizar_texto(p_marca) else marca_norm end,
    familia     = case when p_familia     is null then familia
                       else nullif(btrim(p_familia), '') end,
    descripcion = case when p_descripcion is null then descripcion
                       else nullif(btrim(p_descripcion), '') end,
    fotos       = coalesce(p_fotos, fotos),
    imagen      = case when p_fotos is null then imagen
                       when array_length(p_fotos, 1) > 0 then p_fotos[1]
                       else null end
  where id = p_id;
end;
$$;

create or replace function public.eliminar_ficha_biblioteca(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := ((auth.jwt() ->> 'store_id')::uuid);
  f record;
  v_publicaciones integer;
begin
  if v_tenant is null then
    raise exception 'No hay tienda en la sesión.' using errcode = '42501';
  end if;

  select * into f from catalogo_market where id = p_id;
  if not found then return; end if;

  if f.tenant_id <> v_tenant then
    if f.compartida then
      raise exception 'Esta ficha es del catálogo de Market y la comparten todas las tiendas: no se puede borrar desde acá.'
        using errcode = '42501';
    end if;
    raise exception 'La ficha no es de esta tienda.' using errcode = '42501';
  end if;

  -- Borrar una ficha compartida deja sin fuente a otras tiendas que la estén
  -- usando. Se avisa con el número, que es lo que permite decidir.
  select count(*) into v_publicaciones
    from catalog_producto_base where ficha_id = p_id;

  if v_publicaciones > 0 then
    raise exception 'No se puede borrar: hay % publicación(es) que salen de esta ficha. Borrá primero las publicaciones.',
      v_publicaciones using errcode = '23503';
  end if;

  delete from catalogo_market where id = p_id;
end;
$$;

-- El catálogo compartido: de Market, y compartido. Sigue siendo sólo para
-- `service_role`.
create or replace function public.guardar_catalogo_market(
  p_marca text, p_fuente text, p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plataforma uuid := tienda_plataforma();
  v_n integer := 0;
  it  jsonb;
begin
  if v_plataforma is null then
    raise exception 'No hay tienda marcada como plataforma.' using errcode = 'P0002';
  end if;
  if coalesce(btrim(p_marca), '') = '' then
    raise exception 'El catálogo necesita una marca.' using errcode = '22023';
  end if;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    continue when coalesce(btrim(it ->> 'nombre'), '') = '';

    insert into catalogo_market (
      tenant_id, compartida, marca, marca_norm, fuente, nombre, nombre_norm,
      familia, descripcion, precio_ref, moneda, leido_at
    ) values (
      v_plataforma, true,
      btrim(p_marca), normalizar_texto(p_marca),
      coalesce(nullif(btrim(p_fuente), ''), 'desconocida'),
      btrim(it ->> 'nombre'), normalizar_texto(it ->> 'nombre'),
      nullif(btrim(coalesce(it ->> 'familia', '')), ''),
      nullif(btrim(coalesce(it ->> 'descripcion', '')), ''),
      (it ->> 'precio')::numeric,
      nullif(btrim(coalesce(it ->> 'moneda', '')), ''),
      now()
    )
    on conflict (tenant_id, marca_norm, nombre_norm)
    do update set
      familia     = coalesce(excluded.familia,     catalogo_market.familia),
      descripcion = coalesce(excluded.descripcion, catalogo_market.descripcion),
      precio_ref  = coalesce(excluded.precio_ref,  catalogo_market.precio_ref),
      moneda      = coalesce(excluded.moneda,      catalogo_market.moneda),
      fuente      = excluded.fuente,
      compartida  = true,
      leido_at    = now();

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

-- Lo que lee una tienda: suyo y no compartido.
create or replace function public.guardar_fichas_biblioteca(
  p_marca text, p_fuente text, p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := ((auth.jwt() ->> 'store_id')::uuid);
  v_n integer := 0;
  it  jsonb;
begin
  if v_tenant is null then
    raise exception 'No hay tienda en la sesión.' using errcode = '42501';
  end if;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    continue when coalesce(btrim(it ->> 'nombre'), '') = '';

    -- Si el catálogo compartido ya lo tiene, no se copia: se usa ese.
    continue when exists (
      select 1 from catalogo_market
       where compartida
         and marca_norm  = normalizar_texto(p_marca)
         and nombre_norm = normalizar_texto(it ->> 'nombre'));

    insert into catalogo_market (
      tenant_id, compartida, marca, marca_norm, fuente, nombre, nombre_norm,
      familia, descripcion, precio_ref, moneda, leido_at
    ) values (
      v_tenant, false,
      btrim(p_marca), normalizar_texto(p_marca),
      coalesce(nullif(btrim(p_fuente), ''), 'desconocida'),
      btrim(it ->> 'nombre'), normalizar_texto(it ->> 'nombre'),
      nullif(btrim(coalesce(it ->> 'familia', '')), ''),
      nullif(btrim(coalesce(it ->> 'descripcion', '')), ''),
      (it ->> 'precio')::numeric,
      nullif(btrim(coalesce(it ->> 'moneda', '')), ''),
      now()
    )
    on conflict (tenant_id, marca_norm, nombre_norm)
    do update set
      familia     = coalesce(excluded.familia,     catalogo_market.familia),
      descripcion = coalesce(excluded.descripcion, catalogo_market.descripcion),
      precio_ref  = coalesce(excluded.precio_ref,  catalogo_market.precio_ref),
      moneda      = coalesce(excluded.moneda,      catalogo_market.moneda),
      leido_at    = now();

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

-- La versión de a una: quedó apuntando al índice con `coalesce`, que esta
-- migración eliminó. Sin esto, dar de alta un artículo fallaría con "no unique
-- constraint matching the ON CONFLICT specification" — el mismo error silencioso
-- que ya tuvimos una vez con guardar_catalogo_market.
create or replace function public.guardar_ficha_biblioteca(
  p_marca       text,
  p_nombre      text,
  p_familia     text default null,
  p_descripcion text default null,
  p_imagen      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := ((auth.jwt() ->> 'store_id')::uuid);
  v_id     uuid;
begin
  if v_tenant is null then
    raise exception 'No hay tienda en la sesión.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'La ficha necesita un nombre.' using errcode = '22023';
  end if;

  insert into catalogo_market (
    tenant_id, compartida, marca, marca_norm, fuente, nombre, nombre_norm,
    familia, descripcion, imagen, leido_at
  ) values (
    v_tenant, false,
    coalesce(btrim(p_marca), ''), normalizar_texto(coalesce(p_marca, '')),
    'carga propia', btrim(p_nombre), normalizar_texto(p_nombre),
    nullif(btrim(coalesce(p_familia, '')), ''),
    nullif(btrim(coalesce(p_descripcion, '')), ''),
    nullif(btrim(coalesce(p_imagen, '')), ''),
    now()
  )
  on conflict (tenant_id, marca_norm, nombre_norm)
  do update set
    familia     = coalesce(excluded.familia, catalogo_market.familia),
    descripcion = coalesce(excluded.descripcion, catalogo_market.descripcion),
    imagen      = coalesce(excluded.imagen, catalogo_market.imagen),
    leido_at    = now()
  returning id into v_id;

  return v_id;
end;
$$;

commit;
