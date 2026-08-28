-- ===========================================================================
-- Impuestos: la tasa se hereda, el precio ya la incluye
-- ===========================================================================
--
-- DOS REGLAS QUE MANDAN SOBRE TODO LO DEMAS
--
-- 1. Los precios se publican CON IMPUESTOS INCLUIDOS. La tasa no multiplica al
--    precio: lo descompone. Ponés 1.220 y elegís Básica 22% → neto 1.000 +
--    IVA 220. Cambiar la tasa NO puede mover el precio publicado, solo el
--    desglose. Al reves -neto × 1,22- cambiaria precios de venta sin que nadie
--    lo pida.
--
-- 2. La tasa se HEREDA. Vive en la taxonomia y el articulo solo la sobrescribe
--    cuando hay una razon. Guardarla siempre en el articulo se siente mas
--    seguro al cargarlo, pero copia un default en cada fila — y una copia no
--    dice de donde salio. El dia que cambia una tasa por ley, o que una
--    categoria entera estaba mal clasificada, no hay forma de distinguir las
--    excepciones decididas a proposito del default que quedo congelado.
--
--    Por eso `tax_rate_id` es NULLABLE en los cuatro niveles: null significa
--    "la que diga arriba", un valor significa "esta, decidida aca". Y entonces
--    `where tax_rate_id is not null` es la lista de excepciones, que es
--    exactamente lo que un contador quiere auditar.
--
-- LO QUE ESTO DEJA PREPARADO SIN CONSTRUIRLO
-- Los compuestos -recetas y canastas- son una necesidad, no para ahora. Una
-- canasta con vino y turron NO tiene una tasa: cada parte lleva la suya y hay
-- que desglosarlas. Si hoy escribieramos `iva_del_articulo(id) → 22`, ese dia
-- se rompe todo lo que la llama.
--
-- Por eso `lineas_de_impuesto` devuelve LINEAS, no una tasa. Hoy siempre
-- devuelve una. El dia de la canasta devuelve varias y ningun llamador se
-- entera: el cambio queda adentro de la funcion. Lo mismo del otro lado — la
-- orden congela lineas en plural aunque hoy siempre sea una.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Las tasas
-- ---------------------------------------------------------------------------
-- Por pais, no hardcodeadas: las tres de Uruguay son las de Uruguay, y el
-- modelo ya tiene `countries`. Un CHECK con 'exento/minima/basica' habria
-- metido la legislacion uruguaya adentro del esquema.
create table if not exists tax_rates (
  id          uuid primary key default gen_random_uuid(),
  country_id  uuid not null references countries(id),
  code        text not null,
  name        text not null,
  -- Porcentaje, no fraccion: 22 es 22%. Se guarda como lo dice la ley, que es
  -- como lo va a leer quien lo audite.
  rate        numeric(6,3) not null check (rate >= 0 and rate <= 100),
  -- La que se aplica cuando nadie declaro ninguna. En Uruguay casi todo es
  -- Basica: sin un default, un articulo sin clasificar se venderia sin
  -- impuesto y nadie lo notaria.
  is_default  boolean not null default false,
  status      text not null default 'active'
              check (status = any (array['active','inactive'])),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (country_id, code)
);

create unique index if not exists tax_rates_un_default_por_pais
  on tax_rates (country_id) where is_default;

insert into tax_rates (country_id, code, name, rate, is_default)
select c.id, t.code, t.name, t.rate, t.es_default
  from countries c
  join (values
    ('exento', 'Exento',       0.000, false),
    ('minima', 'Mínima 10%',  10.000, false),
    ('basica', 'Básica 22%',  22.000, true)
  ) as t(code, name, rate, es_default) on true
 where c.iso_code = 'UY'
   and not exists (select 1 from tax_rates x where x.country_id = c.id and x.code = t.code);

alter table tax_rates enable row level security;
drop policy if exists tax_rates_lectura_publica on tax_rates;
create policy tax_rates_lectura_publica
  on tax_rates for select to anon, authenticated using (true);

comment on table tax_rates is
  'Tasas de impuesto por pais. `rate` en porcentaje (22 = 22%). `is_default` es la que se aplica cuando ningun nivel declara otra.';

