-- ===========================================================================
-- La imagen vive en la Biblioteca. El título de venta es de la publicación.
-- ===========================================================================
--
-- LAS DOS REGLAS, QUE NO SE CONTRADICEN
--
--   1. En la Biblioteca el título es ÚNICO. Dos títulos son dos artículos.
--      La identidad de una ficha es (tienda, marca, título) y ya es un índice
--      único: no hay forma de tener dos fichas del mismo producto.
--
--   2. En una publicación el título SE PUEDE CAMBIAR. Es el título con el que
--      se vende, no el nombre del producto.
--
-- Lo que las une: 1 artículo en Biblioteca → N publicaciones. Un título armado
-- para el buscador de Mercado Libre no es un segundo artículo ni un campo
-- especial del canal: es otra publicación de la misma ficha.
--
-- LAS FOTOS: EL ARCHIVO ES ÚNICO, LA SELECCIÓN ES DE CADA PUBLICACIÓN
-- La foto vive una sola vez, en la Biblioteca. Pero CUÁLES muestra cada
-- publicación, y en qué orden, lo decide la tienda: la misma ficha puede
-- venderse con la foto de estudio en Market y con la de contexto en ML.
--
-- Que sea única no quiere decir que se imponga. Quiere decir que no hay dos
-- archivos: la publicación no guarda copias, guarda cuáles eligió.
--
-- Es la misma forma que el título, y que el stock, y que el precio:
--   una verdad en la Biblioteca, una decisión en la publicación.
--     título  → nombre del artículo   / título de venta
--     fotos   → el archivo            / cuáles y en qué orden
--     stock   → la existencia         / el cupo
--     precio  → el precio madre       / el precio del canal
--
-- POR QUÉ `fotos_base` SIGUE EXISTIENDO EN LA PUBLICACIÓN
-- Porque hay veinte lugares que la leen —vidriera, checkout, sincronización de
-- canales— y borrarla de golpe es romperlos en el mismo commit que introduce
-- la regla. Pero ya no es un dato: es un reflejo que sólo escribe la base.
-- Una copia puede divergir porque hay dos lugares donde se decide el valor;
-- acá hay uno.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- La ficha guarda las fotos, no una sola imagen
-- ---------------------------------------------------------------------------
-- `imagen` alcanzaba mientras la ficha sólo aparecía en una lista. Si las
-- fotos son únicas y viven acá, acá tiene que estar la galería completa y en
-- orden: la portada es la primera, no otra columna que pueda contradecirla.
alter table catalogo_market
  add column if not exists fotos text[] not null default '{}';

comment on column catalogo_market.fotos is
  'Las fotos del producto, en orden. La portada es la primera. Única fuente: las publicaciones la reflejan.';
comment on column catalogo_market.imagen is
  'Portada. Se mantiene igual a fotos[1]; existe porque hay lecturas que sólo quieren una.';

-- Lo que ya estaba: la ficha se queda con las fotos de su publicación.
update catalogo_market c
   set fotos = b.fotos_base
  from catalog_producto_base b
 where b.ficha_id = c.id
   and coalesce(array_length(c.fotos, 1), 0) = 0
   and coalesce(array_length(b.fotos_base, 1), 0) > 0;

-- Y las que sólo tenían `imagen` la promueven a la galería.
update catalogo_market
   set fotos = array[imagen]
 where coalesce(array_length(fotos, 1), 0) = 0
   and coalesce(btrim(imagen), '') <> '';

