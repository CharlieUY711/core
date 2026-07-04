-- =============================================================================
-- MIGRACIÓN 0006 — security_hardening
-- Repo: CORE / apps/core-bep
-- Fecha autoría: 2026-06-27
-- Autor: revisión de seguridad post-0005
-- Continuación de: 0005_bom_crud (aplicada y verificada 2026-06-27)
-- =============================================================================
--
-- CONTEXTO
-- --------
-- Esta migración fue diseñada para corregir tres problemas de seguridad
-- identificados en la revisión post-0005. La Fase 0 de descubrimiento
-- (2026-06-27) determinó que dos de los tres problemas ya habían sido
-- corregidos previamente en la base:
--
--   P1 — profiles_update sin WITH CHECK       → YA CORREGIDO en base
--        La policy tiene WITH CHECK con COALESCE correcto.
--        No se re-emite para no introducir riesgo en algo que funciona.
--
--   P2 — Superadmin sin seed (profiles vacío) → PENDIENTE ← este archivo
--        Único cambio de estado que aplica esta migración.
--
--   P3 — soft_delete/restore sin auth por fila → YA CORREGIDO en base
--        Ambas funciones ya implementan el CASE + has_project_permission.
--        No se re-emiten.
--
-- ALCANCE DE ESTE ARCHIVO
-- -----------------------
-- Bloque único: seed del superadmin conocido en public.profiles.
--
-- GUARDRAILS
-- ----------
-- · Idempotente: ON CONFLICT DO UPDATE — seguro re-ejecutar.
-- · No destructivo: no toca filas existentes salvo el propio superadmin.
-- · No rompe RLS: la fila en profiles activa is_superadmin() = true
--   para ese user, desbloqueando las policies DELETE que lo requieren.
-- · NO aplicar a producción sin aprobación humana.
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BLOQUE 2 — Seed superadmin
-- (Bloque 1 y 3 no aplican — ver CONTEXTO arriba)
-- -----------------------------------------------------------------------------
-- Precondición: el UUID debe existir en auth.users (primer login pendiente
-- o creado vía Supabase Dashboard). Esta inserción es segura antes del
-- primer login: cuando el usuario autentique, la fila ya existe con
-- is_superadmin = true.
--
-- ON CONFLICT (id) DO UPDATE: si por alguna razón la fila ya existía
-- (ej. login previo que la creó con is_superadmin = false), la corrige.
-- -----------------------------------------------------------------------------

INSERT INTO public.profiles (id, is_superadmin)
VALUES ('5e12ace0-05c6-4208-b7c8-8250b7063848', true)
ON CONFLICT (id) DO UPDATE
  SET is_superadmin = true;


-- =============================================================================
-- VERIFICACIÓN POST-APLICACIÓN (correr manualmente, no parte del script)
-- =============================================================================
--
-- 1. Confirmar fila y flag:
--
--    SELECT id, is_superadmin
--    FROM public.profiles
--    WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';
--    -- Esperado: 1 fila, is_superadmin = true
--
-- 2. Confirmar is_superadmin() (autenticado como el superadmin):
--
--    SELECT is_superadmin();
--    -- Esperado: true
--
-- 3. Confirmar que P1 sigue en pie (control):
--
--    SELECT policyname, cmd, with_check
--    FROM pg_policies
--    WHERE schemaname = 'public'
--      AND tablename = 'profiles'
--      AND cmd = 'UPDATE';
--    -- Esperado: with_check IS NOT NULL
--
-- =============================================================================
