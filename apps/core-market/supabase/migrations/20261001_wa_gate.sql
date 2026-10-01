-- =====================================================
-- WhatsApp Gate (experimental) — "Configuraciones y usos"
-- Un número destinatario escribe al WhatsApp conectado y recibe opciones.
-- Sólo la opción marcada como correcta deja seguir; el resto lo manda a una URL.
-- Ejecutar en: Supabase → SQL Editor (después de la migración del API Vault,
-- que define set_updated_at).
-- =====================================================

create table if not exists public.wa_gates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  recipient       text not null,                 -- sólo dígitos, con país: 59899123456
  recipient_label text,
  prompt          text not null default 'Elegí una opción para continuar:',
  success_text    text not null default '¡Listo! Ya podés seguir escribiendo.',
  enabled         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, recipient)
);

create table if not exists public.wa_gate_options (
  id          uuid primary key default gen_random_uuid(),
  gate_id     uuid not null references public.wa_gates(id) on delete cascade,
  position    int  not null default 0,
  label       text not null check (char_length(label) <= 20),  -- límite del botón de WhatsApp
  is_correct  boolean not null default false,
  action_url  text,                              -- a dónde va si NO es la correcta
  image_url   text,                              -- imagen que se muestra con la opción
  created_at  timestamptz not null default now()
);
create index if not exists wa_gate_options_gate_idx on public.wa_gate_options(gate_id, position);

-- Una sola correcta por gate.
create unique index if not exists wa_gate_one_correct
  on public.wa_gate_options(gate_id) where is_correct;

-- Estado por conversación.
--   pending    = se le mostraron las opciones y falta que elija
--   passed     = eligió la correcta: el chat sigue habilitado
--   redirected = eligió otra: se lo mandó a la URL
create table if not exists public.wa_gate_sessions (
  gate_id       uuid not null references public.wa_gates(id) on delete cascade,
  wa_id         text not null,
  state         text not null default 'pending' check (state in ('pending','passed','redirected')),
  chosen_option uuid references public.wa_gate_options(id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (gate_id, wa_id)
);

-- Idempotencia: Meta reintenta los webhooks.
create table if not exists public.wa_gate_events (
  message_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.wa_gates         enable row level security;
alter table public.wa_gate_options  enable row level security;
alter table public.wa_gate_sessions enable row level security;
alter table public.wa_gate_events   enable row level security;  -- sin policies: sólo service role

create policy "wa_gates: dueño" on public.wa_gates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "wa_gate_options: dueño del gate" on public.wa_gate_options
  for all
  using (exists (select 1 from public.wa_gates g where g.id = gate_id and g.user_id = auth.uid()))
  with check (exists (select 1 from public.wa_gates g where g.id = gate_id and g.user_id = auth.uid()));

create policy "wa_gate_sessions: dueño del gate" on public.wa_gate_sessions
  for select using (exists (select 1 from public.wa_gates g where g.id = gate_id and g.user_id = auth.uid()));

create trigger wa_gates_updated_at before update on public.wa_gates
  for each row execute function public.set_updated_at();

-- Bucket público para las imágenes de las opciones: WhatsApp descarga la imagen
-- desde una URL, así que tiene que ser accesible sin sesión.
insert into storage.buckets (id, name, public) values ('wa-gate', 'wa-gate', true)
  on conflict (id) do nothing;

create policy "wa-gate: usuario sube a su carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wa-gate' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "wa-gate: usuario borra de su carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wa-gate' and (storage.foldername(name))[1] = auth.uid()::text);

-- El dueño puede reiniciar las conversaciones (volver a mostrar las opciones).
create policy "wa_gate_sessions: dueño reinicia" on public.wa_gate_sessions
  for delete using (exists (select 1 from public.wa_gates g where g.id = gate_id and g.user_id = auth.uid()));
