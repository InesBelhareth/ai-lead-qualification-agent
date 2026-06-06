-- ============================================
-- AI Lead Qualification Agent — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  company         TEXT,
  message         TEXT,
  budget          TEXT,

  -- AI qualification results
  score           INTEGER CHECK (score >= 0 AND score <= 100),
  category        TEXT CHECK (category IN ('hot', 'warm', 'cold')),
  summary         TEXT,
  recommended_action TEXT,
  reasoning       TEXT,

  -- Timestamps
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  qualified_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast filtering by category and score
CREATE INDEX idx_leads_category ON leads(category);
CREATE INDEX idx_leads_score    ON leads(score DESC);
CREATE INDEX idx_leads_email    ON leads(email);

-- Enable Row Level Security (recommended for Supabase)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by n8n)
CREATE POLICY "Service role full access"
  ON leads
  FOR ALL
  USING (auth.role() = 'service_role');

-- View: hot leads only
CREATE OR REPLACE VIEW hot_leads AS
  SELECT id, name, email, company, score, summary, recommended_action, received_at
  FROM leads
  WHERE category = 'hot'
  ORDER BY score DESC;

-- View: lead statistics by category
CREATE OR REPLACE VIEW lead_stats AS
  SELECT
    category,
    COUNT(*) as total,
    AVG(score)::INT as avg_score
  FROM leads
  GROUP BY category;

