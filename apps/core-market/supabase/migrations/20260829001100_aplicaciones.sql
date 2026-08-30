-- ===========================================================================
-- Aplicaciones: las herramientas de la plataforma, y si andan
-- ===========================================================================
--
-- POR QUÉ ESTA VISTA
-- Porque hoy no hay forma de saber si una herramienta funciona hasta que algo
-- falla por su culpa. En el Vault hay cuatro credenciales y tres tienen
-- `status = 'unknown'` con `last_checked_at` vacío: nunca se verificaron. Y
-- `ml_credentials` y `mp_credentials` están vacías, o sea que Mercado Libre
-- figura instalado y no está conectado.
--
-- Eso ya nos costó una vuelta entera: la clave de Serper estaba cargada bajo
-- una plataforma equivocada y la función que la usaba ni siquiera estaba
-- desplegada. Nadie podía verlo — no había dónde mirar.
--
-- QUÉ MUESTRA
-- Por herramienta: si tiene credencial, cuándo se verificó por última vez, si
-- falló y con qué error, y en cuántas tiendas está en uso. Lo que hace falta
-- para responder "¿esto anda?" sin abrir la base.
--
-- LA PRUEBA SE REGISTRA
-- `registrar_prueba_de_app` deja el resultado en el Vault: `last_checked_at`,
-- `last_error` y `status`. Una prueba que no deja rastro obliga a repetirla
-- cada vez que alguien pregunta.
-- ===========================================================================

begin;

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

    -- Los canales tienen su propia tabla de conexión, aparte del Vault: tener
    -- la aplicación registrada no es lo mismo que estar conectado a una
    -- cuenta. Es justo la distinción que hoy no se ve en ningún lado.
    'canales', jsonb_build_object(
      'mercadolibre', jsonb_build_object(
        'conectadas', (select count(*) from ml_credentials where is_active),
        'ultima',     (select max(updated_at) from ml_credentials),
        'con_error',  (select count(*) from ml_credentials where coalesce(last_error,'') <> '')
      ),
      'mercadopago', jsonb_build_object(
        'conectadas', (select count(*) from mp_credentials where is_active),
        'ultima',     (select max(updated_at) from mp_credentials),
        'con_error',  (select count(*) from mp_credentials where coalesce(last_error,'') <> '')
      )
    )

  ) into v;

  return v;
end;
$$;

comment on function public.aplicaciones_de_plataforma() is
  'Las herramientas de la plataforma y su estado real: credencial, última verificación, error y uso.';

-- ---------------------------------------------------------------------------
-- Registrar el resultado de una prueba
-- ---------------------------------------------------------------------------
create or replace function public.registrar_prueba_de_app(
  p_plataforma text,
  p_ok         boolean,
  p_error      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market prueba las aplicaciones.' using errcode = '42501';
  end if;

  update api_vault set
    last_checked_at = now(),
    -- El error se BORRA cuando la prueba sale bien. Un error viejo que queda
    -- pegado hace dudar de una herramienta que ya funciona.
    last_error      = case when p_ok then null else left(coalesce(p_error, 'falló sin mensaje'), 500) end,
    status          = case when p_ok then 'active' else 'error' end,
    updated_at      = now()
  where platform = p_plataforma;

  if not found then
    raise exception 'No hay ninguna credencial cargada para "%".', p_plataforma
      using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.registrar_prueba_de_app(text, boolean, text) is
  'Deja el resultado de la prueba en el Vault. Una prueba sin rastro hay que repetirla cada vez que alguien pregunta.';

grant  execute on function public.aplicaciones_de_plataforma()                  to authenticated;
grant  execute on function public.registrar_prueba_de_app(text, boolean, text)  to authenticated;
revoke execute on function public.aplicaciones_de_plataforma()                  from anon;
revoke execute on function public.registrar_prueba_de_app(text, boolean, text)  from anon;

commit;