-- ---------------------------------------------------------------------------
-- La publicación: su título es suyo, sus fotos no
-- ---------------------------------------------------------------------------
create or replace function public.publicacion_toma_de_la_ficha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f record;
begin
  -- 1. Asegurar la ficha.
  --
  --    OJO CON DEDUCIRLA DEL TÍTULO: el título de una publicación puede ser de
  --    venta -"iPhone 17 256GB Negro | Envío gratis"- y crear una ficha con
  --    ese nombre ensuciaría la Biblioteca con artículos que no existen.
  --
  --    Por eso esto es sólo la red para el camino viejo, donde nadie eligió
  --    ficha. Lo correcto es que la elija quien publica, desde la Biblioteca,
  --    y entonces `ficha_id` ya viene y esto no hace nada.
  if new.ficha_id is null then
    new.ficha_id := ficha_para_publicacion(
      new.tenant_id, new.marca, new.titulo, new.descripcion,
      case when array_length(new.fotos_base, 1) > 0 then new.fotos_base[1] end);
  end if;

  if new.ficha_id is null then
    return new;
  end if;

  select * into f from catalogo_market where id = new.ficha_id;
  if not found then
    return new;
  end if;

  -- 2. Sin título propio, se usa el de la ficha. Con título propio, manda el
  --    propio: es el título de venta y cambiarlo es lo que se permite acá.
  if coalesce(btrim(new.titulo), '') = '' then
    new.titulo := f.nombre;
  end if;

  if coalesce(btrim(new.descripcion), '') = '' then
    new.descripcion := f.descripcion;
  end if;

  -- 3. Las fotos.
  --
  --    Sin elección, se muestran todas las de la ficha: es el arranque
  --    razonable y evita una publicación sin fotos porque nadie eligió.
  --
  --    Con elección, se respeta. No se pisa con la ficha: elegir cuáles
  --    mostrar es precisamente lo que la tienda decide, y sobrescribirlo
  --    borraría esa decisión en cada guardado.
  if coalesce(array_length(new.fotos_base, 1), 0) = 0 then
    new.fotos_base := f.fotos;

  elsif coalesce(array_length(f.fotos, 1), 0) = 0 then
    -- Primera carga: la ficha todavía no tiene fotos y la publicación sí, así
    -- que la ficha se queda con ellas y pasan a estar disponibles para las
    -- demás publicaciones de esta tienda.
    --
    -- SÓLO SI LA FICHA ES DE LA TIENDA. Con `tenant_id` nulo es de la
    -- plataforma y la comparten todas: escribirle las fotos de una sería subir
    -- información de una tienda a Market, la dirección prohibida.
    if f.tenant_id is not null then
      update catalogo_market
         set fotos = new.fotos_base, imagen = new.fotos_base[1]
       where id = new.ficha_id;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.publicacion_toma_de_la_ficha() is
  'El título de la publicación es suyo y se puede cambiar; las fotos vienen de la ficha, que es donde son únicas.';

-- Reemplaza al trigger de la migración anterior, que sólo aseguraba el
-- vínculo. Dos triggers sobre lo mismo es una discusión sobre cuál corre
-- primero que nadie quiere tener.
drop trigger if exists trg_ficha_de_publicacion on catalog_producto_base;
drop trigger if exists trg_publicacion_toma_de_la_ficha on catalog_producto_base;

create trigger trg_publicacion_toma_de_la_ficha
  before insert or update on catalog_producto_base
  for each row
  execute function public.publicacion_toma_de_la_ficha();

-- ---------------------------------------------------------------------------
-- Corregir una foto en la Biblioteca la corrige en todo lo publicado
-- ---------------------------------------------------------------------------
-- Es la otra mitad de que la fuente sea una sola. Sin esto, arreglar una foto
-- mala en la ficha no llegaría a lo que ya está publicado, y las dos cosas
-- volverían a separarse por el camino más silencioso.
--
-- El título NO se propaga: cada publicación tiene el suyo y pisarlo desde acá
-- borraría precisamente lo que la regla 2 permite.
create or replace function public.publicaciones_siguen_a_la_ficha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r      record;
  v_sel  text[];
begin
  -- Vaciar las fotos de la ficha no vacía lo publicado. Es casi siempre un
  -- accidente, y dejar sin fotos a todo lo que se está vendiendo es un daño
  -- que no se deshace con un ctrl+Z.
  if coalesce(array_length(new.fotos, 1), 0) = 0 then
    return null;
  end if;

  for r in select id, fotos_base from catalog_producto_base where ficha_id = new.id
  loop
    -- Se QUITAN las que ya no existen en la ficha. No se agregan las nuevas:
    -- la publicación eligió las suyas, y aparecerle una foto que nadie puso
    -- es tan malo como perder una que sí puso.
    v_sel := array(select x from unnest(coalesce(r.fotos_base, '{}')) x
                    where x = any(new.fotos));

    -- Si no le quedó ninguna, muestra las de la ficha: sin fotos no se vende.
    if coalesce(array_length(v_sel, 1), 0) = 0 then
      v_sel := new.fotos;
    end if;

    -- Sólo si cambia: sin update no hay otro disparo, y la ida y vuelta entre
    -- los dos triggers se corta sola.
    if v_sel is distinct from r.fotos_base then
      update catalog_producto_base set fotos_base = v_sel where id = r.id;
    end if;
  end loop;

  return null;
end;
$$;

comment on function public.publicaciones_siguen_a_la_ficha() is
  'Borrar una foto de la ficha la saca de lo publicado. Agregar una no la impone: cuáles se muestran lo decide cada publicación.';

drop trigger if exists trg_publicaciones_siguen_a_la_ficha on catalogo_market;

create trigger trg_publicaciones_siguen_a_la_ficha
  after update of fotos on catalogo_market
  for each row
  execute function public.publicaciones_siguen_a_la_ficha();

-- ---------------------------------------------------------------------------
-- Alinear lo que ya estaba
-- ---------------------------------------------------------------------------
-- No cambia nada por sí mismo: dispara el trigger fila por fila y deja el
-- histórico consistente con su ficha desde hoy.
update catalog_producto_base set ficha_id = ficha_id;

commit;
