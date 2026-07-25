-- 0001_orquesta_tables.sql
-- Tablas de core-orquesta. Prefijo orquesta_ para convivir en el mismo
-- proyecto Supabase que otras apps (ej. BEP).

-- ─── Motores enchufables ────────────────────────────────────────────────────
create table if not exists orquesta_motors (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  name         text not null,
  description  text,
  icon         text default 'globe',
  status       text default 'inactive' check (status in ('active', 'inactive', 'error')),
  version      text default '1.0.0',
  interval_min int  default 30,
  sources      text[] default '{}',
  detail_level text default 'Estándar',
  fallback     text,
  companies    text[] default '{}',
  last_run_at  timestamptz,
  logs         jsonb default '[]',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── Empresas monitoreadas ──────────────────────────────────────────────────
create table if not exists orquesta_companies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  industry    text,
  location    text,
  size        text,
  activity    text default 'low' check (activity in ('high', 'medium', 'low')),
  summary     text,
  verticals   jsonb default '[]',
  created_at  timestamptz default now()
);

-- ─── Señales detectadas ─────────────────────────────────────────────────────
create table if not exists orquesta_signals (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references orquesta_companies on delete cascade,
  motor_id    uuid references orquesta_motors on delete set null,
  user_id     uuid references auth.users not null,
  title       text not null,
  description text,
  source      text,
  priority    text default 'media' check (priority in ('alta', 'media', 'baja')),
  status      text default 'nueva' check (status in ('nueva', 'procesada', 'ignorada')),
  created_at  timestamptz default now()
);

-- ─── Eventos detectados ─────────────────────────────────────────────────────
create table if not exists orquesta_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references orquesta_companies on delete cascade,
  motor_id    uuid references orquesta_motors on delete set null,
  user_id     uuid references auth.users not null,
  type        text not null check (
    type in ('expansion', 'financiero', 'talento', 'producto', 'alianza', 'riesgo')
  ),
  description text not null,
  date        date,
  created_at  timestamptz default now()
);

-- ─── Documentos generados ───────────────────────────────────────────────────
create table if not exists orquesta_documents (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references orquesta_companies on delete cascade,
  user_id      uuid references auth.users not null,
  title        text not null,
  type         text default 'perfil' check (type in ('perfil', 'reporte', 'brief', 'alerta')),
  content      text,
  pages        int default 1,
  generated_at timestamptz default now()
);

-- ─── Índices ────────────────────────────────────────────────────────────────
create index if not exists idx_orquesta_motors_user       on orquesta_motors (user_id);
create index if not exists idx_orquesta_companies_user     on orquesta_companies (user_id);
create index if not exists idx_orquesta_signals_company    on orquesta_signals (company_id);
create index if not exists idx_orquesta_signals_user       on orquesta_signals (user_id);
create index if not exists idx_orquesta_events_company     on orquesta_events (company_id);
create index if not exists idx_orquesta_events_user        on orquesta_events (user_id);
create index if not exists idx_orquesta_documents_company  on orquesta_documents (company_id);
create index if not exists idx_orquesta_documents_user     on orquesta_documents (user_id);

-- ─── RLS: cada usuario ve/edita solo sus propios datos ─────────────────────
alter table orquesta_motors    enable row level security;
alter table orquesta_companies enable row level security;
alter table orquesta_signals   enable row level security;
alter table orquesta_events    enable row level security;
alter table orquesta_documents enable row level security;

create policy "own data select" on orquesta_motors
  for select using (auth.uid() = user_id);
create policy "own data insert" on orquesta_motors
  for insert with check (auth.uid() = user_id);
create policy "own data update" on orquesta_motors
  for update using (auth.uid() = user_id);
create policy "own data delete" on orquesta_motors
  for delete using (auth.uid() = user_id);

create policy "own data select" on orquesta_companies
  for select using (auth.uid() = user_id);
create policy "own data insert" on orquesta_companies
  for insert with check (auth.uid() = user_id);
create policy "own data update" on orquesta_companies
  for update using (auth.uid() = user_id);
create policy "own data delete" on orquesta_companies
  for delete using (auth.uid() = user_id);

create policy "own data select" on orquesta_signals
  for select using (auth.uid() = user_id);
create policy "own data insert" on orquesta_signals
  for insert with check (auth.uid() = user_id);
create policy "own data update" on orquesta_signals
  for update using (auth.uid() = user_id);
create policy "own data delete" on orquesta_signals
  for delete using (auth.uid() = user_id);

create policy "own data select" on orquesta_events
  for select using (auth.uid() = user_id);
create policy "own data insert" on orquesta_events
  for insert with check (auth.uid() = user_id);
create policy "own data update" on orquesta_events
  for update using (auth.uid() = user_id);
create policy "own data delete" on orquesta_events
  for delete using (auth.uid() = user_id);

create policy "own data select" on orquesta_documents
  for select using (auth.uid() = user_id);
create policy "own data insert" on orquesta_documents
  for insert with check (auth.uid() = user_id);
create policy "own data update" on orquesta_documents
  for update using (auth.uid() = user_id);
create policy "own data delete" on orquesta_documents
  for delete using (auth.uid() = user_id);

-- ─── updated_at automático en orquesta_motors ──────────────────────────────
create or replace function orquesta_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orquesta_motors_updated_at on orquesta_motors;
create trigger trg_orquesta_motors_updated_at
  before update on orquesta_motors
  for each row execute function orquesta_set_updated_at();

-- ─── Realtime (para useSignals / useEvents con subscripción) ───────────────
alter publication supabase_realtime add table orquesta_signals;
alter publication supabase_realtime add table orquesta_events;
alter publication supabase_realtime add table orquesta_motors;
