-- ===========================================================================
-- Guardar los detalles del artículo
-- ===========================================================================
--
-- `catalog_producto_base` tiene columnas para garantía, peso, dimensiones,
-- material, origen y tipo de envío. Ninguna RPC las escribe: `crear_publicacion`
-- y `actualizar_publicacion` llegan hasta el SKU y nada más.
--
-- Eso dejaba la interfaz sin salida. Los campos existían en el editor viejo de
-- pestañas, se extrajeron a un bloque reutilizable, y ese bloque quedó sin usar
-- porque ponerlo habría mostrado cuatro campos donde sólo uno persiste — que es
-- peor que no tenerlos: se escriben, se ven guardados, y no están.
--
-- SON DATOS QUE PIDE EL CANAL
-- Garantía y tipo de envío no son adorno: Mercado Libre los pide, y hoy la
-- única forma de completarlos es a mano en la base.
--
-- TODO NULLABLE, TODO OPCIONAL
-- Ninguno bloquea el alta. Pasar null deja la columna como está en vez de
-- borrarla: así la pantalla puede mandar sólo lo que el usuario tocó sin tener
-- que reenviar el resto.
-- ===========================================================================

begin;

create or replace function public.guardar_detalles_articulo(
  p_variant_id   uuid,
  p_garantia     text default null,
  p_peso         text default null,
  p_dimensiones  text default null,
  p_material     text default null,
  p_origen       text default null,
  p_tipo_envio   text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_base uuid;
begin
  select v.producto_base_id into v_base
    from catalog_variante v
   where v.id = p_variant_id;

  if v_base is null then
    raise exception 'La publicación no existe o no pertenece a esta tienda.'
      using errcode = '42501';
  end if;

  -- coalesce y no asignación directa: null significa "no lo mandé", no
  -- "borralo". Vaciar un campo se hace mandando el string vacío.
  update catalog_producto_base b set
    garantia    = coalesce(p_garantia,    b.garantia),
    peso        = coalesce(p_peso,        b.peso),
    dimensiones = coalesce(p_dimensiones, b.dimensiones),
    material    = coalesce(p_material,    b.material),
    origen      = coalesce(p_origen,      b.origen),
    tipo_envio  = coalesce(p_tipo_envio,  b.tipo_envio),
    updated_at  = now()
  where b.id = v_base;
end;
$$;

comment on function public.guardar_detalles_articulo(uuid, text, text, text, text, text, text) is
  'Escribe los detalles del articulo que ninguna otra RPC tocaba. NULL deja la columna como esta; para vaciar un campo se manda el string vacio.';

grant execute on function public.guardar_detalles_articulo(uuid, text, text, text, text, text, text) to authenticated;

commit;
