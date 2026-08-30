-- ===========================================================================
-- Lo que necesita atención
-- ===========================================================================
--
-- El Dashboard de CORE Market responde "¿está todo bien?". Para eso hace falta
-- un dato que la configuración no traía: cuántas publicaciones cuelgan de la
-- plataforma.
--
-- No debería haber ninguna. El portal de marca es explícito: CORE Market "no
-- realiza actividad comercial por sí misma". Una publicación suya es una
-- contradicción con el modelo, y hoy hay una —quedó de cuando `charlie-market`
-- era la plataforma y la tienda al mismo tiempo.
--
-- No se bloquea con un `check`: bloquearlo dejaría esa fila sin poder editarse
-- ni moverse, que es justo lo que hay que hacer con ella. Se muestra.
-- ===========================================================================

begin;

create or replace function public.estado_de_la_plataforma()
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
    raise exception 'Sólo CORE Market ve el estado de la plataforma.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'territorios_sin_configurar', (
      select count(*) from countries p
       where not (
         exists (select 1 from currencies m where m.country_id = p.id and m.status = 'active')
         and exists (select 1 from tax_rates r where r.country_id = p.id and r.status = 'active'))
    ),
    'territorios_total', (select count(*) from countries),

    'herramientas_sin_verificar', (
      select count(*) from api_vault where last_checked_at is null
    ),
    'herramientas_con_error', (
      select count(*) from api_vault where status = 'error'
    ),

    'canales_sin_conectar', (
      (case when (select count(*) from ml_credentials where is_active) = 0 then 1 else 0 end)
      + (case when (select count(*) from mp_credentials where is_active) = 0 then 1 else 0 end)
    ),

    -- La plataforma administra y no vende. Cualquier número acá es un error.
    'publicaciones_de_la_plataforma', (
      select count(*) from catalog_producto_base b
       where b.tenant_id = tienda_plataforma()
    ),

    'tiendas', (select count(*) from stores where not es_plataforma),
    'tiendas_activas', (select count(*) from stores where not es_plataforma and is_active),
    'tiendas_sin_duenio', (
      select count(*) from stores s
       where not s.es_plataforma
         and not exists (select 1 from store_members m where m.store_id = s.id)
    ),

    -- La cotización más vieja de las vigentes. Si el trabajo diario dejó de
    -- correr, esto es lo único que lo dice.
    'cotizacion_mas_vieja', (
      select min(x.valid_at) from (
        select distinct on (r.from_currency, r.to_currency) r.valid_at
          from exchange_rates r
         order by r.from_currency, r.to_currency, r.valid_at desc
      ) x
    ),

    'fichas_compartidas', (
      select count(*) from catalogo_market where compartida
    )
  ) into v;

  return v;
end;
$$;

comment on function public.estado_de_la_plataforma() is
  'Qué necesita atención. Lo que hoy había que salir a buscar tabla por tabla.';

grant  execute on function public.estado_de_la_plataforma() to authenticated;
revoke execute on function public.estado_de_la_plataforma() from anon;

commit;
