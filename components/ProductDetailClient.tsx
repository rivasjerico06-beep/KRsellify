'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { Product } from '@/lib/types'
import ProductCard from './ProductCard'
import BuyNowModal from './BuyNowModal'

const FEATURES: Record<string, string[]> = {
  medallions:   ['Premium gold-tone alloy finish', 'Limited edition — numbered mint', 'Arrives in collector\'s gift box', 'Certificate of authenticity included', 'Ships worldwide in 3–7 business days'],
  collectibles: ['Museum-quality craftsmanship', 'Limited edition collectible', 'Premium display packaging', 'Certificate of authenticity included', 'Ships worldwide in 3–7 business days'],
  crypto:       ['Crypto-themed commemorative piece', 'Collector-grade detailing', 'Premium metal alloy construction', 'Arrives in luxury gift packaging', 'Ships worldwide in 3–7 business days'],
  apparel:      ['Premium quality fabric', 'Limited edition design', 'Comfortable everyday wear', 'Available in multiple sizes', 'Ships worldwide in 3–7 business days'],
  accessories:  ['Premium materials throughout', 'Unique collector\'s item', 'Elegant gift packaging', 'Certificate of authenticity included', 'Ships worldwide in 3–7 business days'],
}

function Stars({ rating, large }: { rating: number; large?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: large ? 4 : 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i < rating ? 'fa-solid fa-star' : 'fa-regular fa-star'}
          style={{ color: '#f59e0b', fontSize: large ? 15 : 11 }} />
      ))}
    </div>
  )
}

