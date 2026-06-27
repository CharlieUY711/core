-- ─────────────────────────────────────────────────────────────────────────────
-- BEP — Migration 0002: Storage bucket + AI search function
-- Run this AFTER 0001_initial_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage → New bucket, OR via this SQL:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bep-documents',
  'bep-documents',
  false,  -- private bucket
  524288000,  -- 500 MB per file
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/html',
    'message/rfc822'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only project members can read/write
CREATE POLICY "bep_documents_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'bep-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "bep_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'bep-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "bep_documents_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'bep-documents' AND
    auth.uid() IS NOT NULL
  );

-- ── Semantic search function ──────────────────────────────────────────────────
-- Finds documents similar to a given embedding vector

CREATE OR REPLACE FUNCTION search_documents_semantic(
  p_project_id UUID,
  p_embedding  VECTOR(1536),
  p_match_count INT DEFAULT 10,
  p_threshold   FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  type         document_type,
  discipline   TEXT,
  ai_summary   TEXT,
  similarity   FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    d.id,
    d.name,
    d.type,
    d.discipline,
    d.ai_summary,
    1 - (d.embedding <=> p_embedding) AS similarity
  FROM documents d
  WHERE
    d.project_id = p_project_id
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> p_embedding) > p_threshold
  ORDER BY d.embedding <=> p_embedding
  LIMIT p_match_count;
$$;

-- ── Full-text search function ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION search_documents_fulltext(
  p_project_id UUID,
  p_query      TEXT,
  p_match_count INT DEFAULT 20
)
RETURNS TABLE (
  id       UUID,
  name     TEXT,
  type     document_type,
  rank     FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    d.id,
    d.name,
    d.type,
    ts_rank(
      to_tsvector('spanish', COALESCE(d.name,'') || ' ' || COALESCE(d.extracted_text,'') || ' ' || COALESCE(d.ai_summary,'')),
      plainto_tsquery('spanish', p_query)
    ) AS rank
  FROM documents d
  WHERE
    d.project_id = p_project_id
    AND to_tsvector('spanish', COALESCE(d.name,'') || ' ' || COALESCE(d.extracted_text,'') || ' ' || COALESCE(d.ai_summary,''))
        @@ plainto_tsquery('spanish', p_query)
  ORDER BY rank DESC
  LIMIT p_match_count;
$$;

-- ── Entity graph traversal function ──────────────────────────────────────────
-- Get all entities linked to a given entity (1 hop)

CREATE OR REPLACE FUNCTION get_entity_links(
  p_source_type entity_type,
  p_source_id   UUID
)
RETURNS TABLE (
  target_type   entity_type,
  target_id     UUID,
  relation_type TEXT,
  metadata      JSONB
)
LANGUAGE sql STABLE AS $$
  SELECT target_type, target_id, relation_type, metadata
  FROM entity_links
  WHERE source_type = p_source_type AND source_id = p_source_id
  UNION ALL
  SELECT source_type, source_id, relation_type, metadata
  FROM entity_links
  WHERE target_type = p_source_type AND target_id = p_source_id;
$$;

-- ── Project dashboard stats view ──────────────────────────────────────────────

CREATE OR REPLACE VIEW project_dashboard_stats AS
SELECT
  p.id AS project_id,
  p.code,
  p.name,
  p.status,
  COUNT(DISTINCT d.id)  AS document_count,
  COUNT(DISTINCT CASE WHEN d.status = 'indexed' THEN d.id END) AS documents_indexed,
  COUNT(DISTINCT r.id)  AS requirement_count,
  COUNT(DISTINCT CASE WHEN r.status = 'compliant' THEN r.id END) AS requirements_compliant,
  COUNT(DISTINCT bl.id) AS bom_line_count,
  COUNT(DISTINCT CASE WHEN bl.status = 'approved' THEN bl.id END) AS bom_approved,
  COUNT(DISTINCT rf.id) AS rfq_count,
  COUNT(DISTINCT q.id)  AS quote_count,
  COUNT(DISTINCT ri.id) AS risk_count,
  COUNT(DISTINCT CASE WHEN ri.status = 'open' AND ri.impact IN ('high','critical') THEN ri.id END) AS high_risks_open,
  COUNT(DISTINCT c.id)  AS circular_count,
  COUNT(DISTINCT pq.id) FILTER (WHERE pq.status = 'open') AS open_queries
FROM projects p
LEFT JOIN documents d       ON d.project_id = p.id
LEFT JOIN requirements r    ON r.project_id = p.id
LEFT JOIN bom_lines bl      ON bl.project_id = p.id
LEFT JOIN rfqs rf            ON rf.project_id = p.id
LEFT JOIN quotes q           ON q.rfq_id = rf.id
LEFT JOIN risks ri           ON ri.project_id = p.id
LEFT JOIN circulars c        ON c.project_id = p.id
LEFT JOIN project_queries pq ON pq.project_id = p.id
GROUP BY p.id, p.code, p.name, p.status;
