CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── workflows ─────────────────────────────────────────────────────────────────
CREATE TABLE workflows (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  nodes       JSONB       NOT NULL DEFAULT '[]',
  edges       JSONB       NOT NULL DEFAULT '[]',
  enabled     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run    TIMESTAMPTZ,
  last_status TEXT        CHECK (last_status IN ('success', 'error', 'running'))
);

CREATE INDEX idx_workflows_user_id ON workflows (user_id);
CREATE INDEX idx_workflows_enabled  ON workflows (enabled) WHERE enabled = true;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- ── workflow_market_states ────────────────────────────────────────────────────
CREATE TABLE workflow_market_states (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          UUID        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_id              TEXT        NOT NULL,
  platform             TEXT        NOT NULL CHECK (platform IN ('kalshi', 'polymarket')),
  market_key           TEXT        NOT NULL,
  last_price           FLOAT,
  threshold_triggered  BOOLEAN     NOT NULL DEFAULT false,
  last_triggered_at    TIMESTAMPTZ,
  last_checked_at      TIMESTAMPTZ,
  UNIQUE (workflow_id, node_id)
);

CREATE INDEX idx_wms_workflow_id     ON workflow_market_states (workflow_id);
CREATE INDEX idx_wms_platform_market ON workflow_market_states (platform, market_key);
ALTER TABLE workflow_market_states ENABLE ROW LEVEL SECURITY;

-- ── workflow_runs ─────────────────────────────────────────────────────────────
CREATE TABLE workflow_runs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id  UUID        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  status       TEXT        NOT NULL CHECK (status IN ('success', 'error', 'running')),
  triggered_by TEXT        NOT NULL CHECK (triggered_by IN ('manual', 'worker', 'cron')),
  results      JSONB,
  error_msg    TEXT
);

CREATE INDEX idx_runs_workflow_id ON workflow_runs (workflow_id, started_at DESC);
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Supabase Realtime (worker subscribes to live workflow changes) ─────────────
ALTER PUBLICATION supabase_realtime ADD TABLE workflows;