export default function ProductDetailClient({ product, related }: { product: Product; related: Product[] }) {
  const { addToCart, addBundle, heartToggle, isInCart, showToast, setCartOpen } = useCart()
  const { user } = useAuth()
  const [qty, setQty] = useState(1)
  const [selectedTierIdx, setSelectedTierIdx] = useState(0)
  const [activeImg, setActiveImg] = useState(0)
  const [justAdded, setJustAdded] = useState(false)
  const [showBuyNowModal, setShowBuyNowModal] = useState(false)
  const inCart = isInCart(product.id)
  const hasTiers = !!(product.quantity_options && product.quantity_options.length > 0)
  const selectedTier = hasTiers ? product.quantity_options![selectedTierIdx] : null

  const images = product.images?.length ? product.images : [product.img]
  const savings = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0
  const features = FEATURES[product.category] ?? FEATURES.collectibles

  function handleAddToCart() {
    if (selectedTier) {
      addBundle(product, selectedTier.label, selectedTier.qty, selectedTier.bundle_total)
    } else {
      for (let i = 0; i < qty; i++) addToCart(product, 'btn')
    }
    showToast(`✓ ${product.name} added to cart`)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1400)
  }

  function handleBuyNow() {
    if (selectedTier) {
      addBundle(product, selectedTier.label, selectedTier.qty, selectedTier.bundle_total)
    } else {
      for (let i = 0; i < qty; i++) addToCart(product, 'btn')
    }
    if (!user) {
      setShowBuyNowModal(true)
    } else {
      setCartOpen(true)
    }
  }

  function handleHeart() {
    heartToggle(product)
    showToast(inCart ? 'Removed from wishlist' : `❤️ ${product.name} added to wishlist!`)
  }

  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', padding: '32px 28px 80px' }}>
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontSize: 13, color: 'var(--text-light)', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Home</Link>
        <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, opacity: 0.5 }} />
        <Link href="/#products" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Shop</Link>
        <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, opacity: 0.5 }} />
        <span style={{ color: 'var(--heading)', fontWeight: 700 }}>{product.name}</span>
      </motion.nav>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 56, alignItems: 'start', marginBottom: 80 }}>

        {/* Left — Image gallery */}
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          {/* Main image */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: 24, overflow: 'hidden', background: 'var(--white)', boxShadow: '0 8px 40px rgba(9,52,89,0.12)', marginBottom: 16, cursor: 'zoom-in' }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeImg}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', inset: 0 }}>
                <Image src={images[activeImg]} alt={product.name} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 50vw" priority />
              </motion.div>
            </AnimatePresence>

            {/* Badges */}
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8, zIndex: 2 }}>
              {product.is_sale && savings > 0 && (
                <span style={{ background: 'var(--sale-red)', color: 'white', fontSize: 12, fontWeight: 800, padding: '6px 14px', borderRadius: 50, letterSpacing: '0.04em' }}>
                  −{savings}% OFF
                </span>
              )}
              {product.is_new && !product.is_sale && (
                <span style={{ background: 'var(--navy)', color: 'white', fontSize: 12, fontWeight: 800, padding: '6px 14px', borderRadius: 50 }}>NEW</span>
              )}
            </div>

            {/* Wishlist */}
            <motion.button onClick={handleHeart} whileTap={{ scale: 1.4 }}
              animate={inCart
                ? { background: 'var(--sale-red)', color: 'white', boxShadow: '0 4px 16px rgba(224,84,84,0.5)' }
                : { background: 'rgba(255,255,255,0.9)', color: 'var(--text-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              style={{ position: 'absolute', top: 16, right: 16, border: 'none', width: 44, height: 44, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <i className={`fa-${inCart ? 'solid' : 'regular'} fa-heart`} />
            </motion.button>
          </motion.div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 10 }}>
              {images.map((src, i) => (
                <motion.button key={i} onClick={() => setActiveImg(i)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  style={{ position: 'relative', width: 72, height: 72, borderRadius: 12, overflow: 'hidden', border: i === activeImg ? '2.5px solid var(--teal)' : '2px solid transparent', background: 'var(--white)', cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px rgba(9,52,89,0.1)', padding: 0 }}>
                  <Image src={src} alt="" fill style={{ objectFit: 'cover' }} sizes="72px" />
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right — Product info */}
        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          {/* Category */}
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 10 }}>
            {product.cat_label}
          </p>

          {/* Name */}
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, color: 'var(--heading)', lineHeight: 1.15, marginBottom: 16 }}>
            {product.name}
          </h1>

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Stars rating={product.rating} large />
            <span style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 600 }}>{product.rating}.0</span>
            <span style={{ fontSize: 13, color: 'var(--text-light)' }}>({product.reviews_count} reviews)</span>
          </div>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 24, padding: '20px 24px', background: 'var(--white)', borderRadius: 16, boxShadow: '0 2px 12px rgba(9,52,89,0.07)' }}>
            <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 46, fontWeight: 700, color: 'var(--heading)', lineHeight: 1 }}>
              ${product.price.toFixed(2)}
            </span>
            {product.old_price && (
              <>
                <span style={{ fontSize: 20, color: 'var(--text-light)', textDecoration: 'line-through' }}>${product.old_price.toFixed(2)}</span>
                <span style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--sale-red)', fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 50 }}>
                  You save ${(product.old_price - product.price).toFixed(2)}
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: product.in_stock ? '#10b981' : '#ef4444', display: 'inline-block', boxShadow: product.in_stock ? '0 0 6px rgba(16,185,129,0.6)' : 'none' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: product.in_stock ? '#059669' : '#dc2626' }}>
              {product.in_stock ? 'In Stock — Ready to Ship' : 'Out of Stock'}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-mid)', marginBottom: 28 }}>
              {product.description}
            </p>
          )}

          {/* Features */}
          <ul style={{ listStyle: 'none', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {features.map((f, i) => (
              <motion.li key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-mid)' }}>
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--teal)', fontSize: 13, flexShrink: 0 }} />
                {f}
              </motion.li>
            ))}
          </ul>

          {/* Quantity — tier chips or plain stepper */}
          {hasTiers ? (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-mid)', marginBottom: 12 }}>Select Quantity</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {product.quantity_options!.map((opt, i) => (
                  <motion.button key={i} onClick={() => setSelectedTierIdx(i)}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    style={{ padding: '12px 18px', borderRadius: 12, border: `2px solid ${selectedTierIdx === i ? 'var(--teal)' : 'var(--gray)'}`, background: selectedTierIdx === i ? 'rgba(88,148,143,0.1)' : 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit', fontSize: 13, fontWeight: selectedTierIdx === i ? 700 : 500, color: 'var(--text-dark)', textAlign: 'left', transition: 'border-color 0.2s, background 0.2s' }}>
                    <span>{opt.label}</span>
                    <span style={{ color: selectedTierIdx === i ? 'var(--teal)' : 'var(--text-mid)', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', marginLeft: 12 }}>${opt.bundle_total.toFixed(2)}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Qty</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--white)', borderRadius: 50, border: '1.5px solid var(--gray)', overflow: 'hidden', boxShadow: '0 1px 6px rgba(9,52,89,0.06)' }}>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: 40, height: 40, border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</motion.button>
              <span style={{ width: 32, textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--heading)' }}>{qty}</span>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => setQty(q => q + 1)}
                style={{ width: 40, height: 40, border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</motion.button>
            </div>
          </div>
          )}

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <AnimatePresence mode="wait">
              <motion.button
                key={justAdded ? 'added' : 'cart'}
                onClick={handleAddToCart}
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                whileHover={!justAdded ? { boxShadow: '0 8px 28px rgba(202,138,4,0.55)' } : {}}
                whileTap={{ scale: 0.97 }}
                disabled={!product.in_stock}
                style={{ flex: 1, minWidth: 160, background: justAdded ? '#059669' : 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)', color: 'white', border: 'none', padding: '16px 24px', borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.07em', cursor: product.in_stock ? 'pointer' : 'not-allowed', textTransform: 'uppercase', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: product.in_stock ? 1 : 0.5, boxShadow: '0 4px 18px rgba(202,138,4,0.32)' }}>
                {justAdded
                  ? <><i className="fa-solid fa-check" /> Added to Cart!</>
                  : <><i className="fa-solid fa-cart-plus" /> Add to Cart</>}
              </motion.button>
            </AnimatePresence>

            <motion.button onClick={handleBuyNow}
              whileHover={{ borderColor: 'var(--gold)', color: 'var(--gold)', boxShadow: '0 4px 18px rgba(202,138,4,0.2)' }}
              whileTap={{ scale: 0.97 }}
              disabled={!product.in_stock}
              style={{ flex: 1, minWidth: 160, background: 'transparent', color: 'var(--heading)', border: '2px solid var(--heading)', padding: '16px 24px', borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.07em', cursor: product.in_stock ? 'pointer' : 'not-allowed', textTransform: 'uppercase', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: product.in_stock ? 1 : 0.5, transition: 'all 0.22s' }}>
              <i className="fa-solid fa-bolt" /> Buy Now
            </motion.button>
          </div>

          {/* Trust mini-bar */}
          <div className="kr-detail-trust">
            {[
              { icon: 'fa-truck-fast', label: 'Free Shipping', sub: 'Orders over $75' },
              { icon: 'fa-rotate-left', label: 'Easy Returns', sub: '30-day policy' },
              { icon: 'fa-lock', label: 'Secure Payment', sub: '256-bit SSL' },
            ].map(t => (
              <div key={t.icon} style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--white)', borderRadius: 14, boxShadow: '0 1px 8px rgba(9,52,89,0.06)' }}>
                <i className={`fa-solid ${t.icon}`} style={{ color: 'var(--teal)', fontSize: 18, marginBottom: 6, display: 'block' }} />
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--heading)', marginBottom: 2 }}>{t.label}</p>
                <p style={{ fontSize: 10, color: 'var(--text-light)' }}>{t.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 6 }}>More Like This</p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(22px, 2.5vw, 34px)', fontWeight: 900, color: 'var(--heading)' }}>Related Products</h2>
            </div>
            <Link href="/#products" style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', borderBottom: '2px solid var(--teal)', paddingBottom: 2, textDecoration: 'none' }}>
              View All <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24 }}>
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </motion.div>
      )}

      <BuyNowModal
        open={showBuyNowModal}
        onClose={() => setShowBuyNowModal(false)}
        onSuccess={() => { setShowBuyNowModal(false); setCartOpen(true) }}
      />
    </div>
  )
}
