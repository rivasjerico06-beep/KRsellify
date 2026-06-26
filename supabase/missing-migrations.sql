-- ============================================================
--  KRSELLIFY — Missing Migrations
--  Run in: Supabase Dashboard → SQL Editor → New Query
--  Safe to re-run (uses IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

-- ── 1. orders: add order_number ──────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;

-- Backfill existing orders with a random 5-digit number
UPDATE orders
  SET order_number = floor(random() * 90000 + 10000)::int
  WHERE order_number IS NULL;

-- ── 2. leads: add missing columns ────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS claimed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disposition         TEXT,
  ADD COLUMN IF NOT EXISTS call_count          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_called_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lineitem_price      DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS billing_address     TEXT,
  ADD COLUMN IF NOT EXISTS billing_city        TEXT,
  ADD COLUMN IF NOT EXISTS billing_zip         TEXT,
  ADD COLUMN IF NOT EXISTS billing_province    TEXT,
  ADD COLUMN IF NOT EXISTS billing_country     TEXT,
  ADD COLUMN IF NOT EXISTS tagging             TEXT,
  ADD COLUMN IF NOT EXISTS assigned_agent_name TEXT;

-- ── 3. vip_subscriptions: create table ───────────────────────
CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email                  TEXT        NOT NULL,
  status                 TEXT        NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active', 'cancelled', 'past_due')),
  paypal_subscription_id TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vip_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── 4. call_logs: create table ───────────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID        REFERENCES leads(id) ON DELETE CASCADE,
  agent_name  TEXT,
  disposition TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- ── 5. rfs_profiles: add missing columns ─────────────────────
--  (Only runs if rfs_profiles exists; safe to run even if columns are already there)
ALTER TABLE rfs_profiles
  ADD COLUMN IF NOT EXISTS portal_texts                JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_product_quantities JSONB NOT NULL DEFAULT '{}';

-- ── 6. coupons: fix unique constraint ────────────────────────
--  Old constraint: UNIQUE(code) globally — breaks when two logged-in users
--  both buy a gift card and get THEMAGA10 issued to their account.
--  New constraints:
--    • user-specific coupons  → UNIQUE(code, user_id)
--    • global coupons         → UNIQUE(code) WHERE user_id IS NULL
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS coupons_user_code_unique
  ON coupons(code, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coupons_global_code_unique
  ON coupons(code)
  WHERE user_id IS NULL;

-- ── 7. Reset any auto-disabled global promo coupons ──────────
UPDATE coupons
  SET is_used = false, used_at = NULL
  WHERE user_id IS NULL AND is_used = true;
