-- ============================================================================
-- F1 (fix) — `stores.id` no tenía default
-- ============================================================================
-- El seed 20260822000100 falló con:
--   ERROR 23502: null value in column "id" of relation "stores"
--
-- Causa: `stores.id` es uuid PRIMARY KEY pero sin DEFAULT. La única fila que
-- existía se había creado con un id generado del lado de la aplicación, así
-- que el hueco nunca se notó.
--
-- Se numera 000050 para quedar entre la migración estructural (000000) y el
-- seed (000100), que es donde corresponde: el seed depende de este default.
-- ============================================================================

begin;

alter table public.stores
  alter column id set default gen_random_uuid();

-- Mismo hueco en la tabla que creamos nosotros: ya tiene default, pero lo
-- verificamos explícitamente para que esta migración sea autocontenida.
alter table public.store_members
  alter column id set default gen_random_uuid();

commit;

-- ── Verificación ────────────────────────────────────────────────────────────
select table_name, column_name, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('stores', 'store_members')
   and column_name = 'id';
