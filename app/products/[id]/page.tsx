import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Product } from '@/lib/types'
import AnnounceBar from '@/components/AnnounceBar'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Cart from '@/components/Cart'
import Toast from '@/components/Toast'
import ProductDetailClient from '@/components/ProductDetailClient'
import { getSiteConfig } from '@/lib/site-config'

export const revalidate = 60

const FALLBACK_PRODUCTS: Product[] = [
  { id: '1', name: 'XRP Nesara/Gesara Gold Bar', category: 'medallions', price: 199, old_price: null, is_sale: false, is_new: true, rating: 5, reviews_count: 28, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835331760/5762187052.webp', cat_label: 'Medallions', in_stock: true, description: 'A stunning commemorative gold bar featuring the XRP Nesara/Gesara design. Beautifully crafted with premium metal alloy, this limited-edition piece is a must-have for any serious collector. Ships in a luxurious gift box.' },
  { id: '2', name: 'Bitcoin Diamond 2025', category: 'crypto', price: 399, old_price: 999, is_sale: true, is_new: false, rating: 5, reviews_count: 64, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328754/5762178888.webp', cat_label: 'Crypto', in_stock: true, description: 'Own a piece of crypto history with the Bitcoin Diamond 2025 collectible. Expertly detailed and finished to museum quality, this is the ultimate Bitcoin memorabilia. Limited mint — once sold out, it\'s gone forever.' },
  { id: '3', name: 'D.O.G.E COIN Collectible', category: 'crypto', price: 199, old_price: 1999.99, is_sale: true, is_new: false, rating: 4, reviews_count: 112, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328752/5762183409.webp', cat_label: 'Crypto', in_stock: true, description: 'The iconic D.O.G.E Coin collectible — a beloved piece in any crypto enthusiast\'s collection. Intricately detailed, this commemorative coin celebrates the cultural phenomenon of Dogecoin.' },
  { id: '4', name: 'Bitcoin Crypto Passport', category: 'collectibles', price: 399, old_price: 999, is_sale: true, is_new: false, rating: 5, reviews_count: 47, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835331761/5762178792.webp', cat_label: 'Collectibles', in_stock: true, description: 'The Bitcoin Crypto Passport is a one-of-a-kind collectible document showcasing the history and milestones of Bitcoin. A premium keepsake that makes an exceptional gift for crypto believers.' },
  { id: '5', name: 'Trump 1000 Bitcoins Gold Bar', category: 'collectibles', price: 199, old_price: 1999, is_sale: true, is_new: false, rating: 5, reviews_count: 89, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328757/5762187026.webp', cat_label: 'Collectibles', in_stock: true, description: 'A commemorative gold bar celebrating the fusion of political legacy and crypto culture. This highly sought-after collectible features premium gold-tone finish and collector-grade detailing.' },
  { id: '6', name: 'Nesara Gesara QFS Gold Coin', category: 'medallions', price: 299, old_price: null, is_sale: false, is_new: true, rating: 5, reviews_count: 33, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835401009/5762614918.webp', cat_label: 'Medallions', in_stock: true, description: 'The Nesara Gesara QFS Gold Coin is a premium medallion commemorating the global financial reset movement. Struck with exceptional detail and presented in a collector\'s case.' },
  { id: '7', name: 'Trump Legacy One Milli BTC Block', category: 'collectibles', price: 199, old_price: null, is_sale: false, is_new: false, rating: 4, reviews_count: 21, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/836356299/5773174012.webp', cat_label: 'Collectibles', in_stock: true, description: 'Celebrate the intersection of American legacy and Bitcoin culture with the Trump Legacy One Milli BTC Block. A bold, conversation-starting collectible finished in premium metals.' },
  { id: '8', name: 'TRUMP WLFI TOKEN', category: 'crypto', price: 299, old_price: null, is_sale: false, is_new: true, rating: 5, reviews_count: 15, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/836356303/5773174048.webp', cat_label: 'Crypto', in_stock: true, description: 'The TRUMP WLFI TOKEN commemorative collectible marks a historic moment in the world of crypto and politics. Limited edition, highly collectible, and beautifully crafted.' },
]

async function getProduct(id: string): Promise<{ product: Product | null; related: Product[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('your-project-id')) {
    const product = FALLBACK_PRODUCTS.find(p => p.id === id) ?? null
    const related = product ? FALLBACK_PRODUCTS.filter(p => p.category === product.category && p.id !== id).slice(0, 4) : []
    return { product, related }
  }

  try {
    const supabase = createClient(url, key)
    const [{ data: product }, { data: allProducts }] = await Promise.all([
      supabase.from('products').select('*').eq('id', id).single(),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
    ])
    if (!product) {
      const fallback = FALLBACK_PRODUCTS.find(p => p.id === id) ?? null
      const related = fallback ? FALLBACK_PRODUCTS.filter(p => p.category === fallback.category && p.id !== id).slice(0, 4) : []
      return { product: fallback, related }
    }
    const related = (allProducts ?? []).filter((p: Product) => p.category === product.category && p.id !== id).slice(0, 4)
    return { product, related }
  } catch {
    const product = FALLBACK_PRODUCTS.find(p => p.id === id) ?? null
    const related = product ? FALLBACK_PRODUCTS.filter(p => p.category === product.category && p.id !== id).slice(0, 4) : []
    return { product, related }
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ product, related }, config] = await Promise.all([getProduct(id), getSiteConfig()])

  if (!product) notFound()

  return (
    <>
      <AnnounceBar config={config.announce_bar} />
      <Header />
      <main style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
        <ProductDetailClient product={product} related={related} />
      </main>
      <Footer />
      <Cart />
      <Toast />
    </>
  )
}
