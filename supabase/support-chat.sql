-- ============================================================
--  KRSELLIFY — Customer support chat
--  Run in: Supabase Dashboard → SQL Editor → New Query
--  Safe to re-run.
--
--  A customer opens the support widget, enters their email, and gets the same
--  conversation back every time — that email IS the thread key, which is how
--  someone returning days later still sees their history. Admins reply from
--  the Support tab in the admin dashboard.
-- ============================================================

-- One conversation per email address, forever.
CREATE TABLE IF NOT EXISTS support_conversations (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT        NOT NULL,
  -- Set when the customer happened to be signed in; purely informational,
  -- the email is still what identifies the thread.
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'closed')),
  -- Counters drive the unread badges on each side
  admin_unread    INTEGER     NOT NULL DEFAULT 0,
  customer_unread INTEGER     NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Case-insensitive: Bob@Gmail.com and bob@gmail.com are the same person
CREATE UNIQUE INDEX IF NOT EXISTS support_conversations_email_key
  ON support_conversations (lower(email));

CREATE INDEX IF NOT EXISTS support_conversations_recent_idx
  ON support_conversations (last_message_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID        NOT NULL
                              REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender          TEXT        NOT NULL CHECK (sender IN ('customer', 'admin')),
  body            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_messages_thread_idx
  ON support_messages (conversation_id, created_at);

-- RLS on with NO policies: every read and write goes through the API routes on
-- the service-role key, which check who is asking. Nothing is reachable with
-- the anon key, so a browser can't enumerate other people's conversations.
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages      ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT 'support_conversations' AS table_name, count(*) AS rows FROM support_conversations
UNION ALL
SELECT 'support_messages', count(*) FROM support_messages;
