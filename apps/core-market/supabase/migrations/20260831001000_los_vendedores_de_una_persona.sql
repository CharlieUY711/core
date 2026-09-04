-- ===========================================================================
-- Los vendedores de una persona
-- ===========================================================================
--
-- Es la misma relación que `miembros_de_tienda`, mirada al revés: de una
-- persona, en qué vendedores está y con qué rol.
--
-- POR QUÉ HACE FALTA LA VUELTA
-- Desde el vendedor se ve quién trabaja ahí. Cuando alguien escribe "no puedo
-- entrar", la pregunta es la otra: en qué vendedores está esta persona. Con la
-- primera habría que abrir vendedor por vendedor buscando en cuál figura, y si
-- no figura en ninguno —que es la respuesta— no hay forma de saberlo mirando
-- vendedores.
--
-- NO HAY FUNCIONES NUEVAS PARA ESCRIBIR
-- Sumar, cambiar el rol y sacar se siguen haciendo con `agregar_miembro`,
-- `cambiar_rol_miembro` y `sacar_miembro`, que ya existen y ya tienen su
-- guarda. Escribir otras para "desde Personas" sería el segundo lugar donde se
-- decide quién puede qué, y el que se olvida siempre es el segundo.
-- ===========================================================================

begin;

create or replace function public.vendedores_de_la_persona(p_user_id uuid)
returns table (
  store_id uuid, nombre text, codigo text, es_plataforma boolean,
  activa boolean, rol text, es_predeterminado boolean, desde timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $FN$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market ve en qué vendedores está una persona.'
      using errcode = '42501';
  end if;

  return query
    select s.id, s.nombre, s.codigo, s.es_plataforma, s.is_active,
           m.rol, m.is_default, m.created_at
      from store_members m
      join stores s on s.id = m.store_id
     where m.user_id = p_user_id
     order by s.es_plataforma desc, s.nombre;
end;
$FN$;

grant  execute on function public.vendedores_de_la_persona(uuid) to authenticated;
revoke execute on function public.vendedores_de_la_persona(uuid) from public, anon;

commit;
