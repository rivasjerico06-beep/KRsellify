-- ============================================================
--  KRSELLIFY — Realtime + Admin Policies
--  Run in Supabase SQL Editor
-- ============================================================

-- Allow admins to SELECT all orders (needed for Realtime to work in browser)
DROP POLICY IF EXISTS "Admins read all orders" ON orders;
CREATE POLICY "Admins read all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to SELECT all leads
DROP POLICY IF EXISTS "Admins read all leads" ON leads;
CREATE POLICY "Admins read all leads"
  ON leads FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to UPDATE all leads (assign to agents)
DROP POLICY IF EXISTS "Admins update all leads" ON leads;
CREATE POLICY "Admins update all leads"
  ON leads FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to INSERT leads
DROP POLICY IF EXISTS "Admins insert leads" ON leads;
CREATE POLICY "Admins insert leads"
  ON leads FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to DELETE leads
DROP POLICY IF EXISTS "Admins delete leads" ON leads;
CREATE POLICY "Admins delete leads"
  ON leads FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enable Realtime on orders table so admin gets live notifications
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
