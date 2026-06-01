import { getSiteConfig } from '@/lib/site-config'
import { getProducts } from '@/lib/get-products'
import AnnounceBar from '@/components/AnnounceBar'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Cart from '@/components/Cart'
import Toast from '@/components/Toast'
import ShopClient from '@/components/ShopClient'

export const revalidate = 60

export const metadata = {
  title: 'Shop All Products — The Maga',
  description: 'Browse our full collection of premium collectibles, crypto memorabilia, medallions, and more.',
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams
  const [products, config] = await Promise.all([getProducts(), getSiteConfig()])

  return (
    <>
      <AnnounceBar config={config.announce_bar} />
      <Header />
      <main style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
        <ShopClient products={products} initialCat={cat ?? 'all'} />
      </main>
      <Footer />
      <Cart />
      <Toast />
    </>
  )
}
