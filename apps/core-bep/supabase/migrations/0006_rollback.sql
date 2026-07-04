-- =============================================================================
-- ROLLBACK 0006 — security_hardening
-- Revierte: 0006_security_hardening.sql
-- Restaura estado: post-0005
-- =============================================================================
--
-- ADVERTENCIA
-- -----------
-- Este rollback elimina la fila del superadmin de public.profiles.
-- Consecuencias inmediatas:
--   · is_superadmin() devuelve false para todos los usuarios.
--   · Ningún usuario puede ejecutar DELETE físico en ninguna tabla.
--   · Las funciones soft_delete/restore_soft_delete bloquean operaciones
--     sobre tablas maestras (organizations, workspaces, manufacturers,
--     products) para todos los usuarios.
--
-- Ejecutar SOLO si se necesita revertir 0006 y se entienden las consecuencias.
-- NO aplicar a producción sin aprobación humana.
--
-- NOTA: Este rollback NO revierte P1 ni P3 porque ambos estaban corregidos
-- ANTES de que se aplicara 0006. Revertirlos sería reintroducir
-- vulnerabilidades de seguridad deliberadamente — fuera de alcance.
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ROLLBACK BLOQUE 2 — Remover seed superadmin
-- -----------------------------------------------------------------------------
-- Elimina la fila solo si fue insertada por esta migración (is_superadmin = true
-- y sin datos de perfil — columnas opcionales en NULL).
--
-- Si el superadmin completó su primer login y llenó datos de perfil
-- (full_name, role, etc.), esta condición protege contra borrado accidental:
-- en ese caso el DELETE no afecta filas y se debe coordinar manualmente.
-- -----------------------------------------------------------------------------

DELETE FROM public.profiles
WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848'
  AND is_superadmin = true
  AND full_name IS NULL
  AND role IS NULL
  AND entity IS NULL
  AND department IS NULL
  AND phone IS NULL
  AND avatar_url IS NULL;


-- =============================================================================
-- VERIFICACIÓN POST-ROLLBACK
-- =============================================================================
--
-- 1. Confirmar que la fila fue eliminada (o que tenía datos y fue preservada):
--
--    SELECT id, is_superadmin, full_name
--    FROM public.profiles
--    WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';
--    -- Esperado: 0 filas (si el perfil estaba vacío)
--    -- Si devuelve 1 fila: el superadmin había completado su perfil.
--    --   En ese caso, correr manualmente:
--    --   UPDATE public.profiles SET is_superadmin = false
--    --   WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';
--
-- 2. Confirmar que is_superadmin() vuelve a false:
--
--    SELECT is_superadmin();
--    -- Esperado: false (para cualquier usuario autenticado)
--
-- =============================================================================
