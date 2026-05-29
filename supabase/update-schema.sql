-- ============================================================
--  KRSELLIFY — Schema Update
--  Run AFTER schema.sql and auth-schema.sql
--  Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS)
-- ============================================================

-- ── 1. Update ORDERS table ───────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_id         UUID          REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS referral_code   TEXT,
  ADD COLUMN IF NOT EXISTS coupon_code     TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Let authenticated users read their own orders
DROP POLICY IF EXISTS "Users read own orders" ON orders;
CREATE POLICY "Users read own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- ── 2. Update AGENT_PROFILES table ──────────────────────────
ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- ── 3. COUPONS table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  code         TEXT          UNIQUE NOT NULL,
  discount_pct INTEGER       NOT NULL CHECK (discount_pct BETWEEN 1 AND 100),
  min_spend    DECIMAL(10,2) DEFAULT 0,
  user_id      UUID          REFERENCES auth.users(id),
  tier         TEXT,
  is_used      BOOLEAN       DEFAULT FALSE,
  used_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own coupons"   ON coupons;
DROP POLICY IF EXISTS "Users update own coupons" ON coupons;

CREATE POLICY "Users read own coupons"
  ON coupons FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own coupons"
  ON coupons FOR UPDATE USING (auth.uid() = user_id);
