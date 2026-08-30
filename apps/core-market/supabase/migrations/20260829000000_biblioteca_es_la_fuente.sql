-- ===========================================================================
-- La Biblioteca es la fuente: no hay publicación sin ficha
-- ===========================================================================
--
-- LO QUE SE DECIDIÓ
-- Biblioteca es lo que la tienda SABE. Mis Publicaciones es lo que OFRECE, y
-- se ofrece algo que ya se sabe: una publicación es una ficha a la que se le
-- puso precio y canal.
--
-- LO QUE HABÍA
-- Nada de eso era cierto en el esquema. `catalog_producto_base` no tenía
-- ninguna referencia a `catalogo_market`: cada publicación guardaba su propio
-- título, marca, descripción y fotos, y la Biblioteca guardaba los suyos por
-- otro lado. Dos copias de lo mismo que nadie reconciliaba, y la Biblioteca
-- quedaba como una pantalla más en vez de ser el origen.
--
-- POR QUÉ UN TRIGGER Y NO UNA LLAMADA DESDE LA APLICACIÓN
-- Porque el alta de artículos ya llamaba a `guardar_ficha_biblioteca` y aun
-- así hay 6 publicaciones y 0 fichas propias: el código se agregó después, y
-- lo que se agrega después no alcanza a lo que ya estaba. Un camino que hay
-- que acordarse de recorrer se deja de recorrer.
--
-- Con el trigger la regla vale para todos los caminos —la aplicación, una
-- importación, una corrección a mano en el panel de Supabase— y para siempre.
-- No es una comodidad: es la única forma de que "toda publicación está en la
-- Biblioteca" sea verdad y no una intención.
--
-- LO QUE ESTA MIGRACIÓN NO HACE
-- No saca `titulo`, `marca`, `descripcion` ni `fotos_base` de la publicación.
-- Sacarlos es lo que termina de eliminar la duplicación, pero toca todos los
-- caminos que leen publicaciones —vidriera, checkout, sincronización de
-- canales— y eso es un cambio aparte, con su propio ADR.
--
-- Lo que sí queda desde hoy: el vínculo existe, se llena solo, y no se puede
-- crear una publicación sin su ficha. Eso es lo que hace posible el paso que
-- sigue; sin esto, colapsar los campos sería inventar el origen.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- El vínculo
-- ---------------------------------------------------------------------------
alter table catalog_producto_base
  add column if not exists ficha_id uuid references catalogo_market(id);

comment on column catalog_producto_base.ficha_id is
  'La ficha de la Biblioteca de la que sale esta publicación. Lo llena un trigger: no hay publicación con título sin su ficha.';

create index if not exists catalog_producto_base_ficha
  on catalog_producto_base (ficha_id);

-- ---------------------------------------------------------------------------
-- Encontrar o crear la ficha de una publicación
-- ---------------------------------------------------------------------------
-- El orden importa, y es el mismo que usa la búsqueda de la Biblioteca:
--
--   1. La ficha propia de la tienda. Si la tienda ya sabe de este producto,
--      esa manda: es la que puede haber corregido.
--   2. La ficha de la plataforma. Lo que se leyó del sitio de una marca sirve
--      igual a todas las tiendas; copiarla por tienda sería multiplicar el
--      mismo conocimiento y perder lo que lo hace útil.
--   3. Recién ahí, una ficha propia nueva.
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
  -- Sin título no hay ficha que crear. Un borrador todavía sin nombre no puede
  -- inventar una entrada en la Biblioteca: quedaría una ficha sin nombre que
  -- después nadie sabe qué es ni se anima a borrar.
  if coalesce(btrim(p_titulo), '') = '' then
    return null;
  end if;

  -- 1. La propia de la tienda.
  select id into v_id from catalogo_market
   where tenant_id = p_tenant and marca_norm = v_marca and nombre_norm = v_nombre;
  if v_id is not null then return v_id; end if;

  -- 2. La compartida de la plataforma.
  select id into v_id from catalogo_market
   where tenant_id is null and marca_norm = v_marca and nombre_norm = v_nombre;
  if v_id is not null then return v_id; end if;

  -- 3. Una nueva, de la tienda.
  insert into catalogo_market (
    tenant_id, marca, marca_norm, fuente, nombre, nombre_norm,
    descripcion, imagen, leido_at
  ) values (
    p_tenant, coalesce(btrim(p_marca), ''), v_marca,
    'publicación', btrim(p_titulo), v_nombre,
    nullif(btrim(coalesce(p_descripcion, '')), ''),
    nullif(btrim(coalesce(p_imagen, '')), ''),
    now()
  )
  on conflict (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
               marca_norm, nombre_norm)
  do update set leido_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.ficha_para_publicacion(uuid, text, text, text, text) is
  'Devuelve la ficha de Biblioteca de una publicación: la propia, si no la de la plataforma, si no crea una propia. Null si todavía no hay título.';

-- ---------------------------------------------------------------------------
-- El trigger
-- ---------------------------------------------------------------------------
create or replace function public.asegurar_ficha_de_publicacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ya tiene ficha: no se toca. Reasignarla en cada guardado desharía una
  -- corrección hecha a mano cada vez que alguien edita el título.
  if new.ficha_id is not null then
    return new;
  end if;

  new.ficha_id := ficha_para_publicacion(
    new.tenant_id, new.marca, new.titulo, new.descripcion,
    -- La primera foto alcanza como imagen de la ficha: la ficha dice QUÉ ES,
    -- no muestra la galería. La galería es de la publicación.
    case when array_length(new.fotos_base, 1) > 0 then new.fotos_base[1] end
  );

  return new;
end;
$$;

comment on function public.asegurar_ficha_de_publicacion() is
  'Toda publicación con título tiene su ficha en la Biblioteca. Vale para cualquier camino de escritura, no sólo el de la aplicación.';

drop trigger if exists trg_ficha_de_publicacion on catalog_producto_base;

-- En INSERT y en UPDATE: un borrador puede nacer sin título y recibirlo
-- después. Sólo con INSERT esa publicación se quedaba fuera de la Biblioteca
-- para siempre, que es justo el caso que esto viene a arreglar.
create trigger trg_ficha_de_publicacion
  before insert or update of titulo, marca, ficha_id on catalog_producto_base
  for each row
  execute function public.asegurar_ficha_de_publicacion();

-- ---------------------------------------------------------------------------
-- Lo que ya estaba
-- ---------------------------------------------------------------------------
-- Las publicaciones anteriores al vínculo. Sin esto la regla valdría desde hoy
-- y la Biblioteca mostraría un catálogo incompleto, que es peor que no
-- mostrarlo: se ve completo y no lo está.
update catalog_producto_base b
   set ficha_id = ficha_para_publicacion(
         b.tenant_id, b.marca, b.titulo, b.descripcion,
         case when array_length(b.fotos_base, 1) > 0 then b.fotos_base[1] end)
 where b.ficha_id is null
   and coalesce(btrim(b.titulo), '') <> '';

grant execute on function public.ficha_para_publicacion(uuid, text, text, text, text)
  to authenticated;

commit;
