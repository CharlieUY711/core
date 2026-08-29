-- ===========================================================================
-- La Biblioteca de artículos: lo que se conoce, separado de lo que se vende
-- ===========================================================================
--
-- LA DISTINCIÓN QUE ORDENA TODO
-- Biblioteca es lo que la tienda CONOCE. Publicaciones es lo que OFRECE.
--
-- Hasta ahora estaban mezclados: el cargador por marca creaba borradores
-- directamente entre las publicaciones, así que diez productos que todavía
-- nadie decidió vender convivían con los que sí se venden. Y un artículo que
-- se deja de publicar no se puede borrar sin perder lo que se sabía de él, así
-- que quedaba archivado ahí, estorbando.
--
-- Con la Biblioteca aparte: se genera un catálogo y llena la Biblioteca; se
-- publica lo que se decide vender; lo que se deja de vender vuelve a la
-- Biblioteca en vez de morir como borrador.
--
-- UNA FICHA NO ES UN ARTÍCULO PUBLICADO
-- La ficha dice QUÉ ES: marca, nombre, familia, descripción, foto. NO tiene
-- precio de venta, ni stock, ni canal — eso aparece al publicar y vive en
-- `catalog_variante`. Si la ficha llevara precio habría dos precios para lo
-- mismo, y empieza la discrepancia.
--
-- `precio_ref` es lo que publica la fuente, y por eso se llama así: es
-- referencia, no el precio de nadie.
--
-- DE QUIÉN ES CADA FICHA
--   tenant_id NULL  → de la plataforma. Lo que se leyó del sitio de una marca
--                     es conocimiento del mundo: sirve igual a todas las
--                     tiendas y se lee una vez.
--   tenant_id = X   → de esa tienda. Lo que cargó a mano, que puede ser algo
--                     que sólo ella vende.
--
-- Las dos se ven juntas al buscar. Es lo que hace que la Biblioteca mejore sola
-- para todos sin que nadie pierda lo suyo.
-- ===========================================================================

begin;

alter table catalogo_market
  add column if not exists tenant_id uuid,
  add column if not exists imagen    text;

comment on column catalogo_market.tenant_id is
  'NULL = ficha de la plataforma, compartida. Con valor = ficha propia de esa tienda.';
comment on column catalogo_market.imagen is
  'Foto de la ficha. La de la plataforma puede no tenerla; la que carga una tienda si.';

-- La unicidad pasa a incluir la tienda: dos tiendas pueden conocer el mismo
-- producto con su propia ficha, y ninguna pisa a la otra ni a la compartida.
alter table catalogo_market
  drop constraint if exists catalogo_market_marca_norm_nombre_norm_key;

create unique index if not exists catalogo_market_ficha_unica
  on catalogo_market (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
                      marca_norm, nombre_norm);

-- ---------------------------------------------------------------------------
-- Buscar en la Biblioteca
-- ---------------------------------------------------------------------------
-- Lo primero que hace el alta: antes de salir a la web, mirar lo que ya se
-- sabe. Es instantáneo y gratis, y casi siempre alcanza.
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
         c.tenant_id is not null as propia,
         c.leido_at
    from catalogo_market c
   where (c.tenant_id is null
          or c.tenant_id = ((auth.jwt() ->> 'store_id')::uuid))
     and (p_marca is null or c.marca_norm = normalizar_texto(p_marca))
     and (coalesce(btrim(p_texto), '') = ''
          or c.nombre_norm like '%' || normalizar_texto(p_texto) || '%')
   -- Lo propio primero: si la tienda tiene su ficha de algo, esa manda sobre la
   -- compartida.
   order by (c.tenant_id is not null) desc, c.marca, c.familia nulls last, c.nombre
   limit greatest(1, least(p_limite, 100));
$$;

comment on function public.buscar_en_biblioteca(text, text, integer) is
  'Busca fichas en la Biblioteca: las de la plataforma y las de esta tienda. Lo propio va primero.';

-- ---------------------------------------------------------------------------
-- Guardar una ficha propia
-- ---------------------------------------------------------------------------
-- Se llama al dar de alta un artículo: lo que se carga queda en la Biblioteca
-- aunque después se despublique. Ese es el punto — no perder lo que se supo.
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
    tenant_id, marca, marca_norm, fuente, nombre, nombre_norm,
    familia, descripcion, imagen, leido_at
  ) values (
    v_tenant, coalesce(btrim(p_marca), ''), normalizar_texto(coalesce(p_marca, '')),
    'carga propia', btrim(p_nombre), normalizar_texto(p_nombre),
    nullif(btrim(coalesce(p_familia, '')), ''),
    nullif(btrim(coalesce(p_descripcion, '')), ''),
    nullif(btrim(coalesce(p_imagen, '')), ''),
    now()
  )
  on conflict (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
               marca_norm, nombre_norm)
  do update set
    familia     = coalesce(excluded.familia, catalogo_market.familia),
    descripcion = coalesce(excluded.descripcion, catalogo_market.descripcion),
    imagen      = coalesce(excluded.imagen, catalogo_market.imagen),
    leido_at    = now()
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.guardar_ficha_biblioteca(text, text, text, text, text) is
  'Guarda en la Biblioteca de la tienda lo que se dio de alta. Se actualiza en vez de duplicar: la misma ficha dos veces es peor que una vieja.';

grant execute on function public.buscar_en_biblioteca(text, text, integer)                to authenticated;
grant execute on function public.guardar_ficha_biblioteca(text, text, text, text, text)   to authenticated;

commit;
