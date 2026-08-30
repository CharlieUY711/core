-- ===========================================================================
-- Definiciones: países, monedas, idiomas y zonas
-- ===========================================================================
--
-- QUÉ EXISTE vs. QUÉ ESTÁ CONFIGURADO
-- Es la misma división que ya usamos con las apps, y acá faltaba. "Territorios"
-- configura un país para operar —le pone moneda, tasas, fuente de cambio—. Pero
-- no había ningún lugar donde AGREGAR un país, una moneda o un idioma: las
-- filas estaban sembradas y punto. Si hacía falta el peso colombiano, había que
-- escribirlo a mano en la base.
--
-- BORRAR ES LO PELIGROSO, Y POR ESO SE EXPLICA
-- Un país lo referencian marcas, campañas, canales, distribuidoras, entidades,
-- operaciones de comercio y territorios. Una moneda, los precios, las
-- cotizaciones y la moneda base de cada tienda. Un idioma, las traducciones.
--
-- La base ya lo impide con las claves foráneas — pero con un mensaje que no
-- ayuda a nadie ("violates foreign key constraint
-- brand_distributors_country_code_fkey"). Estas funciones intentan el borrado y
-- traducen ese error: qué tabla lo está usando, en castellano.
--
-- No se enumeran las referencias a mano a propósito: mañana hay una tabla más y
-- la lista escrita queda incompleta sin que nadie lo note. Preguntarle a la
-- base es lo único que no envejece.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Leer
-- ---------------------------------------------------------------------------
create or replace function public.definiciones_de_plataforma()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market ve las definiciones.' using errcode = '42501';
  end if;

  select jsonb_build_object(

    'paises', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'iso', p.iso_code, 'nombre', p.name, 'estado', p.status,
        'zonas',   (select count(*) from territories t where t.country_id = p.id),
        'monedas', (select count(*) from currencies m where m.country_id = p.id),
        'tasas',   (select count(*) from tax_rates r where r.country_id = p.id),
        'tiendas', (select count(*) from stores s where s.pais = p.iso_code)
      ) order by p.name), '[]'::jsonb) from countries p
    ),

    'monedas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', c.code, 'nombre', c.name, 'simbolo', c.symbol,
        'decimales', c.decimals, 'estado', c.status,
        'es_global', c.es_global,
        'pais', (select p.iso_code from countries p where p.id = c.country_id),
        'country_id', c.country_id,
        -- Dónde se está usando. Es lo que decide si se puede borrar.
        'en_uso', (
          (select count(*) from catalog_variante v where v.moneda = c.code)
          + (select count(*) from catalog_precio pr where pr.moneda = c.code)
          + (select count(*) from stores s where s.moneda_base = c.code)
          + (select count(*) from exchange_rates r
              where r.from_currency = c.code or r.to_currency = c.code)
        )
      ) order by c.es_global desc, c.code), '[]'::jsonb) from currencies c
    ),

    'idiomas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', l.code, 'nombre', l.name, 'nativo', l.native_name,
        'estado', l.status,
        'traducciones', (select count(*) from translations t where t.language_code = l.code)
      ) order by l.code), '[]'::jsonb) from languages l
    ),

    'zonas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'nombre', t.name, 'tipo', t.territory_type,
        'codigo', t.code, 'estado', t.status,
        'country_id', t.country_id,
        'pais', (select p.iso_code from countries p where p.id = t.country_id)
      ) order by t.name), '[]'::jsonb) from territories t
    )

  ) into v;

  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guardar
-- ---------------------------------------------------------------------------
create or replace function public.guardar_pais(
  p_id uuid, p_iso text, p_nombre text, p_activo boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market define los países.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_iso, ''))) <> 2 then
    raise exception 'El código ISO de un país son dos letras. Llegó: "%"', p_iso
      using errcode = '22023';
  end if;
  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'El país necesita un nombre.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into countries (iso_code, name, status)
    values (upper(btrim(p_iso)), btrim(p_nombre),
            case when p_activo then 'active' else 'inactive' end)
    returning id into v_id;
  else
    update countries set
      iso_code = upper(btrim(p_iso)),
      name     = btrim(p_nombre),
      status   = case when p_activo then 'active' else 'inactive' end
     where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'El país no existe.' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.guardar_moneda(
  p_codigo     text,
  p_nombre     text,
  p_simbolo    text,
  p_decimales  integer,
  p_country_id uuid default null,
  p_activa     boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market define las monedas.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_codigo, ''))) <> 3 then
    raise exception 'El código de una moneda son tres letras. Llegó: "%"', p_codigo
      using errcode = '22023';
  end if;
  if p_decimales is null or p_decimales < 0 or p_decimales > 4 then
    raise exception 'Los decimales van de 0 a 4. Llegó: %', p_decimales
      using errcode = '22023';
  end if;

  -- Una moneda es de un país o es global, nunca las dos ni ninguna: sin país
  -- no aparecería en ningún territorio, y sin ser global tampoco en la
  -- plataforma. Quedaría invisible.
  insert into currencies (code, name, symbol, decimals, status, country_id, es_global)
  values (upper(btrim(p_codigo)), btrim(p_nombre), btrim(coalesce(p_simbolo, '')),
          p_decimales, case when p_activa then 'active' else 'inactive' end,
          p_country_id, p_country_id is null)
  on conflict (code) do update set
    name      = excluded.name,
    symbol    = excluded.symbol,
    decimals  = excluded.decimals,
    status    = excluded.status,
    country_id = excluded.country_id,
    es_global  = excluded.es_global;
