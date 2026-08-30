-- ===========================================================================
-- CORE Market administra la plataforma. COMITA es la tienda.
-- ===========================================================================
--
-- EL MODELO, SEGÚN EL PORTAL DE MARCA
--   Charlie define. CORE orquesta y ejecuta.
--   CORE Market   — plataforma tecnológica. Administra Market y Second.
--                   "No es una entidad legal comercial independiente y no
--                   realiza actividad comercial por sí misma."
--   COMITA        — Comercio, Bienes. Es la tienda: vende en Market y Second.
--
-- LO QUE ESTABA MAL
-- La migración anterior puso `es_plataforma = true` en `charlie-market`, que es
-- la fila que tiene publicaciones. O sea: le dio el rol de plataforma
-- justamente a la que vende, que es lo que el portal prohíbe. Acá se separa.
--
-- `charlie-market` pasa a ser CORE Market —conserva su `id`, así que la sesión
-- del operador sigue siendo válida y el catálogo compartido sigue siendo suyo—
-- y COMITA se crea con el configurador. A propósito: si el creador de tiendas
-- no alcanza para crear COMITA, el creador está mal. Es su propia prueba.
--
-- POR QUÉ `tipo` QUEDA SIN USO
-- `stores.tipo` decía 'market', como si la tienda fuera "de Market". Pero
-- COMITA vende en Market Y en Second: la vidriera no es una propiedad de la
-- tienda, es de lo que se publica. Y ya está en su lugar —
-- `catalog_producto_base.tipo` guarda market|secondhand y es lo que setea el
-- formulario. Dos columnas diciendo lo mismo terminan diciendo cosas
-- distintas, así que ésta queda marcada y sin uso.
--
-- QUÉ SE CONFIGURA, Y QUÉ NO
-- Sólo lo que hoy tiene alguien que lo lea. `capacidades` lo espera
-- `tieneCapacidad()`, que devuelve `true` fijo porque no tenía de dónde leer.
-- `vidrieras`, `moneda_base` y `pais` tienen consumidores concretos.
--
-- Lo fiscal, lo legal y los envíos NO se agregan: no hay todavía nada que los
-- lea y no sé qué forma tienen. Inventarles columnas ahora es adivinar, y una
-- columna vacía que nadie llena se vuelve un campo obligatorio del formulario
-- que nadie sabe completar.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- La identidad de la plataforma
-- ---------------------------------------------------------------------------
update stores
   set codigo = 'core-market',
       nombre = 'CORE Market',
       tipo   = null
 where codigo = 'charlie-market';

comment on column stores.tipo is
  'SIN USO. La vidriera es de la publicación (catalog_producto_base.tipo), no de la tienda: una tienda vende en Market y en Second.';

-- ---------------------------------------------------------------------------
-- Lo que se configura de una tienda
-- ---------------------------------------------------------------------------
alter table stores
  add column if not exists capacidades  text[] not null default '{}',
  add column if not exists vidrieras    text[] not null default '{}',
  add column if not exists moneda_base  text,
  add column if not exists pais         text;

comment on column stores.capacidades is
  'Qué funcionalidades tiene habilitadas. Lo lee tieneCapacidad(), que hasta ahora devolvía true fijo porque no había de dónde leer.';
comment on column stores.vidrieras is
  'En qué vidrieras publica: market, secondhand. Vacío = ninguna, que es lo correcto para la plataforma: no vende.';
comment on column stores.moneda_base is
  'La moneda en la que la tienda piensa sus precios. El precio tipeado se ancla en ella.';
comment on column stores.pais is
  'Dónde opera. Hoy la búsqueda web tiene "uy" fijo; este es el lugar del que debería salir.';

-- CORE Market cura el catálogo compartido, así que necesita las capacidades de
-- búsqueda. No publica en ninguna vidriera: no vende.
update stores
   set capacidades = array['busqueda_ampliada','catalogo_por_marca'],
       vidrieras   = '{}',
       moneda_base = coalesce(moneda_base, 'UYU'),
       pais        = coalesce(pais, 'UY')
 where es_plataforma;

-- ---------------------------------------------------------------------------
-- Quién soy
-- ---------------------------------------------------------------------------
create or replace function public.mi_tienda()
returns uuid
language sql
stable
as $$ select ((auth.jwt() ->> 'store_id')::uuid) $$;

comment on function public.mi_tienda() is
  'La tienda de la sesión. Un solo lugar donde se lee del token.';

-- "Soy la plataforma" no necesita un sistema de roles aparte: es tener el
-- store_id de la tienda marcada como plataforma.
create or replace function public.soy_la_plataforma()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select mi_tienda() is not null and mi_tienda() = tienda_plataforma() $$;

comment on function public.soy_la_plataforma() is
  'Si la sesión es la de CORE Market. Sin roles nuevos: se deduce de qué tienda sos.';

grant execute on function public.mi_tienda()          to authenticated;
grant execute on function public.soy_la_plataforma()  to authenticated;

-- ---------------------------------------------------------------------------
-- Las capacidades de mi tienda
-- ---------------------------------------------------------------------------
-- Esto es lo que `tieneCapacidad()` estaba esperando.
create or replace function public.mis_capacidades()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(capacidades, '{}') from stores where id = mi_tienda()
$$;

comment on function public.mis_capacidades() is
  'Las capacidades habilitadas de la tienda de la sesión.';

grant execute on function public.mis_capacidades() to authenticated;

