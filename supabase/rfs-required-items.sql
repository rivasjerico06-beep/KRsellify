-- ============================================================
--  KRSELLIFY — RFS required products as an ordered list of slots
--  Run in: Supabase Dashboard → SQL Editor → New Query
--  Safe to re-run.
--
--  Required products were stored as a set of product ids
--  (required_product_ids), so a product could only ever appear once. That
--  made it impossible to require the same product twice — once to activate
--  the account and again to reach the priority list.
--
--  required_items replaces it with an ordered array, one entry per
--  requirement:
--
--    [
--      { "product_id": "…", "bundle_label": "3PCS WLFI TOKEN (+$200.00)",
--        "qty": 3, "purpose": "Account activation", "completed": false },
--      { "product_id": "…", "bundle_label": "1PCS - WLFI TOKEN",
--        "qty": 1, "purpose": "Priority listing",   "completed": true  }
--    ]
--
--  Duplicates are fine because position, not product id, identifies a
--  requirement — which also fixes completion tracking, since marking a
--  product done by id was ambiguous once it appeared twice.
--
--  The old columns are left in place. Profiles saved before this keep
--  working: the portal falls back to them whenever required_items is empty.
-- ============================================================

ALTER TABLE rfs_profiles
  ADD COLUMN IF NOT EXISTS required_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing profiles into the new shape, so nothing has to be
-- re-entered by hand. Order follows the old array; the first requirement is
-- labelled for activation and the second for priority listing, matching how
-- they are presented to the customer.
UPDATE rfs_profiles p
SET required_items = COALESCE((
  SELECT jsonb_agg(
           jsonb_build_object(
             'product_id',   pid,
             'bundle_label', COALESCE(p.required_product_bundles ->> pid, ''),
             'qty',          COALESCE((p.required_product_quantities ->> pid)::int, 1),
             'purpose',      CASE ord WHEN 0 THEN 'Account activation'
                                      WHEN 1 THEN 'Priority listing'
                                      ELSE '' END,
             'completed',    p.completed_product_ids ? pid
           )
           ORDER BY ord
         )
  FROM jsonb_array_elements_text(p.required_product_ids) WITH ORDINALITY AS t(pid, n),
       LATERAL (SELECT n - 1) AS o(ord)
), '[]'::jsonb)
WHERE jsonb_array_length(p.required_items) = 0
  AND jsonb_array_length(p.required_product_ids) > 0;

-- Verify
SELECT gmail, display_name, priority_list,
       jsonb_array_length(required_items) AS requirements,
       required_items
FROM rfs_profiles
ORDER BY created_at DESC;
