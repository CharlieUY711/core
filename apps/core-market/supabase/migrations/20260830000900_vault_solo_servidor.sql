-- Credenciales que el navegador NUNCA puede leer.
--
-- LA PREGUNTA QUE LO ORIGINA
-- "La clave de la app de Meta, ¿no debería estar en el API Vault?". Sí. Estaba
-- en los Secrets de Supabase por una razón buena y una mala.
--
-- LA BUENA: la clave secreta de una app NO PUEDE LLEGAR AL NAVEGADOR. Con ella,
-- cualquiera se hace pasar por nuestra app contra Meta. Y todo lo que hoy hay
-- en el Vault lo puede leer su dueño desde el panel: la pantalla tiene un botón
-- para mostrar el valor.
--
-- LA MALA: que el Vault no tenía cómo guardar algo que el servidor usa y el
-- cliente no ve. Tenía `client_exposed`, que AMPLÍA el acceso —lo hace legible
-- por cualquiera—, y nada que lo achique por debajo del dueño.
--
-- Eso es lo que se agrega. `solo_servidor` es el escalón que faltaba:
--
--   client_exposed = true    lo lee cualquiera         (una clave pública)
--   (ninguno)                lo lee su dueño           (el caso normal)
--   solo_servidor = true     NO lo lee nadie por API   (una clave de verdad)
--
-- Lo leen las Edge Functions con la service role, que pasa por encima de RLS
-- porque corre en el servidor y no en el navegador de nadie.
--
-- QUÉ SE PUEDE VER IGUAL
-- Que la credencial EXISTE, cuándo se cargó y quién. Lo único que no sale nunca
-- es el valor. Ocultar también su existencia dejaría al configurador sin poder
-- decir si está puesta, que es justamente lo que hay que poder ver.

alter table public.api_vault
  add column if not exists solo_servidor boolean not null default false;

comment on column public.api_vault.solo_servidor is
  'El valor no sale nunca por API: sólo lo leen las Edge Functions con la '
  'service role. Para claves que comprometen el sistema si llegan al navegador.';

-- ── Las políticas de lectura dejan de alcanzarlas ───────────────────────
--
-- Las dos, no una: `client_exposed` y `solo_servidor` juntas serían una
-- contradicción -"que lo lea cualquiera" y "que no lo lea nadie"-, y en una
-- contradicción entre abrir y cerrar tiene que ganar cerrar.

drop policy if exists "api_vault: usuario lee los suyos" on public.api_vault;
create policy "api_vault: usuario lee los suyos"
  on public.api_vault for select
  using (auth.uid() = user_id and not solo_servidor);

drop policy if exists "api_vault: cualquiera lee las marcadas client_exposed" on public.api_vault;
create policy "api_vault: cualquiera lee las marcadas client_exposed"
  on public.api_vault for select
  using (client_exposed = true and not solo_servidor);

-- ── Guardar una: sólo la plataforma ────────────────────────────────────
--
-- Es una credencial del sistema, no de una persona: la carga CORE Market y vale
-- para todas las tiendas. Una tienda que la pudiera escribir estaría cambiando
-- con qué se conectan las demás.
create or replace function public.guardar_credencial_de_servidor(
  p_plataforma text,
  p_nombre     text,
  p_valor      text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market carga credenciales del servidor.' using errcode = '42501';
  end if;

  if coalesce(trim(p_valor), '') = '' then
    raise exception 'El valor no puede estar vacío.' using errcode = '22023';
  end if;

  -- Se busca por (plataforma, nombre) y no por dueño: es del sistema, así que
  -- hay UNA. Si se guardara una por persona, cuál se usa dependería de quién
  -- la cargó último.
  select id into v_id
    from api_vault
   where platform = p_plataforma and name = p_nombre and solo_servidor
   limit 1;

  if v_id is not null then
    update api_vault
       set value = p_valor, updated_at = now(),
           status = 'active', last_error = null
     where id = v_id;
  else
    insert into api_vault
      (user_id, tenant_id, name, platform, type, value, env,
       tags, client_exposed, solo_servidor, status)
    values
      (auth.uid(), tienda_plataforma(), p_nombre, p_plataforma, 'secret', p_valor,
       'production', array['servidor'], false, true, 'active');
  end if;
end;
$$;

-- ── Ver cuáles hay, sin ver ninguna ────────────────────────────────────
--
-- Devuelve TODO menos el valor. Poder decir "está cargada y desde cuándo" es lo
-- que hace que el configurador sirva; el valor no hace falta para eso.
create or replace function public.credenciales_de_servidor()
returns table (plataforma text, nombre text, cargada timestamptz, largo integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not soy_la_plataforma() then
    raise exception 'Sólo CORE Market ve las credenciales del servidor.' using errcode = '42501';
  end if;

  return query
    select v.platform, v.name, v.updated_at,
           -- El largo, no el valor: alcanza para notar que se pegó algo
           -- truncado y no dice nada útil a quien no debería verlo.
           length(v.value)
      from api_vault v
     where v.solo_servidor
     order by v.platform, v.name;
end;
$$;

grant  execute on function public.guardar_credencial_de_servidor(text, text, text) to authenticated;
revoke execute on function public.guardar_credencial_de_servidor(text, text, text) from public;
revoke execute on function public.guardar_credencial_de_servidor(text, text, text) from anon;

grant  execute on function public.credenciales_de_servidor() to authenticated;
revoke execute on function public.credenciales_de_servidor() from public;
revoke execute on function public.credenciales_de_servidor() from anon;
