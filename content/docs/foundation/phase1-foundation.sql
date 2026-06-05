-- ═══════════════════════════════════════════════════════════════════
-- CORE FOUNDATION — Phase 1 Migration
-- Safe, additive, backward compatible
-- Supabase / PostgreSQL
-- Versión 1.0 — Junio 2026
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. COUNTRIES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code    char(2)     NOT NULL UNIQUE,
  name        text        NOT NULL,
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','inactive')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO countries (iso_code, name) VALUES
  ('UY', 'Uruguay'),
  ('AR', 'Argentina'),
  ('PY', 'Paraguay'),
  ('BR', 'Brasil'),
  ('CL', 'Chile')
ON CONFLICT (iso_code) DO NOTHING;

-- ── 2. TERRITORIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS territories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id      uuid        NOT NULL REFERENCES countries(id),
  territory_type  text        NOT NULL
                              CHECK (territory_type IN (
                                'national','free_zone','bonded',
                                'free_port','special_regime'
                              )),
  name            text        NOT NULL,
  code            text,
  status          text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','inactive')),
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed inicial
INSERT INTO territories (country_id, territory_type, name, code)
SELECT id, 'national',  'Uruguay — Territorio Nacional',  'UY-NAT'  FROM countries WHERE iso_code = 'UY'
UNION ALL
SELECT id, 'free_zone', 'Zonamerica',                     'UY-FZ-ZA' FROM countries WHERE iso_code = 'UY'
UNION ALL
SELECT id, 'free_zone', 'Aguada Park',                    'UY-FZ-AP' FROM countries WHERE iso_code = 'UY'
UNION ALL
SELECT id, 'national',  'Argentina — Territorio Nacional','AR-NAT'  FROM countries WHERE iso_code = 'AR'
UNION ALL
SELECT id, 'national',  'Paraguay — Territorio Nacional', 'PY-NAT'  FROM countries WHERE iso_code = 'PY'
UNION ALL
SELECT id, 'free_zone', 'Ciudad del Este',                'PY-FZ-CE' FROM countries WHERE iso_code = 'PY'
UNION ALL
SELECT id, 'national',  'Brasil — Territorio Nacional',   'BR-NAT'  FROM countries WHERE iso_code = 'BR'
UNION ALL
SELECT id, 'national',  'Chile — Territorio Nacional',    'CL-NAT'  FROM countries WHERE iso_code = 'CL'
ON CONFLICT DO NOTHING;

-- ── 3. ENTITIES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entities (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        UNIQUE,
  name          text        NOT NULL,
  legal_name    text,
  tax_id        text,
  country_code  char(2)     REFERENCES countries(iso_code),
  entity_type   text        NOT NULL
                            CHECK (entity_type IN (
                              'core','brand_owner','manufacturer',
                              'importer','exporter','distributor',
                              'retailer','logistics_operator',
                              'customer','supplier'
                            )),
  status        text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','inactive','suspended')),
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- Seed: CORE como entidad raíz
INSERT INTO entities (code, name, legal_name, country_code, entity_type)
VALUES ('CORE', 'CORE', 'CORE S.A.', 'UY', 'core')
ON CONFLICT (code) DO NOTHING;

-- ── 4. BRANDS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       uuid        REFERENCES entities(id),
  name            text        NOT NULL,
  country_origin  char(2)     REFERENCES countries(iso_code),
  status          text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','inactive')),
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- ── 5. CORE SERVICES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core_services (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  description text,
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','beta','planned','inactive')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO core_services (code, name, status) VALUES
  ('MARKET',       'CORE Market',       'active'),
  ('LOGISTICS',    'CORE Logistics',    'planned'),
  ('REP',          'CORE Rep',          'planned'),
  ('FINANCE',      'CORE Finance',      'planned'),
  ('INTELLIGENCE', 'CORE Intelligence', 'planned')
ON CONFLICT (code) DO NOTHING;

-- ── 6. ENTITY SERVICES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entity_services (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   uuid        NOT NULL REFERENCES entities(id),
  service_id  uuid        NOT NULL REFERENCES core_services(id),
  status      text        NOT NULL DEFAULT 'enabled'
                          CHECK (status IN ('enabled','disabled','suspended')),
  config      jsonb       NOT NULL DEFAULT '{}',
  enabled_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, service_id)
);

-- ── 7. INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entities_country    ON entities(country_code);
CREATE INDEX IF NOT EXISTS idx_entities_type       ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_status     ON entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_deleted    ON entities(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_brands_entity       ON brands(entity_id);
CREATE INDEX IF NOT EXISTS idx_territories_country ON territories(country_id);
CREATE INDEX IF NOT EXISTS idx_entity_services_entity ON entity_services(entity_id);

-- ── 8. UPDATED_AT TRIGGERS ───────────────────────────────────────
CREATE OR REPLACE FUNCTION core_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['entities','brands','territories','entity_services'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'set_updated_at_' || t
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at_%I
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION core_set_updated_at()',
        t, t
      );
    END IF;
  END LOOP;
END;
$$;

-- ── 9. RLS ───────────────────────────────────────────────────────
ALTER TABLE countries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands          ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_services   ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_services ENABLE ROW LEVEL SECURITY;

-- Lectura pública para tablas de referencia
CREATE POLICY IF NOT EXISTS "countries_read_all"
  ON countries FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "territories_read_all"
  ON territories FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "core_services_read_all"
  ON core_services FOR SELECT USING (true);

-- Entidades: lectura pública de activas
CREATE POLICY IF NOT EXISTS "entities_read_active"
  ON entities FOR SELECT USING (deleted_at IS NULL AND status = 'active');

-- Brands: lectura pública de activas
CREATE POLICY IF NOT EXISTS "brands_read_active"
  ON brands FOR SELECT USING (deleted_at IS NULL AND status = 'active');

-- ── 10. COMMENTS ─────────────────────────────────────────────────
COMMENT ON TABLE countries       IS 'CORE Foundation — países activos del ecosistema';
COMMENT ON TABLE territories     IS 'CORE Foundation — territorios fiscales y aduaneros';
COMMENT ON TABLE entities        IS 'CORE Foundation — empresas y organizaciones del ecosistema';
COMMENT ON TABLE brands          IS 'CORE Foundation — marcas representadas por CORE Rep';
COMMENT ON TABLE core_services   IS 'CORE Foundation — verticales del ecosistema CORE';
COMMENT ON TABLE entity_services IS 'CORE Foundation — servicios habilitados por entidad';

-- ═══════════════════════════════════════════════════════════════════
-- END PHASE 1
-- ═══════════════════════════════════════════════════════════════════
