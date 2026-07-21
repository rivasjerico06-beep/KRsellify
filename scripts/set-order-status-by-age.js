// Sets each order's status based on how long ago it was created:
//   >= 5 days old        -> delivered
//   3-4 days old         -> shipped
//   < 3 days old         -> confirmed
//
// Usage:
//   Dry run (no writes):  DRY_RUN=1 SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-order-status-by-age.js
//   Apply:                SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-order-status-by-age.js
//
// Talks to the DB directly, so it does NOT send status-update emails to customers.
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ewwrpldcdwzwoodbsrzf.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run')
const DAY_MS = 86400000

const admin = createClient(SUPABASE_URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function targetStatus(ageDays) {
  if (ageDays >= 5) return 'delivered'
  if (ageDays >= 3) return 'shipped' // 3-4 days
  return 'confirmed' // 0-2 days
}

async function main() {
  const { data: orders, error } = await admin
    .from('orders')
    .select('id, order_number, status, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch failed:', error.message)
    process.exit(1)
  }

  const now = Date.now()
  const buckets = { delivered: [], shipped: [], confirmed: [] }

  for (const o of orders) {
    const ageDays = Math.floor((now - new Date(o.created_at).getTime()) / DAY_MS)
    buckets[targetStatus(ageDays)].push({ ...o, ageDays })
  }

  console.log(`Total orders: ${orders.length}\n`)
  for (const s of ['delivered', 'shipped', 'confirmed']) {
    const rows = buckets[s]
    const ages = rows.map((r) => r.ageDays)
    const range = rows.length ? `age ${Math.min(...ages)}–${Math.max(...ages)}d` : ''
    const changing = rows.filter((r) => r.status !== s).length
    console.log(`  ${s.padEnd(9)}: ${String(rows.length).padStart(3)} orders  ${range}  (${changing} will change)`)
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN — no changes written.')
    return
  }

  console.log('')
  for (const s of ['delivered', 'shipped', 'confirmed']) {
    const ids = buckets[s].filter((r) => r.status !== s).map((r) => r.id)
    if (!ids.length) {
      console.log(`= ${s}: nothing to change`)
      continue
    }
    const { error: uErr } = await admin.from('orders').update({ status: s }).in('id', ids)
    if (uErr) {
      console.error(`Update ${s} failed:`, uErr.message)
      process.exit(1)
    }
    console.log(`✓ ${s}: updated ${ids.length} orders`)
  }
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
