-- ===========================================================================
-- Respaldo de la version anterior, una sola
-- ===========================================================================
--
-- Al unificar alta y edicion en la misma pantalla, editar deja de ser algo que
-- se hace "entrando" a un lugar aparte: se toca una fila, se cambia, se toca
-- otra. Sin red, cada uno de esos movimientos obliga a preguntar "¿descarto los
-- cambios?" o a bloquear la navegacion, y las dos cosas molestan mas de lo que
-- protegen.
--
-- Con una version anterior guardada no hace falta preguntar nada: siempre se
-- puede volver un paso.
--
-- UNA SOLA, A PROPOSITO
-- No es un historial. Un historial pide interfaz para recorrerlo, politica de
-- retencion y decisiones sobre que es una "version". Volver al estado anterior
-- cubre el caso real -me equivoque recien- sin nada de eso.
--
-- Se guarda el articulo entero -base mas variantes-, no los campos que
-- cambiaron: restaurar campo por campo obliga a saber cuales se tocaron, y esa
-- lista se desactualiza en cuanto alguien agrega una columna.
-- ===========================================================================

begin;

alter table catalog_producto_base
  add column if not exists version_anterior    jsonb,
  add column if not exists version_anterior_at timestamptz;

comment on column catalog_producto_base.version_anterior is
  'Estado completo del articulo -base y variantes- justo antes del ultimo cambio. Una sola version: alcanza para deshacer, y no es un historial.';

-- ---------------------------------------------------------------------------
-- Tomar la foto del estado actual
-- ---------------------------------------------------------------------------
create or replace function public.snapshot_articulo(p_base_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'base', to_jsonb(b) - 'version_anterior' - 'version_anterior_at',
    'variantes', coalesce(
      (select jsonb_agg(to_jsonb(v) order by v.created_at)
         from catalog_variante v where v.producto_base_id = b.id),
      '[]'::jsonb)
  )
  from catalog_producto_base b
  where b.id = p_base_id;
$$;

comment on function public.snapshot_articulo(uuid) is
  'Estado completo del articulo como jsonb. Excluye el propio respaldo: guardar el respaldo dentro del respaldo lo duplicaria en cada cambio.';

-- ---------------------------------------------------------------------------
-- Volver al estado anterior
-- ---------------------------------------------------------------------------
create or replace function public.revertir_ultimo_cambio(p_variant_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_base uuid;
  v_snap jsonb;
  v_var  jsonb;
begin
  select v.producto_base_id into v_base
    from catalog_variante v where v.id = p_variant_id;
  if v_base is null then
    raise exception 'La publicación no existe o no pertenece a esta tienda.'
      using errcode = '42501';
  end if;

  select version_anterior into v_snap
    from catalog_producto_base where id = v_base;
  if v_snap is null then
    raise exception 'No hay un cambio anterior para deshacer.' using errcode = '22023';
  end if;

  update catalog_producto_base b set
    titulo          = v_snap->'base'->>'titulo',
    descripcion     = v_snap->'base'->>'descripcion',
    status          = (v_snap->'base'->>'status')::catalog_item_status,
    tipo            = v_snap->'base'->>'tipo',
    marca           = v_snap->'base'->>'marca',
    modelo          = v_snap->'base'->>'modelo',
    condicion       = v_snap->'base'->>'condicion',
    condicion_grado = v_snap->'base'->>'condicion_grado',
    -- Deshacer no se puede deshacer: el respaldo se consume. Dejarlo dejaria a
    -- alguien alternando entre dos estados sin saber en cual esta.
    version_anterior    = null,
    version_anterior_at = null,
    updated_at          = now()
  where b.id = v_base;

  for v_var in select * from jsonb_array_elements(v_snap->'variantes') loop
    update catalog_variante v set
      nombre_variante = v_var->>'nombre_variante',
      sku_variante    = v_var->>'sku_variante',
      precio          = (v_var->>'precio')::numeric,
      moneda          = v_var->>'moneda',
      stock           = (v_var->>'stock')::integer,
      status          = (v_var->>'status')::catalog_variant_status,
      updated_at      = now()
    where v.id = (v_var->>'id')::uuid;
  end loop;
end;
$$;

comment on function public.revertir_ultimo_cambio(uuid) is
  'Restaura el estado guardado antes del ultimo cambio y consume el respaldo: deshacer no se deshace.';

grant execute on function public.snapshot_articulo(uuid)      to authenticated;
grant execute on function public.revertir_ultimo_cambio(uuid) to authenticated;

commit;
