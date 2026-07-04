-- ============================================================
-- ordenes: soporte persona/empresa (RUT) + dirección completa
-- ============================================================
-- CONTEXTO — verificado contra el código real de core-market:
--   La tabla `ordenes` existente (confirmada vía useAdminOrders.ts,
--   OrdenPage.tsx, mp_webhook, paypal-webhook) tiene, entre otras:
--     id, created_at, user_id, source, estado, payment_status,
--     total_uyu, total_usd, moneda, tipo_cambio,
--     mp_payment_id, mp_preference_id, paypal_order_id,
--     nombre_cliente, email_cliente, telefono_cliente, direccion_entrega,
--     items (JSONB)
--   NO tiene columnas separadas de ciudad/código postal/país, ni de
--   tipo de comprador/documento/razón social. Esta migración las agrega.
--
-- ⚠️ No pude ejecutar esto contra tu base real (no tengo acceso).
--    Revisala antes de correrla — en particular confirmá que
--    `ordenes` no tenga ya alguna de estas columnas con otro nombre.
-- ============================================================

ALTER TABLE ordenes
  ADD COLUMN IF NOT EXISTS tipo_comprador TEXT NOT NULL DEFAULT 'persona'
    CHECK (tipo_comprador IN ('persona', 'empresa')),
  ADD COLUMN IF NOT EXISTS documento       TEXT,        -- CI (persona, opcional) o RUT (empresa, obligatorio)
  ADD COLUMN IF NOT EXISTS razon_social    TEXT,        -- solo empresa
  ADD COLUMN IF NOT EXISTS ciudad_entrega  TEXT,
  ADD COLUMN IF NOT EXISTS codigo_postal   TEXT;

-- Empresa siempre necesita razón social + RUT válido (12 dígitos).
-- Persona no está obligada a nada de esto.
-- NOTA: Postgres no soporta "ADD CONSTRAINT IF NOT EXISTS" (a diferencia
-- de ADD COLUMN, que sí lo soporta) — se envuelve en un DO block para
-- que el script sea re-ejecutable sin fallar si ya existe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ordenes_empresa_requiere_datos'
  ) THEN
    ALTER TABLE ordenes
      ADD CONSTRAINT ordenes_empresa_requiere_datos
      CHECK (
        tipo_comprador = 'persona'
        OR (razon_social IS NOT NULL AND documento ~ '^[0-9]{12}$')
      );
  END IF;
END $$;

-- Índice para filtrar/reportar por tipo de comprador (ej. listado
-- diario de facturación separando personas de empresas con RUT).
CREATE INDEX IF NOT EXISTS idx_ordenes_tipo_comprador ON ordenes(tipo_comprador);

COMMENT ON COLUMN ordenes.tipo_comprador IS 'persona | empresa — define si se factura con CI o RUT';
COMMENT ON COLUMN ordenes.documento      IS 'CI (persona) o RUT (empresa) del comprador, sin puntos ni guiones';
COMMENT ON COLUMN ordenes.razon_social   IS 'Razón social para facturación — solo si tipo_comprador = empresa';
