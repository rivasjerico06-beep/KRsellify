import { getSiteConfig } from '@/lib/site-config'
import { getProducts } from '@/lib/get-products'
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
