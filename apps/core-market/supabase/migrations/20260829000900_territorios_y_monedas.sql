-- ===========================================================================
-- Territorios: la moneda vive en el país, salvo el dólar y el euro
-- ===========================================================================
--
-- LO QUE YA EXISTÍA Y NADIE VEÍA
-- `countries`, `territories`, `languages` y `currencies` estaban desde el
-- diseño multi-país original. Cinco países activos, y territorios que
-- distinguen el territorio nacional de las zonas francas —Zonamerica, Aguada
-- Park. Nada de eso tenía pantalla: existía y se administraba a mano.
--
-- Y sólo Uruguay tiene tasas de impuesto. Los otros cuatro están marcados
-- `active` sin tener con qué operar: aparecen habilitados y no lo están. Eso
-- es lo que esta migración vuelve visible.
--
-- QUÉ SIGNIFICA "CONFIGURADO"
-- Que el país tenga moneda local y al menos una tasa de impuesto. Se DEDUCE,
-- no se guarda en una columna: un `configurado boolean` es un dato que hay que
-- acordarse de mantener, y el día que alguien borre la última tasa el país
-- seguiría diciendo que está listo.
--
-- LA MONEDA VA EN EL PAÍS, SALVO DOS
-- El peso uruguayo es de Uruguay; el guaraní, de Paraguay. Pero el dólar y el
-- euro no son de ningún país del sistema: son las monedas en las que se
-- publica y se compara en todos lados. Por eso `es_global`, y por eso no
-- cuelgan de ningún territorio.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Decimales: el guaraní y el peso chileno no tienen centavos
-- ---------------------------------------------------------------------------
-- Con `decimals = 2` un precio se guarda y se muestra con una parte decimal
-- que en esas monedas no existe. Nadie factura ₲ 1.500,50.
update currencies set decimals = 0 where code in ('PYG', 'CLP');

comment on column currencies.decimals is
  'Cuántos decimales usa la moneda. PYG y CLP van en 0: no tienen centavos.';

-- ---------------------------------------------------------------------------
-- De qué país es cada moneda
-- ---------------------------------------------------------------------------
alter table currencies
  add column if not exists country_id uuid references countries(id),
  add column if not exists es_global  boolean not null default false;

comment on column currencies.country_id is
  'El país del que es la moneda local. Nulo en las globales.';
comment on column currencies.es_global is
  'Dólar y euro: no son de ningún país del sistema, se usan en todos. Se configuran acá, no dentro de un territorio.';

update currencies c set country_id = p.id
  from countries p
 where c.country_id is null
   and ((c.code = 'UYU' and p.iso_code = 'UY')
     or (c.code = 'ARS' and p.iso_code = 'AR')
     or (c.code = 'BRL' and p.iso_code = 'BR')
     or (c.code = 'CLP' and p.iso_code = 'CL')
     or (c.code = 'PYG' and p.iso_code = 'PY'));

update currencies set es_global = true where code in ('USD', 'EUR');

-- Una moneda es de un país o es global, nunca las dos ni ninguna. Sin esto,
-- una moneda suelta no aparecería en ningún lado de la configuración.
alter table currencies
  drop constraint if exists currencies_local_o_global;
alter table currencies
  add constraint currencies_local_o_global
  check ((country_id is not null) <> es_global);

-- ---------------------------------------------------------------------------
-- La configuración de la plataforma, ahora con territorios
-- ---------------------------------------------------------------------------
create or replace function public.configuracion_de_plataforma()
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
    raise exception 'Sólo CORE Market ve la configuración de la plataforma.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(

    -- Un país con lo que tiene y lo que le falta. `configurado` se deduce:
    -- sin moneda o sin tasas no se puede operar ahí, diga lo que diga
    -- `status`.
    'territorios', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'iso', p.iso_code, 'nombre', p.name, 'estado', p.status,
        'moneda', (select jsonb_build_object('codigo', m.code, 'nombre', m.name,
                          'simbolo', m.symbol, 'decimales', m.decimals)
                     from currencies m where m.country_id = p.id and m.status = 'active'
                    limit 1),
        'impuestos', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', r.id, 'codigo', r.code, 'nombre', r.name,
                        'tasa', r.rate, 'por_defecto', r.is_default
                      ) order by r.rate), '[]'::jsonb)
                        from tax_rates r where r.country_id = p.id and r.status = 'active'),
        'zonas', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', t.id, 'nombre', t.name, 'tipo', t.territory_type,
                    'codigo', t.code, 'estado', t.status
                  ) order by t.territory_type, t.name), '[]'::jsonb)
                    from territories t where t.country_id = p.id),
        'configurado', (
          exists (select 1 from currencies m where m.country_id = p.id and m.status = 'active')
          and exists (select 1 from tax_rates r where r.country_id = p.id and r.status = 'active')
        )
      ) order by p.name), '[]'::jsonb) from countries p
    ),

    -- Fuera de los territorios: no son de ningún país.
    'monedas_globales', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', c.code, 'nombre', c.name, 'simbolo', c.symbol,
        'decimales', c.decimals, 'estado', c.status
      ) order by c.code), '[]'::jsonb) from currencies c where c.es_global
    ),

    'idiomas', (
      select coalesce(jsonb_agg(jsonb_build_object('codigo', l.code, 'nombre', l.name)
             order by l.code), '[]'::jsonb) from languages l
    ),

    'fuentes_de_cambio', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'nombre', s.name, 'tipo', s.source_type,
        'url', s.url, 'estado', s.status,
        'tiene_clave', s.api_key is not null and btrim(s.api_key) <> ''
      ) order by s.name), '[]'::jsonb) from exchange_rate_sources s
    ),

    'cotizaciones', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select distinct on (r.from_currency, r.to_currency)
               jsonb_build_object(
                 'de', r.from_currency, 'a', r.to_currency,
                 'tasa', r.rate, 'compra', r.compra, 'venta', r.venta,
                 'vigente_desde', r.valid_at
               ) x
          from exchange_rates r
         order by r.from_currency, r.to_currency, r.valid_at desc
      ) t
    ),

    'taxonomia', jsonb_build_object(
      'departamentos',  (select count(*) from departamentos),
      'activos',        (select count(*) from departamentos where activo),
      'categorias',     (select count(*) from categorias),
      'subcategorias',  (select count(*) from subcategorias)
    ),

    'vidrieras', jsonb_build_array(
      jsonb_build_object('id', 'market',     'nombre', 'Market'),
      jsonb_build_object('id', 'secondhand', 'nombre', 'Second')
    ),

    'tiendas', jsonb_build_object(
      'total',  (select count(*) from stores where not es_plataforma),
      'activas',(select count(*) from stores where not es_plataforma and is_active)
    )

  ) into v;

  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Configurar un territorio
