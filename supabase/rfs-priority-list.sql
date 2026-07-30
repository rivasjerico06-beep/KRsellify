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

-- Verify
SELECT gmail, display_name, status, priority_list
FROM rfs_profiles
ORDER BY created_at DESC;
