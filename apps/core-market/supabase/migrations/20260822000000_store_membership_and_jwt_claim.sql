-- ============================================================================
-- F1 — Membresía de tienda y claim `store_id` en el JWT
-- ============================================================================
-- CONTEXTO
-- Las 9 tablas multitienda de `catalog_*` tienen políticas RLS con alcance ALL
-- construidas sobre:
--
--     tenant_id = ((auth.jwt() ->> 'store_id')::uuid)
--
-- Ese claim nunca se emitió. Con el claim en NULL la comparación da NULL, la
-- fila se descarta, y como el alcance es ALL no se bloquean sólo las lecturas
-- sino también los INSERT. Por eso las 11 tablas `catalog_*` estaban en cero:
-- no es que nadie las usó, es que la base lo impedía.
--
-- Esta migración crea lo mínimo para emitir ese claim:
--   1. `store_members` — qué usuario pertenece a qué tienda (N a N).
--   2. `stores.owner_id` + timestamps.
--   3. `custom_access_token_hook` — pone `store_id` en la raíz del JWT.
--   4. Los GRANT que el hook necesita (se omiten a menudo y el hook falla mudo).
--
-- NO toca roles ni permisos: `profiles.role` e `is_admin()` se resuelven aparte.
-- ============================================================================

begin;

-- ── 1. stores: dueño y timestamps ───────────────────────────────────────────
-- `stores` existía con (id, codigo, nombre, tipo) y sin vínculo a usuarios.
alter table public.stores
  add column if not exists owner_id   uuid references auth.users(id) on delete restrict,
  add column if not exists is_active  boolean     not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

comment on column public.stores.owner_id is
  'Dueño de la tienda. La membresía operativa vive en store_members.';

-- ── 2. store_members ────────────────────────────────────────────────────────
-- Un usuario puede pertenecer a varias tiendas. `is_default` resuelve cuál
-- usa el hook mientras no exista selector de tienda activa en la UI.
create table if not exists public.store_members (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id)   on delete cascade,
  user_id    uuid not null references auth.users(id)      on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create index if not exists idx_store_members_user  on public.store_members (user_id);
create index if not exists idx_store_members_store on public.store_members (store_id);

-- Una sola tienda por defecto por usuario.
create unique index if not exists idx_store_members_one_default
  on public.store_members (user_id) where is_default;

comment on table public.store_members is
  'Membresía usuario ↔ tienda. Sin columna de rol a propósito: el rol se '
  'resuelve en profiles.role, no acá.';

-- ── 3. RLS sobre las tablas de tenancy ──────────────────────────────────────
alter table public.stores        enable row level security;
alter table public.store_members enable row level security;

drop policy if exists stores_member_read on public.stores;
create policy stores_member_read on public.stores
  for select to authenticated
  using (
    id in (select sm.store_id from public.store_members sm where sm.user_id = auth.uid())
  );

drop policy if exists store_members_self_read on public.store_members;
create policy store_members_self_read on public.store_members
  for select to authenticated
  using (user_id = auth.uid());

-- Deliberadamente sin políticas de escritura: alta de tiendas y membresías es
-- una operación administrativa, no algo que el cliente haga por su cuenta.

-- ── 4. El hook ──────────────────────────────────────────────────────────────
-- Supabase invoca esta función al emitir cada access token. Devuelve el mismo
-- `event` con `store_id` agregado a los claims de raíz — que es exactamente
-- donde lo busca `auth.jwt() ->> 'store_id'` en las políticas de catalog_*.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id  uuid;
  v_store_id uuid;
  v_claims   jsonb;
begin
  v_user_id := (event ->> 'user_id')::uuid;

  -- Preferimos la tienda marcada por defecto; si no hay, la más antigua.
  select sm.store_id
    into v_store_id
    from public.store_members sm
    join public.stores s on s.id = sm.store_id
   where sm.user_id = v_user_id
     and s.is_active
   order by sm.is_default desc, sm.created_at asc
   limit 1;

  v_claims := event -> 'claims';

  if v_store_id is not null then
    v_claims := jsonb_set(v_claims, '{store_id}', to_jsonb(v_store_id::text));
  else
    -- Sin tienda, se emite explícitamente null en lugar de omitir el claim:
    -- así el token es legible y el caso "usuario sin tienda" se distingue de
    -- "el hook no corrió".
    v_claims := jsonb_set(v_claims, '{store_id}', 'null'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Custom access token hook: emite el claim store_id que consumen las '
  'políticas RLS de catalog_*. Requiere habilitarse en Auth > Hooks.';

-- ── 5. GRANTs — sin esto el hook falla y los logins pueden romperse ─────────
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.store_members to supabase_auth_admin;
grant select on public.stores        to supabase_auth_admin;

-- El hook lo invoca únicamente el emisor de tokens.
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- supabase_auth_admin debe poder leer las tablas aunque tengan RLS.
drop policy if exists store_members_auth_admin_read on public.store_members;
create policy store_members_auth_admin_read on public.store_members
  for select to supabase_auth_admin using (true);

drop policy if exists stores_auth_admin_read on public.stores;
create policy stores_auth_admin_read on public.stores
  for select to supabase_auth_admin using (true);

commit;
