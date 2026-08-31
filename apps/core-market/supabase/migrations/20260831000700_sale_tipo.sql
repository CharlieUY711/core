-- ===========================================================================
-- Sale `stores.tipo`
-- ===========================================================================
--
-- Ver docs/architecture/vendedor.md, paso 6. Va al final y sola, cuando ya está
-- claro que nadie la necesitó.
--
-- POR QUÉ SE VA
-- Estaba en null en las dos filas y no la leía nadie. La primera versión del
-- modelo la iba a usar para separar `tienda` de `persona`; eso quedó descartado
-- —un vendedor es un vendedor, y la única diferencia es el documento—.
--
-- Dejarla no es neutro: una columna llamada `tipo` en la tabla del vendedor
-- invita a que alguien la use para bifurcar, que es exactamente lo que este
-- modelo evita. Se saca para que la pregunta "¿de qué tipo es este vendedor?"
-- no tenga dónde apoyarse.
--
-- Lo que la reemplaza ya existe y dice más:
--   `documento_clase`  — con qué se identifica.
--   `vidrieras`        — dónde se muestra. Tener tienda es tener `market`.
--   `capacidades`      — qué puede hacer.
--
-- ORDEN
-- Primero se saca la referencia de `crear_tienda` —que la insertaba explícita
-- en null— y recién después la columna. Postgres no valida los cuerpos de las
-- funciones al hacer el drop: si se hiciera al revés, la migración pasaría y la
-- función se rompería recién la próxima vez que alguien cree un vendedor.
-- ===========================================================================

begin;

drop function if exists public.crear_tienda(text, text, text, text[], text[], text, text, text, text);

create function public.crear_tienda(
  p_codigo text, p_nombre text, p_owner_email text default null,
  p_capacidades text[] default '{}', p_vidrieras text[] default '{}',
  p_moneda_base text default 'UYU', p_pais text default 'UY',
  p_documento_clase text default null, p_documento_numero text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_owner uuid;
  v_id    uuid;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market crea vendedores desde acá.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_codigo), '') = '' or coalesce(btrim(p_nombre), '') = '' then
    raise exception 'El vendedor necesita código y nombre.' using errcode = '22023';
  end if;
  if exists (select 1 from stores where codigo = btrim(p_codigo)) then
    raise exception 'Ya existe un vendedor con el código "%".', btrim(p_codigo)
      using errcode = '23505';
  end if;

  if coalesce(btrim(p_owner_email), '') <> '' then
    select id into v_owner from auth.users where lower(email) = lower(btrim(p_owner_email));
    if v_owner is null then
      raise exception 'No hay ningún usuario con el correo "%". El vendedor necesita un dueño que exista.',
        btrim(p_owner_email) using errcode = 'P0002';
    end if;
  end if;

  insert into stores (
    codigo, nombre, owner_id, is_active, es_plataforma,
    capacidades, vidrieras, moneda_base, pais,
    documento_clase, documento_numero
  ) values (
    btrim(p_codigo), btrim(p_nombre), v_owner, true, false,
    coalesce(p_capacidades, '{}'), coalesce(p_vidrieras, '{}'),
    nullif(btrim(coalesce(p_moneda_base, '')), ''),
    nullif(btrim(coalesce(p_pais, '')), ''),
    nullif(btrim(coalesce(p_documento_clase, '')), ''),
    nullif(btrim(coalesce(p_documento_numero, '')), '')
  )
  returning id into v_id;

  -- Sin esta fila el hook no le pone `store_id` al token y el dueño entra sin
  -- vendedor: ve el panel vacío y no hay nada que se lo explique.
  if v_owner is not null then
    insert into store_members (store_id, user_id, is_default)
    values (v_id, v_owner,
            not exists (select 1 from store_members m where m.user_id = v_owner))
    on conflict do nothing;
  end if;

  return v_id;
end;
$FN$;

grant  execute on function public.crear_tienda(text, text, text, text[], text[], text, text, text, text) to authenticated;
revoke execute on function public.crear_tienda(text, text, text, text[], text[], text, text, text, text) from public, anon;

alter table public.stores drop column if exists tipo;

commit;
