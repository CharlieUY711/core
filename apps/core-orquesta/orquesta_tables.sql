-- ─── PASO 2: Migrations de core-orquesta ─────────────────────────────────────
-- Ejecutar: supabase migration new orquesta_tables → pegar este contenido → supabase db push

-- Motores enchufables
create table orquesta_motors (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  name         text not null,
  description  text,
  icon         text default 'globe',
  status       text default 'inactive',  -- active | inactive | error
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

-- Empresas monitoreadas
create table orquesta_companies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  industry    text,
  location    text,
  size        text,
  activity    text default 'low',  -- high | medium | low
  summary     text,
  verticals   jsonb default '[]',
  created_at  timestamptz default now()
);

-- Señales detectadas
create table orquesta_signals (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references orquesta_companies,
  motor_id    uuid references orquesta_motors,
  user_id     uuid references auth.users not null,
  title       text not null,
  description text,
  source      text,
  priority    text default 'media',  -- alta | media | baja
  status      text default 'nueva',  -- nueva | procesada | ignorada
  created_at  timestamptz default now()
);

-- Eventos detectados
create table orquesta_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references orquesta_companies,
  motor_id    uuid references orquesta_motors,
  user_id     uuid references auth.users not null,
  type        text not null,  -- expansion | financiero | talento | producto | alianza | riesgo
  description text not null,
  date        date,
  created_at  timestamptz default now()
);

-- Documentos generados
create table orquesta_documents (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references orquesta_companies,
  user_id      uuid references auth.users not null,
  title        text not null,
  type         text default 'perfil',  -- perfil | reporte | brief | alerta
  content      text,
  pages        int default 1,
  generated_at timestamptz default now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table orquesta_motors    enable row level security;
alter table orquesta_companies enable row level security;
alter table orquesta_signals   enable row level security;
alter table orquesta_events    enable row level security;
alter table orquesta_documents enable row level security;

create policy "own data" on orquesta_motors    for all using (auth.uid() = user_id);
create policy "own data" on orquesta_companies for all using (auth.uid() = user_id);
create policy "own data" on orquesta_signals   for all using (auth.uid() = user_id);
create policy "own data" on orquesta_events    for all using (auth.uid() = user_id);
create policy "own data" on orquesta_documents for all using (auth.uid() = user_id);
