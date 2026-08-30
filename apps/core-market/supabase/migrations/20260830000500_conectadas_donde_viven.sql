-- Las cuentas conectadas se cuentan donde viven de verdad.
--
-- SÍNTOMA: /admin/ml decía "2 cuentas conectadas" y Herramientas y Apps, al
-- lado, decía "Sin ninguna cuenta conectada: no puede publicar". Las dos
-- pantallas hablaban del mismo hecho y decían lo contrario.
--
-- CAUSA: `ml_credentials` y `mp_credentials` están VACÍAS y no las lee nadie —
-- ni el motor de publicación, ni la pantalla de ML, ni ningún código del
-- front—. Lo comprobé: los únicos archivos del repositorio que las mencionan
-- son estas mismas migraciones. La conexión real la escribe `ml-oauth` en
-- `api_vault`, con `type = 'oauth'`, y de ahí la leen la pantalla y el motor.
--
-- O sea: el aviso era falso. Y era la peor forma de ser falso, porque decía
-- exactamente lo que alguien sin cuenta conectada esperaría leer.
--
-- QUÉ ES "CONECTADA", ENTONCES
-- Una credencial OAuth de esa plataforma que todavía no venció. El vencimiento
-- cuenta: un token vencido está cargado y no sirve, y llamarlo conectado es
-- volver a mentir en la otra dirección. Sin `expires_at` se considera vigente:
-- no todas las plataformas vencen.

-- Una sola definición de "conectada", para que las dos pantallas no puedan
-- volver a discrepar.
create or replace function public.canal_conectado(p_plataforma text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'conectadas', count(*) filter (
      where v.type = 'oauth'
        and (v.expires_at is null or v.expires_at > now())),
    'ultima',     max(v.updated_at),
    'con_error',  count(*) filter (where coalesce(v.last_error, '') <> '')
  )
    from api_vault v
   where v.platform = p_plataforma;
$$;

create or replace function public.aplicaciones_de_plataforma()
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
    raise exception 'Sólo CORE Market ve las aplicaciones.' using errcode = '42501';
  end if;

  select jsonb_build_object(

    -- Una fila por plataforma del Vault. `en_tiendas` cuenta las credenciales
    -- de tiendas, sin contar la de la plataforma: es "cuántas la usan", no
    -- "cuántas veces está cargada".
    'credenciales', (
      select coalesce(jsonb_agg(x order by x ->> 'plataforma'), '[]'::jsonb) from (
        select jsonb_build_object(
          'plataforma',   v.platform,
          'tipo',         min(v.type),
          'estado',       min(v.status),
          'actualizada',  max(v.updated_at),
          'verificada',   max(v.last_checked_at),
          'ultimo_error', (array_agg(v.last_error order by v.updated_at desc))[1],
          'en_plataforma', bool_or(v.tenant_id is null),
          'en_tiendas',   count(*) filter (where v.tenant_id is not null)
        ) x
          from api_vault v
         group by v.platform
      ) t
    ),

    -- Los canales: cuántas CUENTAS hay conectadas, que no es lo mismo que
    -- tener la aplicación registrada. Sale de `api_vault`, que es donde
    -- `ml-oauth` la escribe y de donde la leen la pantalla y el motor.
    'canales', jsonb_build_object(
      'mercadolibre', canal_conectado('MercadoLibre'),
      'mercadopago',  canal_conectado('MercadoPago')
    )

  ) into v;

  return v;
end;
$$;

-- El monitor del Dashboard contaba con las mismas tablas vacias: decia que los
-- dos canales estaban sin conectar aunque estuvieran los dos conectados.
--
-- La definicion de abajo se saco de la base TAL CUAL y se le cambio solo ese
-- bloque. Reescribirla de memoria hubiera perdido la mitad de los indicadores:
-- casi lo hago.
CREATE OR REPLACE FUNCTION public.estado_de_la_plataforma()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v jsonb;
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
    'herramientas_sin_verificar', (select count(*) from api_vault where last_checked_at is null),
    'herramientas_con_error',     (select count(*) from api_vault where status = 'error'),
    -- Contaba con `ml_credentials` y `mp_credentials`, que estan vacias y no
    -- las lee nadie: el Dashboard decia que los dos canales estaban sin
    -- conectar aunque estuvieran los dos conectados.
    'canales_sin_conectar', (
      (case when ((canal_conectado('MercadoLibre') ->> 'conectadas')::int) = 0 then 1 else 0 end)
      + (case when ((canal_conectado('MercadoPago')  ->> 'conectadas')::int) = 0 then 1 else 0 end)
    ),
    'publicaciones_de_la_plataforma', (
      select count(*) from catalog_producto_base b where b.tenant_id = tienda_plataforma()
    ),
    'tiendas',         (select count(*) from stores where not es_plataforma),
    'tiendas_activas', (select count(*) from stores where not es_plataforma and is_active),
    'tiendas_sin_duenio', (
      select count(*) from stores s
       where not s.es_plataforma
         and not exists (select 1 from store_members m where m.store_id = s.id)
    ),
    'cotizacion_mas_vieja', (
      select min(x.valid_at) from (
        select distinct on (r.from_currency, r.to_currency) r.valid_at
          from exchange_rates r
         order by r.from_currency, r.to_currency, r.valid_at desc
      ) x
    ),
    'fichas_compartidas', (select count(*) from catalogo_market where compartida),

    -- Monitores. No se tocan desde el Dashboard: cada uno tiene su lugar, y
    -- repetir el control acá sería tener dos lugares donde cambiar lo mismo.
    'funcionalidades', (select count(*) from plataforma_apps where tipo = 'funcionalidad' and activa),
    'herramientas',    (select count(*) from plataforma_apps where tipo = 'herramienta'   and activa),
    'apps',            (select count(*) from plataforma_apps where tipo = 'app'           and activa),
    'departamentos',   (select count(*) from departamentos where activo),
    'categorias',      (select count(*) from categorias    where activo),
    'subcategorias',   (select count(*) from subcategorias)
  ) into v;

  return v;
end;
$function$;

grant  execute on function public.canal_conectado(text) to authenticated;
revoke execute on function public.canal_conectado(text) from public;
revoke execute on function public.canal_conectado(text) from anon;
