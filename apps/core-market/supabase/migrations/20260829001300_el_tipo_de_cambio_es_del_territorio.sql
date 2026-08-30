-- ===========================================================================
-- El tipo de cambio es del territorio
-- ===========================================================================
--
-- POR QUÉ
-- Porque la fuente es nacional. El BCU es el banco central de Uruguay; el de
-- Argentina es el BCRA, el de Brasil el BCB, el de Paraguay el BCP. "La
-- cotización oficial" no existe en abstracto: existe la de un país.
--
-- Y las cotizaciones lo confirman: las dos que hay son USD→UYU y EUR→UYU, o
-- sea las monedas globales contra la moneda local de Uruguay. Son de un
-- territorio, aunque nada lo dijera.
--
-- LO QUE FALTABA
-- `exchange_rate_sources` no tenía `country_id`. Con una sola fuente eso no
-- molestaba —era la de Uruguay por omisión— pero al configurar el segundo país
-- habría dos fuentes y ninguna forma de saber cuál es de quién. La conversión
-- de un precio paraguayo podría salir con la cotización uruguaya sin que nada
-- fallara: el peor tipo de error, el que da un número.
--
-- QUÉ QUEDA EN LA PLATAFORMA
-- El dólar y el euro. No son de ningún territorio y por eso las cotizaciones
-- son siempre "una global contra la local": la moneda global es la que se
-- comparte, la local es la que pone el territorio.
-- ===========================================================================

begin;

alter table exchange_rate_sources
  add column if not exists country_id uuid references countries(id);

comment on column exchange_rate_sources.country_id is
  'De qué territorio es esta fuente. El banco central es nacional: no hay una cotización oficial sin país.';

-- El BCU es de Uruguay. Se identifica por su nombre porque es la única que
-- hay; de haber varias habría que mirar una por una.
update exchange_rate_sources s
   set country_id = (select id from countries where iso_code = 'UY')
 where s.country_id is null
   and s.name = 'BCU';

-- ---------------------------------------------------------------------------
-- La configuración: la fuente y las cotizaciones, adentro del territorio
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

        -- La fuente del país. Sin `api_key`: sólo si está puesta, que es lo
        -- único que hace falta para diagnosticar.
        'fuentes', (select coalesce(jsonb_agg(jsonb_build_object(
                      'id', s.id, 'nombre', s.name, 'tipo', s.source_type,
                      'url', s.url, 'estado', s.status,
                      'tiene_clave', s.api_key is not null and btrim(s.api_key) <> ''
                    ) order by s.name), '[]'::jsonb)
                      from exchange_rate_sources s where s.country_id = p.id),

        -- Las cotizaciones que le importan: las globales contra su moneda.
        'cotizaciones', (
          select coalesce(jsonb_agg(x), '[]'::jsonb) from (
            select distinct on (r.from_currency)
                   jsonb_build_object(
                     'de', r.from_currency, 'a', r.to_currency,
                     'tasa', r.rate, 'compra', r.compra, 'venta', r.venta,
                     'vigente_desde', r.valid_at
                   ) x
              from exchange_rates r
              join currencies m on m.code = r.to_currency and m.country_id = p.id
             order by r.from_currency, r.valid_at desc
          ) t
        ),

        'configurado', (
          exists (select 1 from currencies m where m.country_id = p.id and m.status = 'active')
          and exists (select 1 from tax_rates r where r.country_id = p.id and r.status = 'active')
        )
      ) order by p.name), '[]'::jsonb) from countries p
    ),

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

    -- Las que no quedaron asignadas a ningún territorio. No deberían existir:
    -- se muestran para que se vean y se arreglen, no para esconderlas.
    'fuentes_sin_territorio', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'nombre', s.name, 'tipo', s.source_type
      ) order by s.name), '[]'::jsonb)
        from exchange_rate_sources s where s.country_id is null
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

commit;
