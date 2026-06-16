// One-time: updates the 5 new Trump products with real images extracted from the PDF
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ewwrpldcdwzwoodbsrzf.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const UPDATES = [
  { name: 'Trump Collectible 2028 Gold Buck Bill (5 Pack)', img: '/products/trump-2028-gold-buck-bill.jpg' },
  { name: 'Donald J. Trump Sneakers Never Surrender', img: '/products/trump-sneakers-never-surrender.jpg' },
  { name: 'President Trump First Collectible 2025 Edition Silver Medallion', img: '/products/trump-silver-medallion-2025.jpg' },
  { name: 'Gold Eagle Coin (2025) Buy 1 Get 1 FREE - Collectible', img: '/products/gold-eagle-coin-2025.jpg' },
  { name: 'Donald Trump Treasure Box 47 President Edition - Certified', img: '/products/trump-treasure-box-47.jpg' },
]

async function main() {
  for (const { name, img } of UPDATES) {
    const { data, error } = await admin.from('products').update({ img }).eq('name', name).select('id, name')
    if (error) { console.error(`Error updating ${name}:`, error.message); continue }
    if (!data?.length) { console.warn(`No match found for: ${name}`); continue }
    console.log(`✓ ${name} → ${img}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