end;
$$;

create or replace function public.guardar_idioma(
  p_codigo text, p_nombre text, p_nativo text default null, p_activo boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market define los idiomas.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_codigo), '') = '' or coalesce(btrim(p_nombre), '') = '' then
    raise exception 'El idioma necesita código y nombre.' using errcode = '22023';
  end if;

  insert into languages (code, name, native_name, status)
  values (lower(btrim(p_codigo)), btrim(p_nombre),
          nullif(btrim(coalesce(p_nativo, '')), ''),
          case when p_activo then 'active' else 'inactive' end)
  on conflict (code) do update set
    name        = excluded.name,
    native_name = coalesce(excluded.native_name, languages.native_name),
    status      = excluded.status;
end;
$$;

create or replace function public.guardar_zona(
  p_id uuid, p_country_id uuid, p_nombre text, p_tipo text,
  p_codigo text default null, p_activa boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market define las zonas.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'La zona necesita un nombre.' using errcode = '22023';
  end if;
  if p_tipo not in ('national', 'free_zone') then
    raise exception 'El tipo de zona es "national" o "free_zone". Llegó: "%"', p_tipo
      using errcode = '22023';
  end if;

  if p_id is null then
    insert into territories (country_id, name, territory_type, code, status)
    values (p_country_id, btrim(p_nombre), p_tipo,
            nullif(btrim(coalesce(p_codigo, '')), ''),
            case when p_activa then 'active' else 'inactive' end)
    returning id into v_id;
  else
    update territories set
      country_id     = coalesce(p_country_id, country_id),
      name           = btrim(p_nombre),
      territory_type = p_tipo,
      code           = nullif(btrim(coalesce(p_codigo, '')), ''),
      status         = case when p_activa then 'active' else 'inactive' end,
      updated_at     = now()
     where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Borrar, explicando cuando no se puede
-- ---------------------------------------------------------------------------
-- No se enumeran las referencias a mano: mañana hay una tabla más y la lista
-- escrita queda incompleta sin que nadie lo note. Se intenta el borrado y se
-- traduce el error de la base, que es lo único que no envejece.
create or replace function public.eliminar_definicion(p_tipo text, p_clave text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tabla text;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market borra definiciones.' using errcode = '42501';
  end if;

  begin
    case p_tipo
      when 'pais'   then delete from countries  where id   = p_clave::uuid;
      when 'moneda' then delete from currencies where code = upper(p_clave);
      when 'idioma' then delete from languages  where code = lower(p_clave);
      when 'zona'   then delete from territories where id  = p_clave::uuid;
      else raise exception 'Tipo desconocido: "%"', p_tipo using errcode = '22023';
    end case;

  exception when foreign_key_violation then
    -- `table_name` en un error de clave foránea es la tabla QUE REFERENCIA,
    -- que es exactamente lo que hay que decirle a quien intentó borrar.
    get stacked diagnostics v_tabla = table_name;
    raise exception 'No se puede borrar: lo está usando "%". Sacalo de ahí primero.',
      coalesce(v_tabla, 'otra parte del sistema') using errcode = '23503';
  end;
end;
$$;

comment on function public.eliminar_definicion(text, text) is
  'Borra una definición y, si no se puede, dice qué la está usando. El error de la base no se lo explica a nadie.';

grant execute on function public.definiciones_de_plataforma()                                    to authenticated;
grant execute on function public.guardar_pais(uuid, text, text, boolean)                         to authenticated;
grant execute on function public.guardar_moneda(text, text, text, integer, uuid, boolean)        to authenticated;
grant execute on function public.guardar_idioma(text, text, text, boolean)                       to authenticated;
grant execute on function public.guardar_zona(uuid, uuid, text, text, text, boolean)             to authenticated;
grant execute on function public.eliminar_definicion(text, text)                                 to authenticated;

revoke execute on function public.definiciones_de_plataforma()                             from anon;
revoke execute on function public.guardar_pais(uuid, text, text, boolean)                  from anon;
revoke execute on function public.guardar_moneda(text, text, text, integer, uuid, boolean) from anon;
revoke execute on function public.guardar_idioma(text, text, text, boolean)                from anon;
revoke execute on function public.guardar_zona(uuid, uuid, text, text, text, boolean)      from anon;
revoke execute on function public.eliminar_definicion(text, text)                          from anon;

commit;
