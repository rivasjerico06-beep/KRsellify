-- ============================================================
-- AGENT REFERRAL CODES
-- ============================================================
-- `agent_profiles.agent_code` is the short 4–6 digit id an agent puts in their
-- share links (?agent=12345) and is what gets written onto `orders.agent_code`.
-- The app has always read and written this column, but no migration ever
-- created it — /api/admin/agents/create carries a fallback that silently
-- inserts without it. This makes the column real so attribution is dependable.
--
-- Order attribution now resolves the code against this table and only credits
-- agents whose status is 'approved' (see lib/agent-attribution.ts), so the
-- column must exist for any referral link to earn.
--
-- Safe to re-run.

ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS agent_code TEXT;

-- One code per agent, and codes are looked up on every attributed checkout
CREATE UNIQUE INDEX IF NOT EXISTS agent_profiles_agent_code_key
  ON agent_profiles (agent_code)
  WHERE agent_code IS NOT NULL;

-- Backfill: give every agent still missing a code a unique 5-digit one
DO $$
DECLARE
  agent   RECORD;
  code    TEXT;
  tries   INT;
BEGIN
  FOR agent IN SELECT user_id FROM agent_profiles WHERE agent_code IS NULL LOOP
    tries := 0;
    LOOP
      code  := lpad((10000 + floor(random() * 90000))::int::text, 5, '0');
      tries := tries + 1;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM agent_profiles WHERE agent_code = code);
      IF tries >= 50 THEN
        RAISE EXCEPTION 'Could not find a free agent_code after 50 attempts';
      END IF;
    END LOOP;

    UPDATE agent_profiles SET agent_code = code WHERE user_id = agent.user_id;
  END LOOP;
END $$;

-- Verify
SELECT user_id, display_name, status, agent_code
FROM agent_profiles
ORDER BY created_at DESC;
