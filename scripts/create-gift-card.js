// One-time: inserts the $10 Gift Card product into the products table
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ewwrpldcdwzwoodbsrzf.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data, error } = await admin.from('products').insert({
    name: 'Maga Offers Gift Card',
    category: 'accessories',
    cat_label: 'Accessories',
    price: 10,
    is_sale: false,
    is_new: true,
    rating: 5.0,
    reviews_count: 0,
    img: '/logo.png',
    in_stock: true,
    description: 'Purchase this $10 gift card and instantly unlock your exclusive THEMAGA10 coupon — 10% off any future order. Plus, after purchase you\'ll get to choose between a bonus 30% or 50% discount coupon as a limited-time offer!',
  }).select().single()

  if (error) { console.error('Error:', error.message); process.exit(1) }
  console.log('Gift card product created!')
  console.log('  ID:', data.id)
  console.log('  Name:', data.name)
  console.log('  Price: $' + data.price)
}

main().catch(e => { console.error(e); process.exit(1) })