-- ---------------------------------------------------------------------------
-- Le asigna la moneda local. Es la mitad de lo que hace falta; la otra mitad
-- son las tasas, que se cargan de a una porque cada país tiene las suyas y no
-- se pueden adivinar.
create or replace function public.asignar_moneda_de_pais(
  p_country_id uuid,
  p_codigo     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market configura los territorios.' using errcode = '42501';
  end if;
  if not exists (select 1 from countries where id = p_country_id) then
    raise exception 'El territorio no existe.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from currencies where code = p_codigo) then
    raise exception 'No existe la moneda "%".', p_codigo using errcode = 'P0002';
  end if;
  if exists (select 1 from currencies where code = p_codigo and es_global) then
    raise exception 'El dólar y el euro se usan en todos los territorios: no se asignan a uno.'
      using errcode = '22023';
  end if;

  -- Un país, una moneda local. Si ya tenía otra, se libera: dos monedas
  -- locales es una pregunta sin respuesta al mostrar un precio.
  update currencies set country_id = null
   where country_id = p_country_id and code <> p_codigo;

  update currencies set country_id = p_country_id, es_global = false
   where code = p_codigo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Las tasas de un territorio
-- ---------------------------------------------------------------------------
-- OJO CON LA UNIDAD: `rate` se guarda en PORCENTAJE -10, 22-, no en fracción.
-- Es como lo lee el resto de la aplicación (`${t.rate}%`). Guardar 0.22 acá
-- haría que un artículo con IVA básico se publique con 0,22 % de impuesto.
create or replace function public.guardar_tasa_de_impuesto(
  p_country_id  uuid,
  p_codigo      text,
  p_nombre      text,
  p_tasa        numeric,
  p_por_defecto boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market configura los impuestos.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_codigo), '') = '' or coalesce(btrim(p_nombre), '') = '' then
    raise exception 'La tasa necesita código y nombre.' using errcode = '22023';
  end if;
  if p_tasa is null or p_tasa < 0 or p_tasa > 100 then
    raise exception 'La tasa se expresa en porcentaje, entre 0 y 100. Llegó: %', p_tasa
      using errcode = '22023';
  end if;

  -- Una sola por defecto por país: dos "por defecto" es no tener ninguna.
  if p_por_defecto then
    update tax_rates set is_default = false where country_id = p_country_id;
  end if;

  insert into tax_rates (country_id, code, name, rate, is_default, status)
  values (p_country_id, btrim(p_codigo), btrim(p_nombre), p_tasa,
          coalesce(p_por_defecto, false), 'active')
  on conflict (country_id, code) do update set
    name       = excluded.name,
    rate       = excluded.rate,
    is_default = excluded.is_default,
    status     = 'active',
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- El `on conflict` de arriba necesita esta unicidad, y además es correcta por
-- sí sola: dos tasas con el mismo código en el mismo país no significan nada.
create unique index if not exists tax_rates_codigo_por_pais
  on tax_rates (country_id, code);

grant execute on function public.asignar_moneda_de_pais(uuid, text)                        to authenticated;
grant execute on function public.guardar_tasa_de_impuesto(uuid, text, text, numeric, boolean) to authenticated;
revoke execute on function public.asignar_moneda_de_pais(uuid, text)                       from anon;
revoke execute on function public.guardar_tasa_de_impuesto(uuid, text, text, numeric, boolean) from anon;

commit;
