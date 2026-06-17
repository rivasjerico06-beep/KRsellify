// One-time: creates the rfs_profiles table for the /rfs rewards portal
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  'https://ewwrpldcdwzwoodbsrzf.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SQL = `
  CREATE TABLE IF NOT EXISTS rfs_profiles (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gmail                  text UNIQUE NOT NULL,
    display_name           text NOT NULL DEFAULT 'Valued Customer',
    benefit_title          text NOT NULL DEFAULT 'Cash-Out Amount',
    benefit_amount         numeric NOT NULL DEFAULT 0,
    activation_pct         integer NOT NULL DEFAULT 0 CHECK (activation_pct >= 0 AND activation_pct <= 100),
    deduction_pct          integer NOT NULL DEFAULT 0 CHECK (deduction_pct >= 0 AND deduction_pct <= 100),
    minimized_deduction_pct integer DEFAULT NULL,
    required_product_ids   text[] NOT NULL DEFAULT '{}',
    completed_product_ids  text[] NOT NULL DEFAULT '{}',
    status                 text NOT NULL DEFAULT 'under_review',
    deadline               timestamptz DEFAULT NULL,
    custom_message         text DEFAULT NULL,
    admin_notes            text DEFAULT NULL,
    created_at             timestamptz DEFAULT now(),
    updated_at             timestamptz DEFAULT now()
  );
  ALTER TABLE rfs_profiles ENABLE ROW LEVEL SECURITY;
`

admin.rpc('exec_sql', { query: SQL })
  .then(() => console.log('Done via rpc'))
  .catch(async () => {
    // Fallback: try direct insert to test connection then instruct manual run
    console.log('\nPlease run this SQL in your Supabase SQL Editor:\n')
    console.log(SQL)
  })
