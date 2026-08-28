-- ===========================================================================
-- Portar la vidriera publica al modelo Producto Base / Variante
-- ===========================================================================
--
-- catalog_vidriera se perdio en la reorganizacion del catalogo. Es la puerta
-- publica de la tienda: sin ella el sitio no muestra nada y el carrito no puede
-- resolver lo que alguien ya tenia adentro.
--
-- El modelo nuevo la simplifica bastante. Antes habia que salir a buscar el
-- precio con resolve_price, las fotos a catalog_media y el stock sumando
-- catalog_inventory por ubicacion. Ahora `precio`, `moneda`, `stock` y
-- `fotos_base` / `fotos_especificas` estan en el producto y en la variante.
--
-- SIGUE SIENDO SECURITY DEFINER, y a proposito: es la unica funcion que un
-- visitante sin sesion puede ejecutar, y por eso filtra ella misma lo que
-- expone -solo canales publicos y solo lo que esta activo-. Sin eso, abrir la
-- tienda a anonimos obligaria a abrir las tablas.
-- ===========================================================================

begin;

drop function if exists public.catalog_vidriera(text, integer);
drop function if exists public.catalog_vidriera(text, integer, uuid[]);

create or replace function public.catalog_vidriera(
  p_currency text    default 'UYU',
  p_limit    integer default 100,
  p_ids      uuid[]  default null
)
returns table (
  id                  uuid,
  nombre              text,
  descripcion         text,
  tipo                text,
  precio              numeric,
  precio_original     numeric,
  moneda              text,
  imagen_principal    text,
  imagenes            jsonb,
  videos              jsonb,
  departamento_nombre text,
  condicion           text,
  stock               bigint,
  published_at        timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id,
    -- El nombre de la variante manda si lo tiene: "iPhone 17 256 GB Azul" le
    -- dice mas a quien compra que el titulo del producto base.
    coalesce(nullif(btrim(v.nombre_variante), ''), b.titulo) as nombre,
    b.descripcion,
    l.channel                                   as tipo,
    v.precio,
    null::numeric                               as precio_original,
    coalesce(v.moneda, p_currency)              as moneda,
    -- Las fotos especificas de la variante van primero: muestran el color y la
    -- version que se esta comprando. Las del producto base son el respaldo.
    coalesce(
      (array_remove(v.fotos_especificas, null))[1],
      (array_remove(b.fotos_base, null))[1]
    )                                           as imagen_principal,
    coalesce(
      to_jsonb(array_remove(
        coalesce(v.fotos_especificas, '{}') || coalesce(b.fotos_base, '{}'), null)),
      '[]'::jsonb
    )                                           as imagenes,
    coalesce(to_jsonb(array_remove(b.video, null)), '[]'::jsonb) as videos,
    d.nombre                                    as departamento_nombre,
    b.tipo                                      as condicion,
    coalesce(v.stock, 0)::bigint                as stock,
    l.updated_at                                as published_at
  from catalog_canal_listing l
  join catalog_variante      v on v.id = l.variante_id
  join catalog_producto_base b on b.id = v.producto_base_id
  left join departamentos    d on d.id = b.departamento_id

  where l.channel in ('market', 'secondhand')
    and l.status   = 'active'
    and b.status   = 'active'
    and v.status   = 'active'
    -- Filtro opcional: NULL deja la vidriera completa. Lo usa el carrito para
    -- resolver por id lo que ya tenia adentro, sin traer el catalogo entero.
    and (p_ids is null or v.id = any(p_ids))
  order by l.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

comment on function public.catalog_vidriera(text, integer, uuid[]) is
  'Puerta publica de la tienda sobre el modelo Producto Base / Variante. SECURITY DEFINER: filtra ella misma a canales publicos y estado activo, para no tener que abrir las tablas a anonimos.';

grant execute on function public.catalog_vidriera(text, integer, uuid[])
  to anon, authenticated;

commit;
