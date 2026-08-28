-- ===========================================================================
-- ¿Hay algo para deshacer?
-- ===========================================================================
--
-- `revertir_ultimo_cambio` existe y funciona desde hace días, pero no hay forma
-- de saber si tiene algo que revertir sin llamarla — y llamarla ya revierte.
-- Sin esto, la pantalla tendría que ofrecer "Deshacer" siempre y fallar cuando
-- no hay respaldo, que es ofrecer algo que no se puede hacer.
--
-- Devuelve CUÁNDO se tomó el respaldo, no un booleano. "Deshacer" a secas no
-- dice qué se va a perder; "deshacer el cambio de hace 3 minutos" sí, y esa es
-- la diferencia entre poder decidir y tener que adivinar.
-- ===========================================================================

begin;

create or replace function public.hay_deshacer(p_variant_id uuid)
returns timestamptz
language sql
stable
security invoker
set search_path = public
as $$
  select b.version_anterior_at
    from catalog_variante v
    join catalog_producto_base b on b.id = v.producto_base_id
   where v.id = p_variant_id
     and b.version_anterior is not null;
$$;

comment on function public.hay_deshacer(uuid) is
  'Cuando se tomo el respaldo del articulo, o NULL si no hay ninguno. Devuelve la fecha y no un booleano para poder decir que cambio se va a deshacer.';

grant execute on function public.hay_deshacer(uuid) to authenticated;

commit;