-- ---------------------------------------------------------------------------
-- Donde se declara
-- ---------------------------------------------------------------------------
-- Nullable en los cuatro niveles. La pregunta "categoria o subcategoria" se
-- disuelve: se declara donde efectivamente cambia. Basica en el departamento,
-- Minima en "Alimentos", y no se toca mas.
alter table departamentos          add column if not exists tax_rate_id uuid references tax_rates(id);
alter table categorias             add column if not exists tax_rate_id uuid references tax_rates(id);
alter table subcategorias          add column if not exists tax_rate_id uuid references tax_rates(id);
alter table catalog_producto_base  add column if not exists tax_rate_id uuid references tax_rates(id);

comment on column catalog_producto_base.tax_rate_id is
  'Excepcion. NULL = la tasa que corresponda por su taxonomia. Un valor = decidida en este articulo, a proposito.';

-- ---------------------------------------------------------------------------
-- Resolver la tasa
-- ---------------------------------------------------------------------------
-- De lo mas especifico a lo mas general, y el default del pais al final. El
-- orden es la regla entera.
create or replace function public.tasa_resuelta(p_base_id uuid)
returns table (
  tax_rate_id uuid,
  code        text,
  name        text,
  rate        numeric,
  /** De donde salio: 'articulo' | 'subcategoria' | 'categoria' | 'departamento' | 'default' */
  origen      text
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select b.tax_rate_id as t_art,
           s.tax_rate_id as t_sub,
           c.tax_rate_id as t_cat,
           d.tax_rate_id as t_dep
      from catalog_producto_base b
      left join subcategorias s on s.id = b.subcategoria_id
      left join categorias    c on c.id = b.categoria_id
      left join departamentos d on d.id = b.departamento_id
     where b.id = p_base_id
  ),
  elegida as (
    select coalesce(t_art, t_sub, t_cat, t_dep) as id,
           case when t_art is not null then 'articulo'
                when t_sub is not null then 'subcategoria'
                when t_cat is not null then 'categoria'
                when t_dep is not null then 'departamento'
           end as origen
      from base
  )
  select r.id, r.code, r.name, r.rate,
         coalesce(e.origen, 'default')
    from tax_rates r
    left join elegida e on true
   where r.id = e.id
      -- Sin ninguna declarada, la default del pais. Con `e.id` nulo el join de
      -- arriba no matchea nada, asi que este brazo es el que responde.
      or (e.id is null and r.is_default
          and r.country_id = (select id from countries where iso_code = 'UY'))
   limit 1;
$$;

comment on function public.tasa_resuelta(uuid) is
  'La tasa que le corresponde a un articulo: la suya, si no la de su subcategoria, categoria o departamento, si no la default del pais. `origen` dice cual gano.';

-- ---------------------------------------------------------------------------
-- Descomponer un precio
-- ---------------------------------------------------------------------------
-- Devuelve LINEAS, no una tasa. Hoy siempre una; el dia de las canastas, una
-- por componente, y ningun llamador cambia.
--
-- El precio que entra YA INCLUYE el impuesto -es la regla de la casa- asi que
-- esto descompone hacia atras: neto = bruto / (1 + tasa/100).
create or replace function public.lineas_de_impuesto(
  p_base_id  uuid,
  p_precio   numeric,      -- unitario, CON impuesto incluido
  p_cantidad integer default 1
)
returns table (
  code   text,
  name   text,
  rate   numeric,
  bruto  numeric,          -- lo que paga el cliente por esta linea
  neto   numeric,          -- sin impuesto
  monto  numeric           -- el impuesto contenido en el bruto
)
language sql
stable
security invoker
set search_path = public
as $$
  select t.code, t.name, t.rate,
         round(p_precio * p_cantidad, 2)                              as bruto,
         round((p_precio * p_cantidad) / (1 + t.rate / 100.0), 2)     as neto,
         round(p_precio * p_cantidad
               - (p_precio * p_cantidad) / (1 + t.rate / 100.0), 2)   as monto
    from tasa_resuelta(p_base_id) t;
$$;

comment on function public.lineas_de_impuesto(uuid, numeric, integer) is
  'Desglose de impuesto de una venta. Devuelve lineas -hoy siempre una- porque un compuesto tipo canasta lleva una por componente, cada una con su tasa. El precio que entra ya incluye el impuesto.';

grant execute on function public.tasa_resuelta(uuid)                        to anon, authenticated;
grant execute on function public.lineas_de_impuesto(uuid, numeric, integer) to anon, authenticated;

commit;
