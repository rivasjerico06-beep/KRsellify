-- ============================================================
--  BACKFILL — three historical orders for Sue McPherson
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
--
--  Adds three orders placed off-platform (their 9-digit order numbers come
--  from another system; this app mints 5-digit ones) so they appear in
--  admin → Orders.
--
--  Adds only these three rows:
--    * each insert is guarded by NOT EXISTS on its order_number, so running
--      this twice inserts nothing the second time
--    * no UPDATE and no DELETE anywhere — existing orders are not read,
--      moved or renumbered
--    * the one schema change is an additive ADD COLUMN IF NOT EXISTS
--
--  Every amount is exactly 90% of a catalog bundle price, so each order is
--  recorded as that bundle with a 10% discount rather than as an off-catalog
--  lump sum. The order drawer renders subtotal as total + discount_amount,
--  so this makes the subtotal land on the bundle's real price:
--
--    635838873   $1,299.00 − 10%  = $1,169.10   D.O.G.E, 25-piece bundle
--    636137509     $599.00 − 10%  =   $539.10   D.O.G.E, 10-piece bundle
--    637736474   $1,399.00 − 10%  = $1,259.10   WLFI, 35PCS bundle
--
--  The coupon code itself is left null — it wasn't recorded in the source.
-- ============================================================

-- The app writes shipping_address on every checkout but no migration ever
-- created the column (the API carries a 42703 fallback that inserts without
-- it). These were placed as a guest, so there is no profile to read the
-- customer's name, phone and address from — shipping_address is what makes
-- them show in the order drawer.
alter table public.orders add column if not exists shipping_address jsonb;

with ship as (
  select jsonb_build_object(
    'firstName',  'Sue',
    'lastName',   'McPherson',
    'address',    '258 Bluegrass Dr',
    'city',       'Hendersonville',
    'region',     'TN',
    'postalCode', '37075',
    'country',    'US',
    'phone',      '6157082111'
  ) as addr
),

-- alt_name covers the pre-`products-with-options.sql` product name, so the
-- lookup still resolves if this database was never migrated to the short one.
incoming (
  order_number, product_name, alt_name, bundle_label,
  bundle_total, total, discount_amount, placed_at
) as (
  values
    -- Quantity 25 → the "25 (+$1100.00)" D.O.G.E bundle at $1,299.
    (635838873, 'D.O.G.E COIN', 'D.O.G.E COIN Collectible', '25 (+$1100.00)',
     1299.00::numeric, 1169.10::numeric, 129.90::numeric,
     timestamptz '2026-05-20 08:17:43+08'),

    -- The source note reads "Quantity: 5", but $539.10 is exactly 90% of
    -- $599 — the 10-piece bundle. The 5-piece bundle is $399, which would
    -- have been $359.10. Recorded against the amount, because that is the
    -- figure that has to reconcile with the payment, it matches a real
    -- catalog price to the cent, and it carries the same 10% discount as the
    -- other two orders. The quantity field in these notes is the unreliable
    -- one: order 637736474 below arrived with five variant labels pasted
    -- into it.
    (636137509, 'D.O.G.E COIN', 'D.O.G.E COIN Collectible', '10 (+$400.00)',
     599.00, 539.10, 59.90,
     timestamptz '2026-05-21 10:29:21+08'),

    -- The note pastes several WLFI variant labels in a row; $1,259.10 is
    -- exactly 90% of $1,399, the single "35PCS - WLFI TOKEN" bundle.
    (637736474, 'TRUMP WLFI TOKEN', 'TRUMP WLFI TOKEN', '35PCS - WLFI TOKEN',
     1399.00, 1259.10, 139.90,
     timestamptz '2026-05-29 21:16:37+08')
)

insert into public.orders (
  order_number, user_id, guest_email, items, total,
  discount_amount, coupon_code, status, shipping_address, created_at
)
select
  i.order_number,
  null,                          -- guest order: no auth user to attach
  'suemcpilot@yahoo.com',
  jsonb_build_array(
    jsonb_build_object(
      'id',           p.id,
      'name',         p.name,
      'price',        i.bundle_total,   -- a bundle is one line at its total…
      'qty',          1,                -- …so qty is 1, as the checkout writes it
      'img',          p.img,
      'category',     p.category,
      'bundle_label', i.bundle_label
    )
  ),
  i.total,
  i.discount_amount,
  null,                          -- coupon code not recorded in the source
  'paid',                        -- settled orders; change per-order in the drawer
  s.addr,
  i.placed_at
from incoming i
cross join ship s
-- Resolve the product by name rather than hardcoding a UUID, since ids are
-- generated per database.
join lateral (
  select id, name, img, category
  from public.products
  where name in (i.product_name, i.alt_name)
  order by (name = i.product_name) desc
  limit 1
) p on true
where not exists (
  select 1 from public.orders o where o.order_number = i.order_number
);

-- Verify: expect all three rows. Fewer means a product name did not resolve
-- (check the products table) or that order number was already present.
select order_number,
       created_at,
       status,
       total,
       discount_amount,
       guest_email,
       items -> 0 ->> 'name'         as product,
       items -> 0 ->> 'bundle_label' as bundle
from public.orders
where order_number in (635838873, 636137509, 637736474)
order by created_at;
