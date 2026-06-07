-- =====================================================
-- API Vault — Módulo de gestión de tokens e integraciones
-- Ejecutar en: Supabase → SQL Editor
-- =====================================================

create table if not exists public.api_vault (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  platform    text not null,
  type        text not null default 'api_key',   -- api_key | token | oauth | secret | webhook | connection
  value       text not null,                      -- valor cifrado (AES via pgcrypto o almacenado en cliente)
  env         text not null default 'production', -- production | staging | development | testing
  tags        text[] default '{}',
  notes       text,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Índices
create index if not exists api_vault_user_id_idx on public.api_vault(user_id);
create index if not exists api_vault_platform_idx on public.api_vault(platform);

-- RLS: cada usuario solo ve sus propios registros
alter table public.api_vault enable row level security;

create policy "api_vault: usuario lee los suyos"
  on public.api_vault for select
  using (auth.uid() = user_id);

create policy "api_vault: usuario inserta los suyos"
  on public.api_vault for insert
  with check (auth.uid() = user_id);

create policy "api_vault: usuario actualiza los suyos"
  on public.api_vault for update
  using (auth.uid() = user_id);

create policy "api_vault: usuario elimina los suyos"
  on public.api_vault for delete
  using (auth.uid() = user_id);

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger api_vault_updated_at
  before update on public.api_vault
  for each row execute function public.set_updated_at();
