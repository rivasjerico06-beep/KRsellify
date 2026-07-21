// Marks EVERY order in the database as 'delivered'.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key node scripts/mark-all-orders-delivered.js
//
// The service-role key is found in Supabase → Project Settings → API → service_role.
// This talks directly to the database, so it does NOT send status-update emails to customers.
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ewwrpldcdwzwoodbsrzf.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  // How many orders are not already delivered?
  const { count: pending, error: countErr } = await admin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'delivered')

  if (countErr) {
    console.error('Count failed:', countErr.message)
    process.exit(1)
  }

  console.log(`Orders not yet 'delivered': ${pending ?? 0}`)
  if (!pending) {
    console.log('Nothing to update — every order is already delivered.')
    return
  }

  const { data, error } = await admin
    .from('orders')
    .update({ status: 'delivered' })
    .neq('status', 'delivered')
    .select('id')

  if (error) {
    console.error('Update failed:', error.message)
    process.exit(1)
  }

  console.log(`✓ Updated ${data?.length ?? 0} orders to 'delivered'.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
