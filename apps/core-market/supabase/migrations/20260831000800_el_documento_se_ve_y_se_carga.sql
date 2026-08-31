-- ===========================================================================
-- El documento del vendedor se ve y se carga
-- ===========================================================================
--
-- Las columnas existen desde `el_vendedor_se_identifica`, pero ninguna consulta
-- las devolvía y ninguna función las escribía desde la pantalla: un dato que se
-- puede guardar y no se puede ver ni cargar es un dato que no existe todavía.
--
-- Es la MISMA falla que tuvieron las fotos y la marca, y por eso se hacen las
-- dos mitades juntas: leer y escribir.
-- ===========================================================================

begin;

-- ── Se ve ──────────────────────────────────────────────────────────────
drop function if exists public.listar_tiendas();

create function public.listar_tiendas()
returns table (
  id uuid, codigo text, nombre text, es_plataforma boolean, activa boolean,
  capacidades text[], vidrieras text[], moneda_base text, pais text,
  owner_id uuid, owner_email text, publicaciones bigint, fichas bigint,
  creada timestamptz,
  documento_clase text, documento_numero text
)
language plpgsql
stable
security definer
set search_path = public
as $FN$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market administra los vendedores.' using errcode = '42501';
  end if;

  return query
    select s.id, s.codigo, s.nombre, s.es_plataforma, s.is_active,
           s.capacidades, s.vidrieras, s.moneda_base, s.pais,
           s.owner_id,
           (select u.email::text from auth.users u where u.id = s.owner_id),
           (select count(*) from catalog_producto_base b where b.tenant_id = s.id),
           (select count(*) from catalogo_market c where c.tenant_id = s.id),
           s.created_at,
           s.documento_clase, s.documento_numero
      from stores s
     order by s.es_plataforma desc, s.nombre;
end;
$FN$;

grant  execute on function public.listar_tiendas() to authenticated;
revoke execute on function public.listar_tiendas() from public, anon;

-- ── Se carga ───────────────────────────────────────────────────────────
-- `actualizar_tienda` no recibía el documento. Se agrega con la convención que
-- ya usa el resto: null es "no lo mandes", vacío SÍ borra.
--
-- Y valida el par completo, que es lo que hace falta: un número sin clase no
-- dice si es registro fiscal o documento de identidad, y una clase sin número
-- no identifica a nadie. Guardar la mitad sería guardar algo que no se puede
-- usar, y descubrirlo el día que haya que emitir algo.
create or replace function public.actualizar_documento_de_vendedor(
  p_id uuid, p_clase text, p_numero text
) returns void
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_clase  text := nullif(btrim(coalesce(p_clase, '')), '');
  v_numero text := nullif(btrim(coalesce(p_numero, '')), '');
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market cambia el documento de un vendedor.'
      using errcode = '42501';
  end if;

  if (v_clase is null) <> (v_numero is null) then
    raise exception 'El documento va completo: clase y número, o ninguno de los dos.'
      using errcode = '22023';
  end if;

  if v_clase is not null and v_clase not in ('rut', 'ci') then
    raise exception 'La clase de documento tiene que ser rut o ci.' using errcode = '22023';
  end if;

  -- El índice único ya lo impide, pero un error de clave no le explica nada a
  -- nadie: se dice cuál es el problema.
  if v_numero is not null and exists (
       select 1 from stores
        where documento_clase = v_clase and documento_numero = v_numero
          and id <> p_id) then
    raise exception 'Ya hay otro vendedor registrado con ese documento.'
      using errcode = '23505';
  end if;

  update stores
     set documento_clase = v_clase, documento_numero = v_numero, updated_at = now()
   where id = p_id;

  if not found then
    raise exception 'No existe ese vendedor.' using errcode = 'P0002';
  end if;
end;
$FN$;

grant  execute on function public.actualizar_documento_de_vendedor(uuid, text, text) to authenticated;
revoke execute on function public.actualizar_documento_de_vendedor(uuid, text, text) from public, anon;

commit;
