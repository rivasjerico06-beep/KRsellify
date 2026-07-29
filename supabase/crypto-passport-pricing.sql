-- ============================================================
--  KRSELLIFY — Bitcoin Crypto Passport: bundle prices + pay links
--  Run in: Supabase Dashboard → SQL Editor → New Query
--  Safe to re-run.
--
--  Sets the three bundles the passport is sold in and points each one at its
--  own Wise payment link:
--
--     1 PCS   $399     https://wise.com/pay/r/jaY9mxFfJ-tmDG8
--     3 PCS   $599     https://wise.com/pay/r/sVo_Lrxp8VPiV1s
--    10 PCS   $1,299   https://wise.com/pay/r/hYqh6kKc0osxHe0
--
--  Each link collects a FIXED amount, so the bundle_total below and the amount
--  on the matching link have to stay identical — checkout only shows the Pay
--  button when the customer's total matches a link exactly, and falls back to
--  bank transfer when nothing matches.
-- ============================================================

-- 1. The three bundles
UPDATE products
SET quantity_options = '[
  {"label": "1PCS - Bitcoin Crypto Passport", "qty": 1, "bundle_total": 399},
  {"label": "3PCS - Bitcoin Crypto Passport (+$200.00)", "qty": 3, "bundle_total": 599},
  {"label": "10PCS - Bitcoin Crypto Passport (+$900.00)", "qty": 10, "bundle_total": 1299}
]'::jsonb,
    price = 399.00
WHERE name = 'Bitcoin Crypto Passport';

-- 2. One pay link per bundle, keyed to this product's id
--
--    hideAddToCart puts the storefront in one-product-at-a-time mode: Buy Now
--    only, no cart stacking, no cart icon — a cart holding two bundles would
--    total something no link collects.
--
--    hidePromos hides every coupon and VIP mention. This is not cosmetic: a
--    discount moves the total off the link's fixed amount, no link matches any
--    more, and the customer is dropped to bank transfer at the last step.
INSERT INTO site_config (key, value)
SELECT 'pay_link', jsonb_build_object(
  'enabled',       true,
  'hideAddToCart', true,
  'hidePromos',    true,
  'label',         'Pay',
  'note',          '',
  'links', jsonb_build_array(
    jsonb_build_object('url', 'https://wise.com/pay/r/jaY9mxFfJ-tmDG8', 'productId', p.id::text, 'amount', 399),
    jsonb_build_object('url', 'https://wise.com/pay/r/sVo_Lrxp8VPiV1s', 'productId', p.id::text, 'amount', 599),
    jsonb_build_object('url', 'https://wise.com/pay/r/hYqh6kKc0osxHe0', 'productId', p.id::text, 'amount', 1299)
  )
)
FROM products p
WHERE p.name = 'Bitcoin Crypto Passport'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Check what was written
SELECT name, price, quantity_options FROM products WHERE name = 'Bitcoin Crypto Passport';
SELECT value FROM site_config WHERE key = 'pay_link';
