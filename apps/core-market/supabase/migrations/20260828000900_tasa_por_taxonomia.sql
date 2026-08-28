-- ===========================================================================
-- La tasa heredada, para poder mostrarla mientras se carga el articulo
-- ===========================================================================
--
-- `tasa_resuelta` resuelve sobre un articulo que ya existe. El formulario
-- necesita la otra mitad: cual es la tasa que le VA a corresponder segun el
-- departamento, la categoria y la subcategoria que se estan eligiendo, antes
-- de que el articulo exista.
--
-- Sin esto, el selector de un articulo nuevo no puede decir "Básica 22%" hasta
-- despues de guardarlo, que es justo cuando ya no sirve.
--
-- La escalera queda escrita una sola vez: `tasa_resuelta` pasa a delegar aca.
-- Dos copias del mismo orden de precedencia terminan discrepando, y la forma
-- de enterarse es una factura mal calculada.
-- ===========================================================================

begin;

create or replace function public.tasa_por_taxonomia(
  p_departamento_id uuid default null,
  p_categoria_id    uuid default null,
  p_subcategoria_id uuid default null
)
returns table (
  tax_rate_id uuid,
  code        text,
  name        text,
  rate        numeric,
  origen      text
)
language sql
stable
security invoker
set search_path = public
as $$
  with niveles as (
    select (select s.tax_rate_id from subcategorias  s where s.id = p_subcategoria_id) as t_sub,
           (select c.tax_rate_id from categorias     c where c.id = p_categoria_id)    as t_cat,
           (select d.tax_rate_id from departamentos  d where d.id = p_departamento_id) as t_dep
  ),
  elegida as (
    select coalesce(t_sub, t_cat, t_dep) as id,
           case when t_sub is not null then 'subcategoria'
                when t_cat is not null then 'categoria'
                when t_dep is not null then 'departamento'
           end as origen
      from niveles
  )
  select r.id, r.code, r.name, r.rate, coalesce(e.origen, 'default')
    from tax_rates r
    left join elegida e on true
   where r.id = e.id
      or (e.id is null and r.is_default
          and r.country_id = (select id from countries where iso_code = 'UY'))
   limit 1;
$$;

comment on function public.tasa_por_taxonomia(uuid, uuid, uuid) is
  'La tasa que corresponde por taxonomia, sin mirar el articulo. Para poder mostrarla mientras se carga uno nuevo, que todavia no existe.';

-- ---------------------------------------------------------------------------
-- La excepcion del articulo, si la tiene
-- ---------------------------------------------------------------------------
create or replace function public.tasa_de_articulo(p_variant_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select b.tax_rate_id
    from catalog_variante v
    join catalog_producto_base b on b.id = v.producto_base_id
   where v.id = p_variant_id;
$$;

comment on function public.tasa_de_articulo(uuid) is
  'Solo la excepcion declarada en el articulo. NULL significa que hereda, no que no tenga impuesto.';

-- ---------------------------------------------------------------------------
-- Una sola escalera
-- ---------------------------------------------------------------------------
create or replace function public.tasa_resuelta(p_base_id uuid)
returns table (
  tax_rate_id uuid,
  code        text,
  name        text,
  rate        numeric,
  origen      text
)
language sql
stable
security invoker
set search_path = public
as $$
  select case when b.tax_rate_id is not null then r.id   else h.tax_rate_id end,
         case when b.tax_rate_id is not null then r.code else h.code        end,
         case when b.tax_rate_id is not null then r.name else h.name        end,
         case when b.tax_rate_id is not null then r.rate else h.rate        end,
         case when b.tax_rate_id is not null then 'articulo' else h.origen  end
    from catalog_producto_base b
    left join tax_rates r on r.id = b.tax_rate_id
    cross join lateral tasa_por_taxonomia(b.departamento_id, b.categoria_id, b.subcategoria_id) h
   where b.id = p_base_id;
$$;

comment on function public.tasa_resuelta(uuid) is
  'La tasa de un articulo: la suya si declaro una, si no la que hereda de su taxonomia. La escalera vive en tasa_por_taxonomia; aca solo se agrega el nivel del articulo.';

grant execute on function public.tasa_por_taxonomia(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.tasa_de_articulo(uuid)               to anon, authenticated;

commit;
