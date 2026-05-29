'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Cart from '@/components/Cart'
import Toast from '@/components/Toast'
import { CartItem } from '@/lib/types'
import Stars from '@/components/Stars'

function WishlistCard({ item }: { item: CartItem }) {
  const { removeFromCart, addToCart, showToast, setCartOpen } = useCart()
  const savings = item.old_price ? Math.round((1 - item.price / item.old_price) * 100) : 0

  function moveToCart() {
    removeFromCart(item.id)
    addToCart(item, 'btn')
    showToast(`✓ ${item.name} moved to cart`)
    setCartOpen(true)
  }

  function remove() {
    removeFromCart(item.id)
    showToast('Removed from wishlist')
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, boxShadow: '0 20px 50px rgba(9,52,89,0.14)' }}
      style={{ background: 'var(--white)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 14px rgba(9,52,89,0.07)', position: 'relative' }}>

      {/* Wishlist badge */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, background: 'var(--sale-red)', color: 'white', borderRadius: 50, padding: '4px 10px', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
        <i className="fa-solid fa-heart" style={{ fontSize: 9 }} /> Saved
      </div>

      {/* Remove */}
      <motion.button onClick={remove} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
        title="Remove from wishlist"
        style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--sale-red)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
        <i className="fa-solid fa-xmark" />
      </motion.button>

      {/* Image */}
      <Link href={`/products/${item.id}`}>
        <div style={{ position: 'relative', height: 220, overflow: 'hidden', background: 'var(--gray)' }}>
          <motion.div whileHover={{ scale: 1.07 }} transition={{ duration: 0.4 }} style={{ position: 'absolute', inset: 0 }}>
            <Image src={item.img} alt={item.name} fill style={{ objectFit: 'cover' }}
              sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 25vw" />
          </motion.div>
          {item.is_sale && savings > 0 && (
            <span style={{ position: 'absolute', bottom: 12, left: 12, background: 'var(--sale-red)', color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20 }}>−{savings}% OFF</span>
          )}
        </div>
      </Link>

      {/* Info */}
      <div style={{ padding: '18px 18px 20px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 5 }}>{item.cat_label}</p>
        <Link href={`/products/${item.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-dark)', marginBottom: 8, lineHeight: 1.35, minHeight: 38 }}>{item.name}</h3>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Stars rating={item.rating} />
          <span style={{ fontSize: 11, color: 'var(--text-light)' }}>({item.reviews_count})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>${item.price.toFixed(2)}</span>
            {item.old_price && (
              <span style={{ fontSize: 12, color: 'var(--text-light)', textDecoration: 'line-through', marginLeft: 6 }}>${item.old_price.toFixed(2)}</span>
            )}
          </div>
          <motion.button onClick={moveToCart}
            whileHover={{ background: 'var(--teal)', scale: 1.05 }} whileTap={{ scale: 0.96 }}
            style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 50, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s' }}>
            <i className="fa-solid fa-cart-plus" /> Add to Cart
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default function WishlistPage() {
  const { cart } = useCart()
  const wishlist = cart.filter(i => i.via === 'heart')

  return (
    <>
      <Header />
      <main style={{ minHeight: '80vh', background: 'var(--off-white)', padding: '48px 28px 80px' }}>
        <div style={{ maxWidth: 1340, margin: '0 auto' }}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Link href="/" style={{ color: 'var(--teal)', fontSize: 13, fontWeight: 600 }}>Home</Link>
              <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, color: 'var(--text-light)' }} />
              <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 700 }}>Wishlist</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 6 }}>Saved Items</p>
                <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900, color: 'var(--navy)' }}>
                  My Wishlist
                  {wishlist.length > 0 && (
                    <span style={{ marginLeft: 14, fontSize: 16, fontWeight: 700, background: 'var(--teal)', color: 'white', padding: '4px 12px', borderRadius: 50, verticalAlign: 'middle' }}>
                      {wishlist.length}
                    </span>
                  )}
                </h1>
              </div>
              {wishlist.length > 0 && (
                <Link href="/#products" style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', borderBottom: '2px solid var(--teal)', paddingBottom: 2, textDecoration: 'none' }}>
                  Continue Shopping <i className="fa-solid fa-arrow-right" />
                </Link>
              )}
            </div>
          </motion.div>

          {/* Empty state */}
          <AnimatePresence mode="wait">
            {wishlist.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '80px 20px' }}>
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontSize: 72, color: 'var(--gray)', marginBottom: 24 }}>
                  <i className="fa-regular fa-heart" />
                </motion.div>
                <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--navy)', marginBottom: 12 }}>
                  Your wishlist is empty
                </h2>
                <p style={{ fontSize: 16, color: 'var(--text-mid)', maxWidth: 380, margin: '0 auto 32px', lineHeight: 1.7 }}>
                  Tap the <i className="fa-solid fa-heart" style={{ color: 'var(--sale-red)' }} /> heart icon on any product to save it here for later.
                </p>
                <Link href="/#products">
                  <motion.button whileHover={{ background: 'var(--teal)' }} whileTap={{ scale: 0.97 }}
                    style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '15px 36px', borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.07em', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}>
                    <i className="fa-solid fa-bag-shopping" /> Browse Products
                  </motion.button>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
                <AnimatePresence>
                  {wishlist.map(item => <WishlistCard key={item.id} item={item} />)}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
      <Cart />
      <Toast />
    </>
  )
}
