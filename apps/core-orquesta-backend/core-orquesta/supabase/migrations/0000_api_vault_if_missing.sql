-- 0000_api_vault_if_missing.sql
--
-- Si este proyecto de Supabase ya tiene `api_vault` (por ej. porque es el
-- mismo proyecto que usa BEP), esta migración es un no-op gracias al
-- `if not exists`. Si corre standalone, crea la tabla mínima que espera
-- la Edge Function orquesta-generate (supabase/functions/orquesta-generate).

create table if not exists api_vault (
  id         uuid primary key default gen_random_uuid(),
  platform   text not null unique, -- 'Anthropic' | 'OpenAI' | ...
  api_key    text not null,
  app_id     text,                 -- opcional: filtrar keys por app (ej. 'core-orquesta')
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table api_vault enable row level security;

-- Nadie accede desde el cliente: solo la Edge Function con SERVICE_ROLE_KEY
-- (que bypassa RLS). No creamos policies de select/insert para authenticated.
