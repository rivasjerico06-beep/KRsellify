-- ============================================================
--  KRSELLIFY — RFS priority list badge
--  Run in: Supabase Dashboard → SQL Editor → New Query
--  Safe to re-run.
--
--  Adds a per-customer switch that shows a fourth card on their RFS
--  dashboard reading "You are now in priority list!", beside the cash-out,
--  activation and deduction cards. Toggled from admin → RFS Portal when
--  editing a profile.
--
--  Defaults to false, so no existing customer suddenly sees the badge — it
--  appears only where an admin has deliberately switched it on.
-- ============================================================

ALTER TABLE rfs_profiles
  ADD COLUMN IF NOT EXISTS priority_list BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
--  Required products: remember WHICH bundle, not just how many
-- ============================================================
--  Products are sold in bundles, and a bundle's price is not its unit price
--  times the count — three WLFI TOKEN is $499, not 3 × $299.
--
--  Storing only a quantity was also ambiguous: XRP Nesara/Gesara Gold Bar has
--  two different bundles that are both quantity 2 ("1X + 1X FREE" at $199 and
--  "2" at $398), so a stored 2 could not say which was meant. Labels are
--  unique within a product, so the chosen bundle is recorded by label.
--
--  Maps product id → bundle label. Profiles saved before this keep working:
--  with no label stored, the portal falls back to matching on quantity, and
--  then to unit price × quantity for products sold without bundles.

ALTER TABLE rfs_profiles
  ADD COLUMN IF NOT EXISTS required_product_bundles JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Verify
SELECT gmail, display_name, status, priority_list, required_product_bundles
FROM rfs_profiles
ORDER BY created_at DESC;
