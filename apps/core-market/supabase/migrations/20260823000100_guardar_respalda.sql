-- ===========================================================================
-- Guardar toma la foto del estado anterior
-- ===========================================================================
--
-- Es lo que hace que deshacer sea posible, y tiene que pasar dentro de la misma
-- funcion: si lo hiciera quien llama, cualquier otra via de escritura -un
-- script, otra pantalla- dejaria el respaldo desactualizado sin que se note.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.actualizar_publicacion(p_variant_id uuid, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_price numeric DEFAULT NULL::numeric, p_currency text DEFAULT 'UYU'::text, p_sku text DEFAULT NULL::text, p_stock integer DEFAULT NULL::integer, p_tipo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_base uuid;
begin
  -- El select ya pasa por RLS: si la variante es de otra tienda, no aparece.
  select v.producto_base_id into v_base
    from catalog_variante v
   where v.id = p_variant_id;

  if v_base is null then
    raise exception 'La publicaciÃ³n no existe o no pertenece a esta tienda.'
      using errcode = '42501';
  end if;

  -- La foto se toma ANTES de tocar nada: despues ya no existe el estado que
  -- habria que guardar. Solo cuando hay algo que cambiar, para que abrir y
  -- cerrar sin editar no consuma el respaldo que quiza hacia falta.
  if p_title is not null or p_description is not null or p_status is not null
     or p_tipo is not null or p_price is not null or p_sku is not null
     or p_stock is not null then
    update catalog_producto_base
       set version_anterior    = snapshot_articulo(v_base),
           version_anterior_at = now()
     where id = v_base;
  end if;

  if p_tipo is not null and p_tipo not in ('market','secondhand') then
    raise exception 'tipo debe ser market o secondhand.' using errcode = '22023';
  end if;

  if p_title is not null or p_description is not null or p_status is not null or p_tipo is not null then
    update catalog_producto_base
       set titulo      = coalesce(nullif(btrim(p_title), ''), titulo),
           descripcion = coalesce(p_description, descripcion),
           status      = coalesce(p_status::catalog_item_status, status),
           tipo        = coalesce(p_tipo, tipo),
           updated_at  = now()
     where id = v_base;
  end if;

  if p_price is not null or p_sku is not null or p_stock is not null then
    update catalog_variante
       set precio     = coalesce(p_price, precio),
           sku_variante = coalesce(nullif(btrim(p_sku), ''), sku_variante),
           stock      = coalesce(p_stock, stock),
           moneda     = coalesce(nullif(p_currency,''), moneda),
           updated_at = now()
     where id = p_variant_id;
  end if;
end;
$function$

