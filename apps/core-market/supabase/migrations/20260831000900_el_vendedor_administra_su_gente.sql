-- ===========================================================================
-- El vendedor administra su propia gente
-- ===========================================================================
--
-- LO QUE YA ESTABA
-- `puede_administrar_miembros` dice: la plataforma O el dueño de ese vendedor.
-- `agregar_miembro`, `cambiar_rol_miembro` y `sacar_miembro` ya la respetan, y
-- la pantalla de miembros ya las llama.
--
-- LO QUE FALTABA: LA PUERTA
-- La página del vendedor se alimenta de `listar_tiendas()`, que exige
-- `soy_la_plataforma()`. Así que el permiso existía y no había por dónde
-- ejercerlo: un dueño podía administrar a su gente según la base, y no tenía
-- ninguna pantalla desde donde hacerlo.
--
-- `datos_del_vendedor` devuelve UN vendedor a quien tenga por qué verlo: la
-- plataforma, o alguien que trabaje ahí. Es la misma forma que devuelve
-- `listar_tiendas`, así que la página no cambia de datos según quién entre —
-- cambia qué puede TOCAR, y eso lo siguen decidiendo las funciones que
-- escriben, cada una con su guarda.
--
-- POR QUE NO SE AFLOJA `listar_tiendas`
-- Porque listar es otra cosa: ver la lista de TODOS los vendedores es una
-- capacidad de la plataforma. Ver el propio no lo es. Aflojar la de la lista
-- para resolver esto habría dado de más.
-- ===========================================================================

begin;

create or replace function public.datos_del_vendedor(p_id uuid)
returns table (
  id uuid, codigo text, nombre text, es_plataforma boolean, activa boolean,
  capacidades text[], vidrieras text[], moneda_base text, pais text,
  owner_id uuid, owner_email text, publicaciones bigint, fichas bigint,
  creada timestamptz, documento_clase text, documento_numero text,
  -- Qué puede hacer QUIEN PREGUNTA sobre este vendedor. Va en la misma
  -- respuesta y no en otra llamada: la pantalla necesita las dos cosas juntas,
  -- y con dos llamadas hay un instante en que dibuja con una sola.
  puedo_configurar boolean, puedo_administrar_miembros boolean
)
language plpgsql
stable
security definer
set search_path = public
as $FN$
begin
  if not (soy_la_plataforma() or exists (
            select 1 from store_members m
             where m.store_id = p_id and m.user_id = auth.uid()))
  then
    raise exception 'No trabajás en ese vendedor.' using errcode = '42501';
  end if;

  return query
    select s.id, s.codigo, s.nombre, s.es_plataforma, s.is_active,
           s.capacidades, s.vidrieras, s.moneda_base, s.pais,
           s.owner_id,
           (select u.email::text from auth.users u where u.id = s.owner_id),
           (select count(*) from catalog_producto_base b where b.tenant_id = s.id),
           (select count(*) from catalogo_market c where c.tenant_id = s.id),
           s.created_at, s.documento_clase, s.documento_numero,
           soy_la_plataforma(),
           puede_administrar_miembros(s.id)
      from stores s
     where s.id = p_id;
end;
$FN$;

grant  execute on function public.datos_del_vendedor(uuid) to authenticated;
revoke execute on function public.datos_del_vendedor(uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- Y cuál es el mío
-- ---------------------------------------------------------------------------
-- Para que la pantalla pueda abrirse en "el vendedor en el que estoy trabajando"
-- sin que el navegador tenga que saber ningún id.
create or replace function public.mi_vendedor()
returns uuid
language sql
stable
security definer
set search_path = public
as $FN$
  select ((auth.jwt() ->> 'store_id')::uuid)
$FN$;

grant  execute on function public.mi_vendedor() to authenticated;
revoke execute on function public.mi_vendedor() from public, anon;

-- ---------------------------------------------------------------------------
-- La entrada del menú
-- ---------------------------------------------------------------------------
-- NO es `solo_plataforma`: es justamente la que hace falta para el que no es la
-- plataforma. La plataforma la ve también —también es un vendedor— y no le
-- estorba.
insert into public.plataforma_apps
  (codigo, tipo, nombre, icono, para, orden, activa, en_sidebar, solo_plataforma, obligatoria)
values
  ('mi_vendedor', 'funcionalidad', 'Mi vendedor', '🏷️',
   'Quiénes trabajan acá y qué puede cada uno.',
   200, true, true, false, true)
on conflict (codigo) do update
   set nombre = excluded.nombre, icono = excluded.icono, para = excluded.para,
       en_sidebar = excluded.en_sidebar, solo_plataforma = excluded.solo_plataforma,
       obligatoria = excluded.obligatoria, orden = excluded.orden;

commit;
