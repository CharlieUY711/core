-- ===========================================================================
-- Cambiar de tienda no puede pasar por un estado invalido
-- ===========================================================================
--
-- EL SINTOMA
-- Se podia ir a una tienda y no se podia volver. Siempre la misma direccion,
-- no a veces: "duplicate key value violates unique constraint
-- idx_store_members_one_default".
--
-- LA CAUSA
-- El indice `idx_store_members_one_default` es UNIQUE (user_id) WHERE
-- is_default: un solo default por usuario. La funcion lo hacia en UN update:
--
--     update store_members set is_default = (store_id = p_store_id)
--      where user_id = auth.uid();
--
-- Postgres recorre las filas en orden fisico y valida el indice unico fila por
-- fila, no al final de la sentencia. Si la fila que hay que prender viene ANTES
-- que la que hay que apagar, en el medio quedan dos en true y el indice salta.
--
-- Por eso funcionaba en un sentido: se podia bajar por el orden fisico -apagar
-- la de arriba y prender la de abajo- y nunca subir. No dependia del usuario ni
-- del momento: dependia de en que orden estaban las filas en la tabla.
--
-- LA CORRECCION
-- Dos sentencias. Primero se apaga la que estaba, despues se prende la nueva.
-- Entre una y otra el usuario queda sin default por un instante, y eso SI es un
-- estado valido: el hook del token ya resuelve ese caso -ordena por is_default
-- y despues por created_at, asi que sin default toma la mas antigua-.
--
-- No se toca el indice. La regla "un solo default" es correcta; lo que estaba
-- mal era como se llegaba de un default al otro.
-- ===========================================================================

create or replace function public.cambiar_tienda_activa(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from store_members m
      join stores s on s.id = m.store_id
     where m.user_id = auth.uid() and m.store_id = p_store_id and s.is_active)
  then
    raise exception 'No administrás esa tienda, o está inactiva.' using errcode = '42501';
  end if;

  -- Primero apagar. Nunca puede haber dos prendidas al mismo tiempo, ni
  -- siquiera en el medio de la sentencia.
  update store_members set is_default = false
   where user_id = auth.uid() and is_default and store_id <> p_store_id;

  update store_members set is_default = true
   where user_id = auth.uid() and store_id = p_store_id and not is_default;
end;
$$;

grant  execute on function public.cambiar_tienda_activa(uuid) to authenticated;
revoke execute on function public.cambiar_tienda_activa(uuid) from public, anon;
