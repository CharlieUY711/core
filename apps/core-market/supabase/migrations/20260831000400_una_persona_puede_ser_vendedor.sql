-- ===========================================================================
-- Una persona puede darse de alta como vendedor
-- ===========================================================================
--
-- Ver docs/architecture/vendedor.md.
--
-- LO QUE FALTABA
-- `crear_tienda` exige `soy_la_plataforma()`: hasta hoy SOLO CORE Market podia
-- crear vendedores. Una persona que quiere vender algo suyo no tenia como
-- existir como vendedor, y por eso terminaba publicando dentro de la empresa
-- que administra.
--
-- QUE DISTINGUE A ESE VENDEDOR
-- El documento, y nada mas. No hay una clase "particular": hay un vendedor que
-- se identifica con documento de identidad en vez de registro fiscal. Todo lo
-- demas -miembros, catalogo, medios, canales- es igual que el de una empresa.
--
-- Por eso `crear_mi_vendedor` EXIGE el numero. No es burocracia: es lo unico
-- que lo identifica, y sin eso "el vendedor de esta persona" no se puede
-- encontrar sin inventar una marca aparte -que seria una clase con otro
-- nombre-. Ademas hace verdadera una regla que conviene que lo sea: no se
-- vende sin decir quien vende.
--
-- ES IDEMPOTENTE
-- Si la persona ya tiene el suyo, lo devuelve en vez de crear otro. Sin eso,
-- apretar dos veces deja dos vendedores y el segundo no se distingue del
-- primero.
--
-- LO QUE NO HACE
-- No valida el formato del documento -depende del pais, es otro cambio- ni
-- verifica que sea de quien dice. Verificar identidad es un problema aparte y
-- mas grande; esto solo deja de mezclar lo propio con lo de la empresa.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- La plataforma tambien puede identificar al vendedor que crea
-- ---------------------------------------------------------------------------
drop function if exists public.crear_tienda(text, text, text, text[], text[], text, text);

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
    codigo, nombre, tipo, owner_id, is_active, es_plataforma,
    capacidades, vidrieras, moneda_base, pais,
    documento_clase, documento_numero
  ) values (
    btrim(p_codigo), btrim(p_nombre), null, v_owner, true, false,
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
            -- El primero es el que abre por defecto. Si ya tiene otros, no se
            -- le cambia el que estaba usando.
            not exists (select 1 from store_members m where m.user_id = v_owner))
    on conflict do nothing;
  end if;

  return v_id;
end;
$FN$;

grant  execute on function public.crear_tienda(text, text, text, text[], text[], text, text, text, text) to authenticated;
revoke execute on function public.crear_tienda(text, text, text, text[], text[], text, text, text, text) from public, anon;

-- ---------------------------------------------------------------------------
-- Y una persona, el suyo
-- ---------------------------------------------------------------------------
create or replace function public.crear_mi_vendedor(
  p_nombre text, p_documento_numero text
) returns uuid
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_yo  uuid := auth.uid();
  v_id  uuid;
  v_doc text := nullif(btrim(coalesce(p_documento_numero, '')), '');
  v_cod text;
begin
  if v_yo is null then
    raise exception 'Hay que iniciar sesión.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'Poné con qué nombre vendés.' using errcode = '22023';
  end if;
  if v_doc is null then
    raise exception 'Falta tu documento de identidad: es lo que te identifica como vendedor.'
      using errcode = '22023';
  end if;

  -- Ya lo tiene: se devuelve el que hay. Apretar dos veces no puede dejar dos.
  select s.id into v_id
    from stores s
    join store_members m on m.store_id = s.id
   where m.user_id = v_yo
     and s.documento_clase = 'ci'
     and s.owner_id = v_yo
   limit 1;
  if v_id is not null then
    return v_id;
  end if;

  -- Otro ya se identificó con ese documento. Se dice cuál es el problema: un
  -- error de clave única no le explica nada a nadie.
  if exists (select 1 from stores
              where documento_clase = 'ci' and documento_numero = v_doc) then
    raise exception 'Ya hay un vendedor registrado con ese documento.'
      using errcode = '23505';
  end if;

  -- El código sale del documento y no del nombre: dos personas pueden llamarse
  -- igual, y el documento ya es único.
  v_cod := 'p-' || regexp_replace(v_doc, '[^a-zA-Z0-9]', '', 'g');

  insert into stores (
    codigo, nombre, owner_id, is_active, es_plataforma,
    capacidades, vidrieras, moneda_base, pais,
    documento_clase, documento_numero
  ) values (
    v_cod, btrim(p_nombre), v_yo, true, false,
    '{}',
    -- Arranca vendiendo usado. Para tener tienda se agrega la vidriera
    -- `market`: no hay que crear nada distinto ni convertir nada.
    array['secondhand'],
    'UYU', 'UY',
    'ci', v_doc
  )
  returning id into v_id;

  -- No se toca cuál abre por defecto: si ya venía trabajando en una empresa,
  -- darse de alta no puede sacarlo de ahí sin avisar.
  insert into store_members (store_id, user_id, rol, is_default)
  values (v_id, v_yo, 'duenio',
          not exists (select 1 from store_members m where m.user_id = v_yo))
  on conflict do nothing;

  return v_id;
end;
$FN$;

comment on function public.crear_mi_vendedor(text, text) is
  'Da de alta a la persona como vendedor, con su documento de identidad. Idempotente: si ya tiene el suyo, lo devuelve.';

grant  execute on function public.crear_mi_vendedor(text, text) to authenticated;
revoke execute on function public.crear_mi_vendedor(text, text) from public, anon;

commit;
