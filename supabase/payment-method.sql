-- Bank wire transfer support
-- ---------------------------
-- Adds a payment_method column so wire-transfer orders can be told apart from
-- PayPal / PayMongo / Stripe orders. Wire orders are created with
-- status = 'pending_payment' and payment_method = 'wire', then an admin flips
-- them to 'paid' once the funds arrive (there is no webhook for bank wires).

alter table public.orders add column if not exists payment_method text;

comment on column public.orders.payment_method is
  'How the order was paid: paypal, paymongo, stripe, or wire (manual bank transfer). Null for legacy orders.';
