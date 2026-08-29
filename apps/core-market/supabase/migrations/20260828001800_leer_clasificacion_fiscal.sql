-- ===========================================================================
-- Leer la clasificación fiscal de un artículo
-- ===========================================================================
--
-- `tasa_de_articulo` devuelve sólo el uuid de la excepción. La ficha necesita
-- además de dónde salió: sin saber que la tasa actual es MANUAL, la pantalla
-- no puede evitar ofrecer una sugerencia que la pisaría.
--
-- Se agrega una función en vez de cambiarle el tipo de retorno a la que ya
-- existe: cambiar el row type de una función obliga a soltarla y recrearla, y
-- deja un momento en que la pantalla que la usa no la encuentra.
-- ===========================================================================

begin;

create or replace function public.clasificacion_de_articulo(p_variant_id uuid)
returns table (
  tax_rate_id        uuid,
  codigo             text,
  tax_source         text,
  tax_confidence     text,
  tax_rule           text,
  tax_reason         text,
  tax_engine_version text,
  tax_classified_at  timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select b.tax_rate_id, r.code, b.tax_source, b.tax_confidence,
         b.tax_rule, b.tax_reason, b.tax_engine_version, b.tax_classified_at
    from catalog_variante v
    join catalog_producto_base b on b.id = v.producto_base_id
    left join tax_rates r on r.id = b.tax_rate_id
   where v.id = p_variant_id;
$$;

comment on function public.clasificacion_de_articulo(uuid) is
  'La excepcion de tasa del articulo y su rastro: de donde salio, con que regla y con cuanta certeza. NULL en tax_rate_id significa que hereda.';

grant execute on function public.clasificacion_de_articulo(uuid) to authenticated;

commit;
