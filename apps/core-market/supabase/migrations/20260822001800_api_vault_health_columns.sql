-- ===========================================================================
-- DEC-011 — API Vault como Credential Provider: columnas de HEALTH
-- ===========================================================================
--
-- Contexto (ver .agent/DECISIONS.md, DEC-011):
-- El documento de diseño DEC-011-api-vault-credential-provider-design.md
-- daba por hecho que ya existía una migración
-- `20260822001700_api_vault_client_exposed.sql` (columna `client_exposed`).
-- Esa migración NO existe en este repositorio: no aparece en
-- supabase/migrations/, no aparece en supabase/schema/production_schema.sql
-- (fuente de verdad del DDL real, ver .agent/CURRENT.md "F-2 CERRADO"), y
-- `ApiVaultEntry` (apiVaultTypes.ts) no tiene ese campo. Se documenta la
-- contradicción y NO se crea `client_exposed` acá: no está justificada por
-- un caso de uso ya soportado por la arquitectura (regla 11/13 del brief),
-- y no hace falta para RESOLVE/DELIVER/REPORT/HEALTH.
--
-- Esta migración agrega ÚNICAMENTE lo que DEC-011 pide para HEALTH y que el
-- schema real (production_schema.sql, verificado) confirma que no existe
-- todavía: status / last_checked_at / last_error. Aditiva, idempotente, no
-- toca filas existentes, no borra columnas, no reemplaza la tabla.

ALTER TABLE public.api_vault
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

COMMENT ON COLUMN public.api_vault.status IS
  'Estado operativo reportado por REPORT (Credential Provider). Uno de: '
  'active | expired | invalid | revoked | requires_reauth | error | unknown. '
  'Default "unknown": credenciales existentes nunca fueron chequeadas.';
COMMENT ON COLUMN public.api_vault.last_checked_at IS
  'Timestamp del último REPORT recibido para esta credencial (HEALTH).';
COMMENT ON COLUMN public.api_vault.last_error IS
  'Último mensaje de error reportado por un consumidor via REPORT. '
  'NULL cuando status = active. No debe contener el secreto (`value`).';

-- Constraint de la taxonomía de estados prevista por DEC-011. No se crea una
-- taxonomía paralela.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_vault_status_check'
  ) THEN
    ALTER TABLE public.api_vault
      ADD CONSTRAINT api_vault_status_check
      CHECK (status IN (
        'active', 'expired', 'invalid', 'revoked',
        'requires_reauth', 'error', 'unknown'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS api_vault_status_idx ON public.api_vault (status);

-- Nota de seguridad: no se modifica RLS en esta migración. Las policies
-- existentes ("api_vault: usuario lee/inserta/actualiza/elimina los suyos",
-- todas basadas en auth.uid() = user_id) ya cubren status/last_checked_at/
-- last_error porque son columnas de la misma fila. RESOLVE y REPORT server-
-- side (Edge Functions) operan con la service_role key y no dependen de
-- estas policies — ver CredentialProvider.ts.
