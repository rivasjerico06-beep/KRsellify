// One-time: inserts 5 new Trump merch products into the products table
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ewwrpldcdwzwoodbsrzf.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PLACEHOLDER_IMG = '/logo.png'

const PRODUCTS = [
  {
    name: 'Trump Collectible 2028 Gold Buck Bill (5 Pack)',
    category: 'collectibles',
    cat_label: 'Collectibles',
    price: 49.99,
    old_price: null,
    is_sale: false,
    is_new: true,
    rating: 5,
    reviews_count: 2500,
    img: PLACEHOLDER_IMG,
    in_stock: true,
    description: 'They Called It Just a Bill… Until They Saw It Shine. The moment you hold the Trump 2028 Gold Buck Bill, you see the brilliance — the detail, the gold finish, the pride. This isn’t just paper; it’s a symbol of strength, legacy, and the movement that will never surrender. 2028 First Edition, gold foil finish, serialized collectible bill. Each envelope includes 5 gold buck bills.',
    quantity_options: [
      { qty: 5,   label: '1x Trump 2028 Gold Buck Bill (5 Bills)', bundle_total: 49.99 },
      { qty: 15,  label: '3x Trump Gold Bitcoin Bucks Bills (15 bills)', bundle_total: 129.99 },
      { qty: 30,  label: '6x Trump Gold Bitcoin Bucks Bills (30 bills)', bundle_total: 229.99 },
      { qty: 50,  label: '10x Trump Gold Bitcoin Bucks Bills (50 bills)', bundle_total: 349.99 },
      { qty: 100, label: '20x Trump Gold Bitcoin Bucks Bills (100 bills)', bundle_total: 599.99 },
      { qty: 150, label: '30x Trump Gold Bitcoin Bucks Bills (150 bills)', bundle_total: 799.99 },
    ],
  },
  {
    name: 'Donald J. Trump Sneakers Never Surrender',
    category: 'accessories',
    cat_label: 'Accessories',
    price: 229.95,
    old_price: 499.00,
    is_sale: true,
    is_new: true,
    rating: 5,
    reviews_count: 2500,
    img: PLACEHOLDER_IMG,
    in_stock: true,
    description: 'They Called It a Joke. Now It’s the #1 Sneaker in America. These aren’t just sneakers, they’re a symbol. Bold metallic gold with patriotic detailing, synthetic upper with breathable mesh, reinforced rubber with non-slip grip, true to size (unisex sizing). Available in sizes US Men 4 (Women 5.5) through US Men 14 (Women 16). Limited Never Surrender Edition — ships in a custom collector’s box.',
    quantity_options: [
      { qty: 1, label: '1x Donald J. Trump Sneakers Never Surrender', bundle_total: 229.95 },
    ],
  },
  {
    name: 'President Trump First Collectible 2025 Edition Silver Medallion',
    category: 'medallions',
    cat_label: 'Medallions',
    price: 99.00,
    old_price: 199.00,
    is_sale: true,
    is_new: true,
    rating: 5,
    reviews_count: 2500,
    img: PLACEHOLDER_IMG,
    in_stock: true,
    description: 'Patriot Value Offer: Buy 1 Trump Silver Medallion & Get 3 FREE! This limited-time offer gives you 4 total silver medallions for the price of 1 — crafted with a polished silver finish and high-relief detailing. Limited 2025 edition collectible, diameter 1.57" (40mm), approx. 1 oz, includes protective acrylic capsule for display and preservation.',
    quantity_options: [
      { qty: 4,  label: 'Buy 1 – Get 3 Trump Silver Coins',  bundle_total: 99.00 },
      { qty: 8,  label: 'Buy 3 – Get 5 Trump Silver Coins',  bundle_total: 229.00 },
      { qty: 15, label: 'Buy 5 – Get 10 Trump Silver Coins', bundle_total: 349.00 },
      { qty: 25, label: 'Buy 10 – Get 15 Trump Silver Coins', bundle_total: 549.00 },
      { qty: 40, label: 'Buy 15 – Get 25 Trump Silver Coins', bundle_total: 799.00 },
    ],
  },
  {
    name: 'Gold Eagle Coin (2025) Buy 1 Get 1 FREE - Collectible',
    category: 'medallions',
    cat_label: 'Medallions',
    price: 49.00,
    old_price: 99.00,
    is_sale: true,
    is_new: true,
    rating: 5,
    reviews_count: 2500,
    img: PLACEHOLDER_IMG,
    in_stock: true,
    description: 'Patriot Eagle Promotion — Buy 1, Get 1 FREE! Every Certified Gold Eagle Coin purchased includes a second coin free. Gleaming polished gold with high-relief eagle engraving, certified 2025 First Edition. Comes with certificate of authenticity, diameter 1.57" (40mm), approx. 1 oz, sealed in a protective capsule for preservation.',
    quantity_options: [
      { qty: 2,  label: 'Buy 1 Get 1 FREE — Special Promotion Eagle Coin', bundle_total: 49.00 },
      { qty: 5,  label: 'Buy 3 Get 2 FREE — Best Value',                  bundle_total: 119.00 },
      { qty: 8,  label: 'Buy 5 Get 3 FREE — Maximum Savings',             bundle_total: 179.00 },
      { qty: 15, label: 'Buy 10 Get 5 FREE — Big Saver Bundle',           bundle_total: 299.00 },
      { qty: 22, label: 'Buy 15 Get 7 FREE — Ultra Savings Pack',         bundle_total: 399.00 },
      { qty: 35, label: 'Buy 25, Get 10 FREE — Best Price Guaranteed',    bundle_total: 599.00 },
    ],
  },
  {
    name: 'Donald Trump Treasure Box 47 President Edition - Certified',
    category: 'collectibles',
    cat_label: 'Collectibles',
    price: 99.00,
    old_price: null,
    is_sale: false,
    is_new: true,
    rating: 5,
    reviews_count: 2500,
    img: PLACEHOLDER_IMG,
    in_stock: true,
    description: 'A Treasure Worth More Than Gold. The Donald J. Trump Treasure Box isn’t just a collection, it’s a legacy. Each certified gold coin in this limited 47th President Edition is crafted to honor American greatness and built to be passed down for generations. Collector’s 2025 First Edition with a polished silver shine and high-relief detailing. Comes with official certificate of authenticity in a premium presentation box.',
    quantity_options: [
      { qty: 1,  label: 'One Coin Box',                  bundle_total: 99.00 },
      { qty: 3,  label: 'Three Coin Box',                bundle_total: 249.00 },
      { qty: 5,  label: 'Five Coin Box',                 bundle_total: 399.00 },
      { qty: 11, label: 'Ten Coin Box + One Coin Box FREE', bundle_total: 699.00 },
    ],
  },
]

async function main() {
  const { data, error } = await admin.from('products').insert(PRODUCTS).select('id, name, price')
  if (error) { console.error('Error:', error.message); process.exit(1) }

  console.log(`✓ ${data.length} products created!\n`)
  for (const p of data) console.log(`  - ${p.name} ($${p.price}) — ${p.id}`)
}

main().catch(e => { console.error(e); process.exit(1) })
