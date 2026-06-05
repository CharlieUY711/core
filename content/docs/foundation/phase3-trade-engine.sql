-- ═══════════════════════════════════════════════════════════════════
-- CORE FOUNDATION — Phase 3: Trade Engine Schemas
-- Schemas only — no business logic
-- ═══════════════════════════════════════════════════════════════════

-- ── HS CODES (Harmonized System) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS hs_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL UNIQUE,
  description text        NOT NULL,
  section     text,
  chapter     text,
  status      text        NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── TRADE OPERATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_operations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type              text        NOT NULL
                                CHECK (type IN (
                                  'import','export','transfer',
                                  'free_zone_entry','free_zone_exit',
                                  'bonded_entry','bonded_exit',
                                  'customs_transit'
                                )),
  status            text        NOT NULL DEFAULT 'draft'
                                CHECK (status IN (
                                  'draft','pending','in_progress',
                                  'cleared','completed','rejected','cancelled'
                                )),
  entity_id         uuid        REFERENCES entities(id),
  origin_territory_id    uuid   REFERENCES territories(id),
  destination_territory_id uuid REFERENCES territories(id),
  reference_number  text,
  declared_value    numeric,
  currency          char(3)     DEFAULT 'USD',
  notes             text,
  metadata          jsonb       NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

-- ── TRADE OPERATION ITEMS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_operation_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_operation_id  uuid        NOT NULL REFERENCES trade_operations(id),
  articulo_id         uuid        REFERENCES articulos(id),
  hs_code_id          uuid        REFERENCES hs_codes(id),
  description         text        NOT NULL,
  quantity            numeric     NOT NULL,
  unit                text        NOT NULL DEFAULT 'unit',
  unit_value          numeric     NOT NULL,
  total_value         numeric     NOT NULL,
  currency            char(3)     DEFAULT 'USD',
  weight_kg           numeric,
  metadata            jsonb       NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── TRADE DOCUMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_documents (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_operation_id  uuid        NOT NULL REFERENCES trade_operations(id),
  document_type       text        NOT NULL
                                  CHECK (document_type IN (
                                    'commercial_invoice','packing_list',
                                    'bill_of_lading','airway_bill',
                                    'certificate_of_origin','customs_declaration',
                                    'dua','nfe','cfe','other'
                                  )),
  reference           text,
  issued_at           timestamptz,
  expires_at          timestamptz,
  file_url            text,
  status              text        NOT NULL DEFAULT 'pending',
  metadata            jsonb       NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── TRADE EVENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_operation_id  uuid        NOT NULL REFERENCES trade_operations(id),
  event_type          text        NOT NULL,
  description         text,
  actor_id            uuid,
  payload             jsonb       NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trade_ops_entity    ON trade_operations(entity_id);
CREATE INDEX IF NOT EXISTS idx_trade_ops_status    ON trade_operations(status);
CREATE INDEX IF NOT EXISTS idx_trade_ops_type      ON trade_operations(type);
CREATE INDEX IF NOT EXISTS idx_trade_items_op      ON trade_operation_items(trade_operation_id);
CREATE INDEX IF NOT EXISTS idx_trade_docs_op       ON trade_documents(trade_operation_id);
CREATE INDEX IF NOT EXISTS idx_trade_events_op     ON trade_events(trade_operation_id);

COMMENT ON TABLE trade_operations      IS 'CORE Trade Engine — operaciones de comercio exterior';
COMMENT ON TABLE trade_operation_items IS 'CORE Trade Engine — ítems por operación';
COMMENT ON TABLE trade_documents       IS 'CORE Trade Engine — documentos aduaneros y fiscales';
COMMENT ON TABLE trade_events          IS 'CORE Trade Engine — eventos de operaciones';
COMMENT ON TABLE hs_codes              IS 'CORE Trade Engine — códigos arancelarios HS';

-- ═══════════════════════════════════════════════════════════════════
-- END PHASE 3
-- ═══════════════════════════════════════════════════════════════════
