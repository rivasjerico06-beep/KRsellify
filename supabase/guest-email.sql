-- Add guest_email to orders so admin can see who placed guest orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email TEXT;
