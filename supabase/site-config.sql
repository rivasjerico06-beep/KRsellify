-- ============================================================
--  KRSELLIFY — Site Config Table
--  Run AFTER update-schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS site_config (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read site config (public content)
CREATE POLICY "Public read site config"
  ON site_config FOR SELECT USING (true);

-- Trigger to keep updated_at fresh
CREATE TRIGGER site_config_updated_at
  BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
