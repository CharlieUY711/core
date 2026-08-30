-- ===========================================================================
-- Las definiciones, con su rastro y todo lo que la fila muestra
-- ===========================================================================
--
-- POR QUÉ CAMBIA
-- Las tablas del panel pasan a tener los botones en la barra y un check por
-- fila. Eso libera el espacio que se iba en tres botones por renglón, y ese
-- espacio se llena con lo que sirve para decidir: cuándo se creó, cuándo se
-- modificó, en cuántas cosas se usa.
--
-- Nada de eso se estaba trayendo. `created_at` existe en todas estas tablas
-- desde siempre y no salía en ninguna consulta.
--
-- Y LOS PAÍSES DEJAN DE PEDIRSE DOS VECES
-- La lista de países se armaba con `definiciones_de_plataforma` —para los
-- conteos— y su detalle con `configuracion_de_plataforma`. Dos lecturas para
-- una fila, que pueden llegar desfasadas: la fila diría "2 tasas" y al abrirla
-- se verían tres. Acá viene todo junto.
-- ===========================================================================

begin;

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
        'creado', p.created_at,

        'moneda', (select jsonb_build_object('codigo', m.code, 'nombre', m.name,
                          'simbolo', m.symbol, 'decimales', m.decimals)
                     from currencies m
                    where m.country_id = p.id and m.status = 'active' limit 1),

        'impuestos', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', r.id, 'codigo', r.code, 'nombre', r.name,
                        'tasa', r.rate, 'por_defecto', r.is_default
                      ) order by r.rate), '[]'::jsonb)
                        from tax_rates r
                       where r.country_id = p.id and r.status = 'active'),

        'zonas', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', t.id, 'nombre', t.name, 'tipo', t.territory_type,
                    'codigo', t.code, 'estado', t.status, 'creado', t.created_at,
                    'modificado', t.updated_at
                  ) order by t.territory_type, t.name), '[]'::jsonb)
                    from territories t where t.country_id = p.id),

        'fuentes', (select coalesce(jsonb_agg(jsonb_build_object(
                      'id', s.id, 'nombre', s.name, 'tipo', s.source_type,
                      'url', s.url, 'estado', s.status,
                      -- Nunca la clave: sólo si está puesta, que es lo único
                      -- que hace falta para diagnosticar.
                      'tiene_clave', s.api_key is not null and btrim(s.api_key) <> ''
                    ) order by s.name), '[]'::jsonb)
                      from exchange_rate_sources s where s.country_id = p.id),

        'cotizaciones', (
          select coalesce(jsonb_agg(x), '[]'::jsonb) from (
            select distinct on (r.from_currency)
                   jsonb_build_object(
                     'de', r.from_currency, 'a', r.to_currency, 'tasa', r.rate,
                     'compra', r.compra, 'venta', r.venta, 'vigente_desde', r.valid_at
                   ) x
              from exchange_rates r
              join currencies m on m.code = r.to_currency and m.country_id = p.id
             order by r.from_currency, r.valid_at desc
          ) t
        ),

        'tiendas', (select count(*) from stores s where s.pais = p.iso_code),

        -- Se deduce: tiene moneda y tiene tasas. Un `configurado boolean` hay
        -- que acordarse de mantenerlo, y el día que alguien borre la última
        -- tasa el país seguiría diciendo que está listo.
        'configurado', (
          exists (select 1 from currencies m where m.country_id = p.id and m.status = 'active')
          and exists (select 1 from tax_rates r where r.country_id = p.id and r.status = 'active')
        )
      ) order by p.name), '[]'::jsonb) from countries p
    ),

    'monedas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', c.code, 'nombre', c.name, 'simbolo', c.symbol,
        'decimales', c.decimals, 'estado', c.status, 'es_global', c.es_global,
        'creado', c.created_at,
        'pais', (select p.iso_code from countries p where p.id = c.country_id),
        'country_id', c.country_id,
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
        'estado', l.status, 'creado', l.created_at,
        'en_uso', (select count(*) from translations t where t.language_code = l.code)
      ) order by l.code), '[]'::jsonb) from languages l
    ),

    'fuentes_sin_territorio', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'nombre', s.name, 'tipo', s.source_type
      ) order by s.name), '[]'::jsonb)
        from exchange_rate_sources s where s.country_id is null
    )

  ) into v;

  return v;
end;
$$;

commit;
