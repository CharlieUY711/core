-- ===========================================================================
-- Lo que configura CORE Market
-- ===========================================================================
--
-- QUÉ ES DE LA PLATAFORMA Y NO DE UNA TIENDA
-- Se verificó tabla por tabla, no de memoria:
--
--   departamentos, categorias, subcategorias   sin tenant_id → globales
--   tax_rates                                  sin tenant_id → globales
--   currencies, exchange_rates, sources        sin tenant_id → globales
--
-- Todas son de la plataforma. Y todas se editaban —o no se editaban en
-- absoluto— desde lugares que no correspondían: la taxonomía estaba adentro de
-- la Biblioteca, o sea que un operador de tienda podía cambiarle los
-- departamentos a TODAS las tiendas. Los impuestos, las monedas y el tipo de
-- cambio no tenían pantalla en ningún lado.
--
-- POR QUÉ UNA FUNCIÓN Y NO LEER LAS TABLAS DESDE EL NAVEGADOR
-- Por `exchange_rate_sources.api_key`. Esa tabla tiene la credencial de la
-- fuente adentro, así que una pantalla que hiciera `select *` la mandaría al
-- navegador de quien mire la configuración. Acá se elige columna por columna y
-- la clave no sale nunca — sólo si está puesta o no, que es lo único que hace
-- falta saber para diagnosticar.
-- ===========================================================================

begin;

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

    'impuestos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'codigo', t.code, 'nombre', t.name,
        'tasa', t.rate, 'por_defecto', t.is_default, 'estado', t.status
      ) order by t.rate), '[]'::jsonb) from tax_rates t
    ),

    'monedas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', c.code, 'nombre', c.name, 'simbolo', c.symbol,
        'decimales', c.decimals, 'estado', c.status
      ) order by c.code), '[]'::jsonb) from currencies c
    ),

    -- Sin `api_key`: sólo si hay una puesta. Alcanza para diagnosticar y no
    -- pone una credencial en el navegador de nadie.
    'fuentes_de_cambio', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'nombre', s.name, 'tipo', s.source_type,
        'url', s.url, 'estado', s.status,
        'tiene_clave', s.api_key is not null and btrim(s.api_key) <> ''
      ) order by s.name), '[]'::jsonb) from exchange_rate_sources s
    ),

    -- La última cotización de cada par. Es lo que permite ver de un vistazo si
    -- el trabajo diario sigue corriendo: una fecha vieja es una falla que hoy
    -- no avisa por ningún lado.
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

comment on function public.configuracion_de_plataforma() is
  'Todo lo que CORE Market configura, en una lectura. Nunca devuelve la clave de una fuente: sólo si está puesta.';

grant  execute on function public.configuracion_de_plataforma() to authenticated;
revoke execute on function public.configuracion_de_plataforma() from anon;

commit;
