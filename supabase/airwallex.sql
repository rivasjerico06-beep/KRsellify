-- Airwallex card payments
-- -----------------------
-- Card orders are created with status = 'pending_payment' and
-- payment_method = 'airwallex', then flipped to 'paid' automatically once the
-- payment is verified against the Airwallex API (by the webhook, or by the
-- shopper returning to /order-success — whichever gets there first).
--
-- Reconciliation works without this column: the Airwallex PaymentIntent
-- carries our orders.id as its merchant_order_id, which is how the webhook
-- finds the row. The column exists so the intent can be traced from the admin
-- order list and matched against an Airwallex statement.

alter table public.orders add column if not exists airwallex_intent_id text;

comment on column public.orders.airwallex_intent_id is
  'Airwallex PaymentIntent id for card orders. Null for every other payment method.';

-- Looked up when reconciling a payout against orders.
create index if not exists orders_airwallex_intent_id_idx
  on public.orders (airwallex_intent_id)
  where airwallex_intent_id is not null;

comment on column public.orders.payment_method is
  'How the order was paid: airwallex (card), paypal, paymongo, stripe, or wire (manual bank transfer). Null for legacy orders.';