-- ---------------------------------------------------------------------------
-- Listar tiendas — sólo la plataforma
-- ---------------------------------------------------------------------------
create or replace function public.listar_tiendas()
returns table (
  id uuid, codigo text, nombre text, es_plataforma boolean, activa boolean,
  capacidades text[], vidrieras text[], moneda_base text, pais text,
  owner_id uuid, owner_email text,
  publicaciones bigint, fichas bigint, creada timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market administra las tiendas.' using errcode = '42501';
  end if;

  return query
    select s.id, s.codigo, s.nombre, s.es_plataforma, s.is_active,
           s.capacidades, s.vidrieras, s.moneda_base, s.pais,
           s.owner_id,
           (select u.email::text from auth.users u where u.id = s.owner_id),
           (select count(*) from catalog_producto_base b where b.tenant_id = s.id),
           (select count(*) from catalogo_market c where c.tenant_id = s.id),
           s.created_at
      from stores s
     order by s.es_plataforma desc, s.nombre;
end;
$$;

grant execute on function public.listar_tiendas() to authenticated;

-- ---------------------------------------------------------------------------
-- Crear una tienda
-- ---------------------------------------------------------------------------
-- El dueño se indica por email y tiene que existir: crear usuarios es de
-- `auth`, no de acá, y fabricar una tienda con un dueño inventado deja una
-- tienda a la que nadie puede entrar.
create or replace function public.crear_tienda(
  p_codigo       text,
  p_nombre       text,
  p_owner_email  text default null,
  p_capacidades  text[] default '{}',
  p_vidrieras    text[] default '{}',
  p_moneda_base  text default 'UYU',
  p_pais         text default 'UY'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_id    uuid;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market crea tiendas.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_codigo), '') = '' or coalesce(btrim(p_nombre), '') = '' then
    raise exception 'La tienda necesita código y nombre.' using errcode = '22023';
  end if;
  if exists (select 1 from stores where codigo = btrim(p_codigo)) then
    raise exception 'Ya existe una tienda con el código "%".', btrim(p_codigo)
      using errcode = '23505';
  end if;

  if coalesce(btrim(p_owner_email), '') <> '' then
    select id into v_owner from auth.users where lower(email) = lower(btrim(p_owner_email));
    if v_owner is null then
      raise exception 'No hay ningún usuario con el correo "%". La tienda necesita un dueño que exista.',
        btrim(p_owner_email) using errcode = 'P0002';
    end if;
  end if;

  insert into stores (
    codigo, nombre, tipo, owner_id, is_active, es_plataforma,
    capacidades, vidrieras, moneda_base, pais
  ) values (
    btrim(p_codigo), btrim(p_nombre), null, v_owner, true, false,
    -- `es_plataforma` NO es parámetro. Hay una sola plataforma y ya existe;
    -- ofrecerlo en el formulario sería ofrecer romper el modelo.
    coalesce(p_capacidades, '{}'), coalesce(p_vidrieras, '{}'),
    nullif(btrim(coalesce(p_moneda_base, '')), ''),
    nullif(btrim(coalesce(p_pais, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.crear_tienda(text, text, text, text[], text[], text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Configurar una tienda
-- ---------------------------------------------------------------------------
create or replace function public.actualizar_tienda(
  p_id           uuid,
  p_nombre       text default null,
  p_activa       boolean default null,
  p_owner_email  text default null,
  p_capacidades  text[] default null,
  p_vidrieras    text[] default null,
  p_moneda_base  text default null,
  p_pais         text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  s record;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market configura las tiendas.' using errcode = '42501';
  end if;

  select * into s from stores where id = p_id;
  if not found then
    raise exception 'La tienda no existe.' using errcode = 'P0002';
  end if;

  -- La plataforma no vende. Es la restricción del portal —"no realiza
  -- actividad comercial por sí misma"— hecha regla en vez de párrafo.
  if s.es_plataforma and coalesce(array_length(p_vidrieras, 1), 0) > 0 then
    raise exception 'CORE Market administra la plataforma y no vende: no publica en ninguna vidriera.'
      using errcode = '42501';
  end if;

  -- Desactivar la plataforma deja el sistema sin quién administre el catálogo
  -- compartido, y sin forma de volver a activarla desde el panel.
  if s.es_plataforma and p_activa is false then
    raise exception 'CORE Market no se puede desactivar.' using errcode = '42501';
  end if;

  if coalesce(btrim(p_owner_email), '') <> '' then
    select id into v_owner from auth.users where lower(email) = lower(btrim(p_owner_email));
    if v_owner is null then
      raise exception 'No hay ningún usuario con el correo "%".', btrim(p_owner_email)
        using errcode = 'P0002';
    end if;
  end if;

  update stores set
    nombre      = coalesce(nullif(btrim(p_nombre), ''), nombre),
    is_active   = coalesce(p_activa, is_active),
    owner_id    = coalesce(v_owner, owner_id),
    -- Estos SÍ se pueden vaciar: mandar el arreglo vacío es quitar todas las
    -- capacidades, que es una decisión legítima. `null` es "no lo mandé".
    capacidades = coalesce(p_capacidades, capacidades),
    vidrieras   = coalesce(p_vidrieras, vidrieras),
    moneda_base = case when p_moneda_base is null then moneda_base
                       else nullif(btrim(p_moneda_base), '') end,
    pais        = case when p_pais is null then pais
                       else nullif(btrim(p_pais), '') end,
    updated_at  = now()
  where id = p_id;
end;
$$;

grant execute on function public.actualizar_tienda(uuid, text, boolean, text, text[], text[], text, text)
  to authenticated;

revoke execute on function public.listar_tiendas()    from anon;
revoke execute on function public.crear_tienda(text, text, text, text[], text[], text, text) from anon;
revoke execute on function public.actualizar_tienda(uuid, text, boolean, text, text[], text[], text, text) from anon;
revoke execute on function public.mis_capacidades()   from anon;
revoke execute on function public.soy_la_plataforma() from anon;

commit;
