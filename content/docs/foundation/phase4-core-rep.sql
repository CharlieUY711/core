-- ═══════════════════════════════════════════════════════════════════
-- CORE FOUNDATION — Phase 4: CORE Rep Schemas
-- Schemas only — no business logic
-- ═══════════════════════════════════════════════════════════════════

-- ── CHANNELS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channels (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  channel_type  text        NOT NULL
                            CHECK (channel_type IN (
                              'retail','horeca','gourmet',
                              'wholesale','ecommerce','pharmacy',
                              'specialty','export'
                            )),
  country_code  char(2)     REFERENCES countries(iso_code),
  status        text        NOT NULL DEFAULT 'active',
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── DISTRIBUTORS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS distributors (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid        REFERENCES entities(id),
  name          text        NOT NULL,
  country_code  char(2)     REFERENCES countries(iso_code),
  channel_id    uuid        REFERENCES channels(id),
  status        text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','inactive','prospect')),
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- ── BRAND DISTRIBUTORS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_distributors (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        uuid        NOT NULL REFERENCES brands(id),
  distributor_id  uuid        NOT NULL REFERENCES distributors(id),
  country_code    char(2)     REFERENCES countries(iso_code),
  channel_id      uuid        REFERENCES channels(id),
  status          text        NOT NULL DEFAULT 'active',
  contract_start  date,
  contract_end    date,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, distributor_id, country_code)
);

-- ── OPPORTUNITIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        uuid        REFERENCES brands(id),
  entity_id       uuid        REFERENCES entities(id),
  channel_id      uuid        REFERENCES channels(id),
  country_code    char(2)     REFERENCES countries(iso_code),
  title           text        NOT NULL,
  stage           text        NOT NULL DEFAULT 'prospect'
                              CHECK (stage IN (
                                'prospect','qualified','proposal',
                                'negotiation','closed_won','closed_lost'
                              )),
  estimated_value numeric,
  currency        char(3)     DEFAULT 'USD',
  owner_id        uuid,
  notes           text,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz
);

-- ── ACTIVITIES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid        REFERENCES opportunities(id),
  entity_id       uuid        REFERENCES entities(id),
  activity_type   text        NOT NULL
                              CHECK (activity_type IN (
                                'call','email','meeting','visit',
                                'proposal','demo','follow_up','note'
                              )),
  title           text        NOT NULL,
  description     text,
  scheduled_at    timestamptz,
  completed_at    timestamptz,
  owner_id        uuid,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── MEETINGS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid        REFERENCES opportunities(id),
  activity_id     uuid        REFERENCES activities(id),
  title           text        NOT NULL,
  scheduled_at    timestamptz NOT NULL,
  duration_min    integer     DEFAULT 60,
  location        text,
  meeting_type    text        NOT NULL DEFAULT 'virtual'
                              CHECK (meeting_type IN ('virtual','in_person','phone')),
  attendees       jsonb       NOT NULL DEFAULT '[]',
  notes           text,
  outcome         text,
  status          text        NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distributors_entity   ON distributors(entity_id);
CREATE INDEX IF NOT EXISTS idx_distributors_country  ON distributors(country_code);
CREATE INDEX IF NOT EXISTS idx_brand_dist_brand      ON brand_distributors(brand_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_brand   ON opportunities(brand_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage   ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_activities_opp        ON activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_meetings_opp          ON meetings(opportunity_id);

COMMENT ON TABLE channels          IS 'CORE Rep — canales de distribución';
COMMENT ON TABLE distributors      IS 'CORE Rep — distribuidores por país y canal';
COMMENT ON TABLE brand_distributors IS 'CORE Rep — relación marca-distribuidor';
COMMENT ON TABLE opportunities     IS 'CORE Rep — oportunidades comerciales';
COMMENT ON TABLE activities        IS 'CORE Rep — actividades de desarrollo comercial';
COMMENT ON TABLE meetings          IS 'CORE Rep — reuniones y visitas';

-- ═══════════════════════════════════════════════════════════════════
-- END PHASE 4
-- ═══════════════════════════════════════════════════════════════════
