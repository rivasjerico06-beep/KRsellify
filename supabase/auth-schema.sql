-- ============================================================
--  KRSELLIFY — Auth Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. PROFILES (extends auth.users) ─────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name         TEXT,
  phone             TEXT,
  address           TEXT,
  city              TEXT,
  province          TEXT,
  postal_code       TEXT,
  role              TEXT        NOT NULL DEFAULT 'customer'
                                CHECK (role IN ('customer', 'admin', 'agent')),
  profile_photo_url TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (role is protected — only service_role can change it)
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── 2. AGENT APPLICATIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_profiles (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name  TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  notes         TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  max_leads     INTEGER     DEFAULT 10,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own agent profile"
  ON agent_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own agent application"
  ON agent_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 3. LEADS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name     TEXT        NOT NULL,
  customer_phone    TEXT        NOT NULL,
  product_interest  TEXT,
  agent_id          UUID        REFERENCES auth.users(id),
  status            TEXT        NOT NULL DEFAULT 'new'
                                CHECK (status IN ('new','assigned','attempted','interested','follow_up','converted','not_interested','do_not_contact')),
  notes             TEXT,
  follow_up_date    DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents read assigned leads"
  ON leads FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents update assigned leads"
  ON leads FOR UPDATE
  USING (auth.uid() = agent_id);

-- ── 4. updated_at TRIGGER ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 6. STORAGE BUCKET FOR AVATARS ───────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── 7. PROMOTE FIRST ADMIN (run manually after first signup) ─
-- Replace the UUID below with your own user ID from auth.users
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR-USER-UUID-HERE';
