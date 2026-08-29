-- ===========================================================================
-- Guardar de dónde salió la tasa de un artículo
-- ===========================================================================
--
-- Hoy `catalog_producto_base.tax_rate_id` dice QUÉ tasa tiene un artículo, y
-- nada más. No hay forma de distinguir una tasa puesta a mano de una sugerida
-- por el motor, ni de saber con qué regla ni con cuánta certeza. Sin eso, la
-- regla de "no pisar lo manual" no se puede cumplir: no hay dónde mirar.
--
-- LO QUE SE GUARDA ES EL RASTRO, NO LA TASA
-- `tax_rate_id` sigue significando lo mismo: NULL es "hereda de su taxonomía",
-- un valor es "excepción decidida acá". Estas columnas cuentan de dónde vino
-- esa decisión, y existen también cuando `tax_rate_id` es NULL — el caso en que
-- el motor CONFIRMA lo que la taxonomía ya decía y por lo tanto no hay
-- excepción que crear. Ese caso es el importante: sin estas columnas, confirmar
-- y no haber corrido nunca el motor se ven igual.
-- ===========================================================================

begin;

alter table catalog_producto_base
  add column if not exists tax_source         text,
  add column if not exists tax_confidence     text,
  add column if not exists tax_rule           text,
  add column if not exists tax_reason         text,
  add column if not exists tax_engine_version text,
  add column if not exists tax_classified_at  timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_producto_base_tax_source_check'
  ) then
    alter table catalog_producto_base
      add constraint catalog_producto_base_tax_source_check
      check (tax_source is null or tax_source = any (
        array['SUGGESTED','CONFIRMED','MANUAL','REVIEW_REQUIRED']));
  end if;
end $$;

comment on column catalog_producto_base.tax_source is
  'De donde salio la clasificacion: SUGGESTED (el motor), CONFIRMED (una persona la acepto), MANUAL (una persona la puso), REVIEW_REQUIRED (el motor no se animo). NULL = nunca se clasifico.';
comment on column catalog_producto_base.tax_rule is
  'Regla del motor que gano. Junto con tax_engine_version permite saber que produjo esta clasificacion y detectar las que quedaron atras.';

-- ---------------------------------------------------------------------------
-- Guardar una clasificación
-- ---------------------------------------------------------------------------
-- `p_respetar_manual` es la regla del punto 4 hecha cumplir del lado del dato,
-- no solo de la pantalla: con una clasificacion MANUAL guardada, esta funcion
-- no hace nada y devuelve false. Reemplazarla exige mandar false a proposito,
-- que es lo que hace el boton cuando el usuario confirma que quiere pisar su
-- propia decision.
--
-- Sin esto, cualquier corrida futura del motor -un job, una importacion, otra
-- pantalla- borraria decisiones tomadas por personas sin que nadie se entere.
create or replace function public.guardar_clasificacion_fiscal(
  p_variant_id      uuid,
  p_tax_rate_id     uuid    default null,
  p_source          text    default 'SUGGESTED',
  p_confidence      text    default null,
  p_rule            text    default null,
  p_reason          text    default null,
  p_version         text    default null,
  p_respetar_manual boolean default true
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_base   uuid;
  v_actual text;
begin
  select v.producto_base_id, b.tax_source
    into v_base, v_actual
    from catalog_variante v
    join catalog_producto_base b on b.id = v.producto_base_id
   where v.id = p_variant_id;

  if v_base is null then
    raise exception 'La publicación no existe o no pertenece a esta tienda.'
      using errcode = '42501';
  end if;

  if p_respetar_manual and v_actual = 'MANUAL' then
    return false;
  end if;

  if p_tax_rate_id is not null
     and not exists (select 1 from tax_rates where id = p_tax_rate_id and status = 'active') then
    raise exception 'La tasa indicada no existe o está inactiva.' using errcode = '22023';
  end if;

  update catalog_producto_base set
    -- NULL en `p_tax_rate_id` NO es "no me lo mandaste": es "no hay excepcion,
    -- que siga heredando". Por eso se asigna directo y no con coalesce.
    tax_rate_id        = p_tax_rate_id,
    tax_source         = p_source,
    tax_confidence     = p_confidence,
    tax_rule           = p_rule,
    tax_reason         = p_reason,
    tax_engine_version = p_version,
    tax_classified_at  = now(),
    updated_at         = now()
  where id = v_base;

  return true;
end;
$$;

comment on function public.guardar_clasificacion_fiscal(uuid, uuid, text, text, text, text, text, boolean) is
  'Guarda la clasificacion fiscal y su rastro. Con p_respetar_manual, una clasificacion MANUAL no se pisa y devuelve false.';

-- ---------------------------------------------------------------------------
-- Poner la tasa a mano deja constancia de que fue a mano
-- ---------------------------------------------------------------------------
create or replace function public.fijar_tasa_articulo(
  p_variant_id  uuid,
  p_tax_rate_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_base uuid;
begin
  select v.producto_base_id into v_base
    from catalog_variante v
   where v.id = p_variant_id;

  if v_base is null then
    raise exception 'La publicación no existe o no pertenece a esta tienda.'
      using errcode = '42501';
  end if;

  if p_tax_rate_id is not null
     and not exists (select 1 from tax_rates where id = p_tax_rate_id and status = 'active') then
    raise exception 'La tasa indicada no existe o está inactiva.' using errcode = '22023';
  end if;

  update catalog_producto_base set
    tax_rate_id = p_tax_rate_id,
    -- Elegir la tasa en el selector es una decision de una persona, y queda
    -- registrada como tal: es lo que despues impide que el motor la pise.
    -- Soltarla -volver a heredar- tampoco es una sugerencia del motor, asi que
    -- el rastro anterior se limpia.
    tax_source         = case when p_tax_rate_id is null then null else 'MANUAL' end,
    tax_confidence     = null,
    tax_rule           = null,
    tax_reason         = null,
    tax_engine_version = null,
    tax_classified_at  = case when p_tax_rate_id is null then null else now() end,
    updated_at         = now()
  where id = v_base;
end;
$$;

grant execute on function public.guardar_clasificacion_fiscal(uuid, uuid, text, text, text, text, text, boolean) to authenticated;

commit;
