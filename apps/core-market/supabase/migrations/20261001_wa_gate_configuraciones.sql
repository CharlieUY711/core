-- WhatsApp Gate: varias configuraciones guardadas + elegir el teléfono que responde.
-- Pegar completo en Supabase > SQL Editor > Run. Se puede correr más de una vez.
-- Requiere haber corrido antes 20261001_wa_gate.sql.

-- Nombre de cada configuración y teléfono (de la cuenta de Meta) que responde.
-- phone_number_id vacío = el WhatsApp conectado en el Vault (como hasta ahora).
alter table public.wa_gates add column if not exists name text not null default 'Configuración';
alter table public.wa_gates add column if not exists phone_number_id text;

-- Antes: un solo gate por destinatario. Ahora se pueden guardar varios y
-- sólo UNO puede estar activo por destinatario + teléfono: activar otro apaga
-- el anterior, y se puede volver a él cuando se quiera.
alter table public.wa_gates drop constraint if exists wa_gates_user_id_recipient_key;

create unique index if not exists wa_gates_una_activa
  on public.wa_gates (user_id, recipient, coalesce(phone_number_id, ''))
  where enabled;

create index if not exists wa_gates_busqueda
  on public.wa_gates (recipient, phone_number_id) where enabled;
