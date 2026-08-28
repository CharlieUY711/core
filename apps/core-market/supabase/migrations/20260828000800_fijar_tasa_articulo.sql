-- ===========================================================================
-- Fijar (o soltar) la tasa de un articulo
-- ===========================================================================
--
-- El formulario guarda por `crear_publicacion` / `actualizar_publicacion`, que
-- ya reciben ocho parametros cada una. Agregarles uno mas -y a las dos- para
-- una excepcion que casi nunca se usa las hace mas dificiles de leer sin que
-- ganen nada: la tasa no es parte de dar de alta un articulo, es una decision
-- aparte que se toma pocas veces.
--
-- NULL NO ES "SIN IMPUESTO"
-- Pasar null suelta la excepcion y devuelve el articulo a la tasa que le
-- corresponde por su taxonomia. "Sin impuesto" es la tasa Exento, que es una
-- tasa de verdad -0%- y se elige como cualquier otra. Confundirlas seria
-- vender sin IVA por accidente.
-- ===========================================================================

begin;

create or replace function public.fijar_tasa_articulo(
  p_variant_id  uuid,
  p_tax_rate_id uuid default null
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

  if p_tax_rate_id is not null
     and not exists (select 1 from tax_rates where id = p_tax_rate_id and status = 'active') then
    raise exception 'La tasa indicada no existe o está inactiva.' using errcode = '22023';
  end if;

  update catalog_producto_base
     set tax_rate_id = p_tax_rate_id,
         updated_at  = now()
   where id = v_base;
end;
$$;

comment on function public.fijar_tasa_articulo(uuid, uuid) is
  'Fija la excepcion de tasa de un articulo. NULL la suelta y vuelve a heredar de su taxonomia; "sin impuesto" es la tasa Exento, no NULL.';

grant execute on function public.fijar_tasa_articulo(uuid, uuid) to authenticated;

commit;
