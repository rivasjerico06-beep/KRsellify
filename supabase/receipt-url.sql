-- Bank-transfer receipt upload
-- ----------------------------
-- Stores the storage path of the payment receipt a customer uploads for a wire
-- order (bucket: "receipts", private). Admins view it via a short-lived signed
-- URL before confirming the order with "Mark as Paid". Idempotent.
alter table public.orders add column if not exists receipt_url text;

comment on column public.orders.receipt_url is
  'Storage path (bucket "receipts") of the bank-transfer receipt the customer uploaded. Null if none.';
