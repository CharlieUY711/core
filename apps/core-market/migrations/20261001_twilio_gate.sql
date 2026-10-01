-- WhatsApp Gate con Twilio: proveedor por configuración + credenciales en el Vault.
-- Pegar completo en Supabase > SQL Editor > Run. Se puede correr más de una vez.
-- Requiere haber corrido antes 20261001_wa_gate.sql y 20261001_wa_gate_configuraciones.sql.

-- ── Columnas nuevas en wa_gates (las existentes quedan como Meta) ──────────
alter table public.wa_gates add column if not exists provider text not null default 'meta';
alter table public.wa_gates add column if not exists twilio_from text;            -- sólo dígitos: 14155238886
alter table public.wa_gates add column if not exists menu_return_seconds int not null default 8;

alter table public.wa_gates drop constraint if exists wa_gates_provider_check;
alter table public.wa_gates add constraint wa_gates_provider_check check (provider in ('meta','twilio'));

alter table public.wa_gates drop constraint if exists wa_gates_twilio_from_check;
alter table public.wa_gates add constraint wa_gates_twilio_from_check
  check (provider <> 'twilio' or (twilio_from is not null and twilio_from ~ '^[0-9]{8,15}$'));

alter table public.wa_gates drop constraint if exists wa_gates_menu_return_check;
alter table public.wa_gates add constraint wa_gates_menu_return_check
  check (menu_return_seconds between 0 and 300);

-- Una sola activa por destinatario + proveedor + teléfono/remitente.
drop index if exists public.wa_gates_una_activa;
create unique index if not exists wa_gates_una_activa
  on public.wa_gates (user_id, recipient, provider, coalesce(phone_number_id, ''), coalesce(twilio_from, ''))
  where enabled;

create index if not exists wa_gates_busqueda_twilio
  on public.wa_gates (recipient, twilio_from) where enabled and provider = 'twilio';

-- ── Vault: ampliar la lista blanca de credenciales de servidor ─────────────
-- OJO: esto reemplaza las dos funciones. La lista incluye las de Meta que ya
-- estaban (META_APP_ID, META_APP_SECRET, META_LOGIN_CONFIG_ID), el token de
-- verificación del gate y las dos de Twilio. Si en tu base agregaste otro
-- nombre a mano, sumalo en las dos condiciones antes de correr esto.

create or replace function public.guardar_credencial_servidor(
  p_plataforma text, p_nombre text, p_tipo text, p_valor text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  if not (
       (p_plataforma = 'Meta'   and p_nombre in ('META_APP_ID','META_APP_SECRET','META_LOGIN_CONFIG_ID','WA_GATE_VERIFY_TOKEN'))
    or (p_plataforma = 'Twilio' and p_nombre in ('TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN'))
  ) then
    raise exception 'Credencial de servidor no permitida: % / %', p_plataforma, p_nombre;
  end if;
  if coalesce(trim(p_valor), '') = '' then raise exception 'El valor está vacío'; end if;

  update public.api_vault
     set value = trim(p_valor), updated_at = now()
   where user_id = v_uid and platform = p_plataforma and name = p_nombre and solo_servidor = true;

  if not found then
    if exists (select 1 from public.api_vault
                where platform = p_plataforma and name = p_nombre and solo_servidor = true
                  and user_id <> v_uid and p_plataforma = 'Meta') then
      raise exception 'Esa credencial ya existe y pertenece a otro usuario';
    end if;
    insert into public.api_vault (user_id, name, platform, type, value, env, tags, solo_servidor)
    values (v_uid, p_nombre, p_plataforma, coalesce(nullif(p_tipo,''),'api_key'),
            trim(p_valor), 'production', array['asistente'], true);
  end if;
end $$;

create or replace function public.borrar_credencial_servidor(
  p_plataforma text, p_nombre text
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n integer;
begin
  if v_uid is null then raise exception 'Sin sesión'; end if;
  if not (
       (p_plataforma = 'Meta'   and p_nombre in ('META_APP_ID','META_APP_SECRET','META_LOGIN_CONFIG_ID','WA_GATE_VERIFY_TOKEN'))
    or (p_plataforma = 'Twilio' and p_nombre in ('TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN'))
  ) then
    raise exception 'Credencial de servidor no permitida: % / %', p_plataforma, p_nombre;
  end if;
  delete from public.api_vault
   where user_id = v_uid and platform = p_plataforma and name = p_nombre and solo_servidor = true;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.guardar_credencial_servidor(text,text,text,text) from public, anon;
revoke all on function public.borrar_credencial_servidor(text,text) from public, anon;
grant execute on function public.guardar_credencial_servidor(text,text,text,text) to authenticated;
grant execute on function public.borrar_credencial_servidor(text,text) to authenticated;

notify pgrst, 'reload schema';
