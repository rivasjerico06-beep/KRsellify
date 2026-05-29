import { createClient } from '@supabase/supabase-js'
import { Product } from '@/lib/types'
import { getSiteConfig } from '@/lib/site-config'
import AnnounceBar from '@/components/AnnounceBar'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import TrustBar from '@/components/TrustBar'
import Categories from '@/components/Categories'
import ProductGrid from '@/components/ProductGrid'
import Banner from '@/components/Banner'
import Testimonials from '@/components/Testimonials'
import Newsletter from '@/components/Newsletter'
import Footer from '@/components/Footer'
import Cart from '@/components/Cart'
import Toast from '@/components/Toast'

export const revalidate = 60

const FALLBACK_PRODUCTS: Product[] = [
  { id: '1', name: 'XRP Nesara/Gesara Gold Bar', category: 'medallions', price: 199, old_price: null, is_sale: false, is_new: true, rating: 5, reviews_count: 28, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835331760/5762187052.webp', cat_label: 'Medallions', in_stock: true },
  { id: '2', name: 'Bitcoin Diamond 2025', category: 'crypto', price: 399, old_price: 999, is_sale: true, is_new: false, rating: 5, reviews_count: 64, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328754/5762178888.webp', cat_label: 'Crypto', in_stock: true },
  { id: '3', name: 'D.O.G.E COIN Collectible', category: 'crypto', price: 199, old_price: 1999.99, is_sale: true, is_new: false, rating: 4, reviews_count: 112, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328752/5762183409.webp', cat_label: 'Crypto', in_stock: true },
  { id: '4', name: 'Bitcoin Crypto Passport', category: 'collectibles', price: 399, old_price: 999, is_sale: true, is_new: false, rating: 5, reviews_count: 47, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835331761/5762178792.webp', cat_label: 'Collectibles', in_stock: true },
  { id: '5', name: 'Trump 1000 Bitcoins Gold Bar', category: 'collectibles', price: 199, old_price: 1999, is_sale: true, is_new: false, rating: 5, reviews_count: 89, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328757/5762187026.webp', cat_label: 'Collectibles', in_stock: true },
  { id: '6', name: 'Nesara Gesara QFS Gold Coin', category: 'medallions', price: 299, old_price: null, is_sale: false, is_new: true, rating: 5, reviews_count: 33, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835401009/5762614918.webp', cat_label: 'Medallions', in_stock: true },
  { id: '7', name: 'Trump Legacy One Milli BTC Block', category: 'collectibles', price: 199, old_price: null, is_sale: false, is_new: false, rating: 4, reviews_count: 21, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/836356299/5773174012.webp', cat_label: 'Collectibles', in_stock: true },
  { id: '8', name: 'TRUMP WLFI TOKEN', category: 'crypto', price: 299, old_price: null, is_sale: false, is_new: true, rating: 5, reviews_count: 15, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/836356303/5773174048.webp', cat_label: 'Crypto', in_stock: true },
]

async function getProducts(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url.includes('your-project-id')) return FALLBACK_PRODUCTS
  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (error || !data?.length) return FALLBACK_PRODUCTS
    return data
  } catch {
    return FALLBACK_PRODUCTS
  }
}

export default async function Home() {
  const [products, config] = await Promise.all([getProducts(), getSiteConfig()])

  return (
    <>
      <AnnounceBar config={config.announce_bar} />
      <Header />
      <main>
        <Hero slides={config.hero_slides} />
        <TrustBar items={config.trust_bar} />
        <section id="categories"><Categories /></section>
        <section id="products" style={{ background: 'var(--off-white)', padding: '20px 0 60px' }}>
          <ProductGrid initialProducts={products} />
        </section>
        <Banner config={config.banner} />
        <Testimonials />
        <Newsletter config={config.newsletter} />
      </main>
      <Footer />
      <Cart />
      <Toast />
    </>
  )
}
