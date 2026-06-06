CREATE TABLE IF NOT EXISTS telegram_connections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  chat_id     TEXT        NOT NULL UNIQUE,
  chat_type   TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  username    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_connections_user_id ON telegram_connections (user_id);
ALTER TABLE telegram_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS telegram_connect_tokens (
  token_hash  TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_connect_tokens_expiry ON telegram_connect_tokens (expires_at);
ALTER TABLE telegram_connect_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_telegram_connections_updated_at'
  ) THEN
    CREATE TRIGGER trg_telegram_connections_updated_at
      BEFORE UPDATE ON telegram_connections
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
