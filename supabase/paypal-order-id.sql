-- Add paypal_order_id to orders table
-- Run in: Supabase Dashboard → SQL Editor → New Query
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;
