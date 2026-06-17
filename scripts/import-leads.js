// One-time script: delete all existing leads, import from Excel
const xlsx = require('xlsx')
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

function formatPhone(raw) {
  if (!raw) return ''
  const str = String(raw).replace(/\D/g, '')
  return str
}

async function main() {
  // 1. Parse Excel
  const wb = xlsx.readFile('05_22_26 LEADS.xlsx')
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 })

  // Skip header row
  const dataRows = rows.slice(1).filter(r => r[0]) // must have a name

  const leads = dataRows.map(r => ({
    customer_name: String(r[0] || '').trim(),
    customer_phone: formatPhone(r[2]),
    product_interest: r[11] ? String(r[11]).trim() : null,
    status: 'new',
  })).filter(l => l.customer_name && l.customer_phone)

  console.log(`Parsed ${leads.length} valid leads from Excel`)

  // 2. Delete ALL existing leads
  console.log('Deleting existing leads...')
  const { error: delErr } = await admin
    .from('leads')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all rows
  if (delErr) {
    console.error('Delete failed:', delErr.message)
    process.exit(1)
  }
  console.log('All existing leads deleted.')

  // 3. Insert in batches of 100
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH)
    const { error } = await admin.from('leads').insert(batch)
    if (error) {
      console.error(`Batch ${i}-${i + BATCH} failed:`, error.message)
      process.exit(1)
    }
    inserted += batch.length
    console.log(`Inserted ${inserted}/${leads.length}...`)
  }

  console.log(`Done! ${inserted} leads imported successfully.`)
}

main().catch(e => { console.error(e); process.exit(1) })
