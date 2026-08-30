-- ===========================================================================
-- Borrar borra. Y la Biblioteca se puede editar.
-- ===========================================================================
--
-- LO QUE PASABA
--
--   1. "Eliminar" en Publicaciones NO eliminaba: llamaba a `chSt(ids,
--      "archived")`, el mismo código que el botón "Archivar" de al lado. La
--      fila se sacaba de la pantalla con un filtro en memoria, así que parecía
--      borrada hasta que alguien refrescaba y volvía.
--
--   2. Y archivar tampoco escondía nada, porque `catalog_publicaciones` no
--      filtra por estado: devuelve todo, archivados incluidos.
--
--   3. En la Biblioteca no se podía borrar ni editar nada, y la razón es más
--      de fondo: `catalogo_market` sólo tiene política de SELECT. No hay
--      UPDATE ni DELETE para nadie. La tabla es de sólo lectura y todo lo que
--      escribe pasa por funciones.
--
-- POR QUÉ AHORA SÍ SE PUEDE BORRAR UNA PUBLICACIÓN
-- Porque ya no se pierde nada. Antes, borrar una publicación era borrar lo
-- único que la tienda sabía del producto —el título, las fotos, la
-- descripción— y por eso el botón terminó archivando: era menos malo mentir
-- que destruir.
--
-- Con la Biblioteca como fuente, borrar una publicación saca la capa
-- comercial y el conocimiento queda. Se puede volver a publicar mañana sin
-- cargar nada de nuevo. Recién ahora "Eliminar" puede eliminar de verdad.
--
-- QUÉ SIGUE SIN PODERSE, Y ESTÁ BIEN
-- Editar o borrar una ficha de la PLATAFORMA. Son compartidas: una tienda que
-- las corrige se las corrige a todas. La información va de Market a las
-- tiendas, no al revés.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Borrar publicaciones
-- ---------------------------------------------------------------------------
-- Recibe ids de variante porque eso es lo que muestra la lista: cada fila es
-- una variante, no un producto base.
--
-- Las cascadas ya existen y hacen lo suyo: variante → listings de canal y
-- líneas de precio. Lo que hay que decidir acá es el base: si se quedó sin
-- variantes no es una publicación, es una fila huérfana, y se va.
create or replace function public.eliminar_publicacion(p_variant_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := ((auth.jwt() ->> 'store_id')::uuid);
  v_bases  uuid[];
  v_n      integer;
begin
  if v_tenant is null then
    raise exception 'No hay tienda en la sesión.' using errcode = '42501';
  end if;
  if p_variant_ids is null or array_length(p_variant_ids, 1) is null then
    return 0;
  end if;

  -- Sólo las de esta tienda. El filtro por `tenant_id` va acá y no se delega
  -- al RLS porque la función es SECURITY DEFINER: adentro el RLS no corre.
  select array_agg(distinct v.producto_base_id) into v_bases
    from catalog_variante v
    join catalog_producto_base b on b.id = v.producto_base_id
   where v.id = any(p_variant_ids)
     and b.tenant_id = v_tenant;

  delete from catalog_variante v
   using catalog_producto_base b
   where v.producto_base_id = b.id
     and v.id = any(p_variant_ids)
     and b.tenant_id = v_tenant;

  get diagnostics v_n = row_count;

  -- El base sin variantes se va. La ficha NO: es lo que queda para volver a
  -- publicar sin cargar nada de nuevo.
  delete from catalog_producto_base b
   where b.id = any(coalesce(v_bases, '{}'))
     and b.tenant_id = v_tenant
     and not exists (select 1 from catalog_variante v where v.producto_base_id = b.id);

  return v_n;
end;
$$;

comment on function public.eliminar_publicacion(uuid[]) is
  'Borra publicaciones de verdad. La ficha queda en la Biblioteca: se puede volver a publicar sin cargar nada.';

grant execute on function public.eliminar_publicacion(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Editar una ficha propia
-- ---------------------------------------------------------------------------
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

  -- Las de la plataforma son compartidas: corregirlas acá se las corrige a
  -- todas las tiendas. Si esta tienda necesita otra versión, lo que
  -- corresponde es su propia ficha, no editar la de todos.
  if f.tenant_id is null then
    raise exception 'Esta ficha es de la plataforma y la comparten todas las tiendas. Guardala como ficha propia para cambiarla.'
      using errcode = '42501';
  end if;

  if f.tenant_id <> v_tenant then
    raise exception 'La ficha no es de esta tienda.' using errcode = '42501';
  end if;

  -- Cambiar el nombre cambia la identidad -es (tienda, marca, título)- así que
  -- puede chocar con otra ficha. El índice único lo impide; el mensaje lo
  -- explica, porque "duplicate key" no le dice nada a nadie.
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

  update catalogo_market set
    nombre      = coalesce(nullif(btrim(p_nombre), ''), nombre),
    nombre_norm = case when coalesce(btrim(p_nombre), '') <> ''
                       then normalizar_texto(p_nombre) else nombre_norm end,
    marca       = coalesce(nullif(btrim(p_marca), ''), marca),
    marca_norm  = case when coalesce(btrim(p_marca), '') <> ''
                       then normalizar_texto(p_marca) else marca_norm end,
    -- Familia y descripción SÍ se pueden vaciar: mandar el string vacío es
    -- pedir que se borren. Null es "no lo mandé".
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

comment on function public.actualizar_ficha_biblioteca(uuid, text, text, text, text, text[]) is
  'Edita una ficha propia. Las de la plataforma no se tocan: son de todas las tiendas.';

grant execute on function public.actualizar_ficha_biblioteca(uuid, text, text, text, text, text[])
  to authenticated;

-- ---------------------------------------------------------------------------
-- Borrar una ficha propia
-- ---------------------------------------------------------------------------
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

  if f.tenant_id is null then
    raise exception 'Esta ficha es de la plataforma y la comparten todas las tiendas: no se puede borrar desde acá.'
      using errcode = '42501';
  end if;
  if f.tenant_id <> v_tenant then
    raise exception 'La ficha no es de esta tienda.' using errcode = '42501';
  end if;

  -- Una ficha con publicaciones es la fuente de algo que se está vendiendo.
  -- La clave foránea ya lo impediría, pero con un error que no explica nada:
  -- el mensaje importa más que el bloqueo.
  select count(*) into v_publicaciones
    from catalog_producto_base where ficha_id = p_id;

  if v_publicaciones > 0 then
    raise exception 'No se puede borrar: hay % publicación(es) que salen de esta ficha. Borrá primero las publicaciones.',
      v_publicaciones using errcode = '23503';
  end if;

  delete from catalogo_market where id = p_id;
end;
$$;

comment on function public.eliminar_ficha_biblioteca(uuid) is
  'Borra una ficha propia sin publicaciones. Explica por qué cuando no se puede, en vez de un error de clave foránea.';

grant execute on function public.eliminar_ficha_biblioteca(uuid) to authenticated;

commit;
