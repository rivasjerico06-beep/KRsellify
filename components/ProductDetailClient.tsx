'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useSiteConfig } from '@/context/SiteConfigContext'
import { useFlyToCart } from '@/components/FlyToCart'
import { usePayLinkConfig } from '@/lib/use-pay-link'
import { Product } from '@/lib/types'
import ProductCard from './ProductCard'
import BuyNowModal from './BuyNowModal'

const FEATURES: Record<string, string[]> = {
  medallions:   ['Premium gold-tone alloy finish', 'Limited edition — numbered mint', 'Arrives in collector\'s gift box', 'Certificate of authenticity included', 'Ships worldwide in 10–15 days'],
  collectibles: ['Museum-quality craftsmanship', 'Limited edition collectible', 'Premium display packaging', 'Certificate of authenticity included', 'Ships worldwide in 10–15 days'],
  crypto:       ['Crypto-themed commemorative piece', 'Collector-grade detailing', 'Premium metal alloy construction', 'Arrives in luxury gift packaging', 'Ships worldwide in 10–15 days'],
  apparel:      ['Premium quality fabric', 'Limited edition design', 'Comfortable everyday wear', 'Available in multiple sizes', 'Ships worldwide in 10–15 days'],
  accessories:  ['Premium materials throughout', 'Unique collector\'s item', 'Elegant gift packaging', 'Certificate of authenticity included', 'Ships worldwide in 10–15 days'],
}

const PRODUCT_FEATURE_OVERRIDES: Record<string, string[]> = {
  'maga offers priority pass': [],
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
  const { cart, addToCart, addBundle, clearCart, heartToggle, showToast, setCartOpen } = useCart()
  const { user, isApprovedAgent, agentProfile } = useAuth()
  const { freeShippingText } = useSiteConfig().site_identity
  const { flyToCart } = useFlyToCart()
  const router = useRouter()
  // One-product-at-a-time mode: each pay link is priced for a single product,
  // so a stacked cart could never match one. Null while the config loads —
  // the cart button only appears once we know it is allowed.
  const payLinkCfg = usePayLinkConfig()
  const oneAtATime = payLinkCfg?.hideAddToCart === true
  const showAddToCart = payLinkCfg !== null && !payLinkCfg.hideAddToCart
  const showPromos = payLinkCfg !== null && !payLinkCfg.hidePromos
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const [qty, setQty] = useState(1)
  const [selectedTierIdx, setSelectedTierIdx] = useState(0)
  const [activeImg, setActiveImg] = useState(0)
  const [justAdded, setJustAdded] = useState(false)
  const [showBuyNowModal, setShowBuyNowModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const inCart = cart.some(i => i.id === product.id && i.via === 'heart')
  const hasTiers = !!(product.quantity_options && product.quantity_options.length > 0)
  const selectedTier = hasTiers ? product.quantity_options![selectedTierIdx] : null
  const agentCode = agentProfile?.agent_code ?? null
  const isAgentMode = !!isApprovedAgent && !!agentCode

  // Pre-select the quantity/tier passed in from an agent's generated link
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const t = parseInt(sp.get('tier') ?? '', 10)
    const q = parseInt(sp.get('qty') ?? '', 10)
    if (hasTiers && product.quantity_options && !Number.isNaN(t) && t >= 0 && t < product.quantity_options.length) {
      setSelectedTierIdx(t)
    } else if (!hasTiers && !Number.isNaN(q) && q >= 1) {
      setQty(Math.min(99, q))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const images = product.images?.length ? product.images : [product.img]
  const savings = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0
  const features = PRODUCT_FEATURE_OVERRIDES[product.name.toLowerCase()] ?? FEATURES[product.category] ?? FEATURES.collectibles

  function handleAddToCart() {
    if (selectedTier) {
      addBundle(product, selectedTier.label, selectedTier.qty, selectedTier.bundle_total)
    } else {
      for (let i = 0; i < qty; i++) addToCart(product, 'btn')
    }
    if (addBtnRef.current) flyToCart(addBtnRef.current, product.img)
    showToast(`✓ ${product.name} added to cart`)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1400)
  }

  function handleBuyNow() {
    // In one-at-a-time mode the cart is replaced, not appended to: leftovers
    // from an earlier visit would push the total off the pay link's amount.
    if (oneAtATime) clearCart()
    if (selectedTier) {
      addBundle(product, selectedTier.label, selectedTier.qty, selectedTier.bundle_total)
    } else {
      for (let i = 0; i < qty; i++) addToCart(product, 'btn')
    }
    if (oneAtATime) router.push('/checkout')
    else setCartOpen(true)
  }

  function handleHeart() {
    heartToggle(product)
    showToast(inCart ? 'Removed from wishlist' : `❤️ ${product.name} added to wishlist!`)
  }

  function buildAgentLink() {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const p = new URLSearchParams({ ref: agentCode ?? '', add: String(product.id) })
    if (hasTiers) p.set('tier', String(selectedTierIdx))
    else p.set('qty', String(qty))
    return `${base}/r?${p.toString()}`
  }

  function copyAgentLink() {
    navigator.clipboard.writeText(buildAgentLink()).catch(() => {})
    setShowLink(true)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', padding: '32px 28px 80px' }}>
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontSize: 14, color: 'var(--text-light)', flexWrap: 'wrap' }}>
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
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 10 }}>
            {product.cat_label}
          </p>

          {/* Name */}
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, color: 'var(--heading)', lineHeight: 1.15, marginBottom: 16 }}>
            {product.name}
          </h1>

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Stars rating={product.rating} large />
            <span style={{ fontSize: 15, color: 'var(--text-mid)', fontWeight: 600 }}>{product.rating}.0</span>
            <span style={{ fontSize: 14, color: 'var(--text-light)' }}>({product.reviews_count} reviews)</span>
          </div>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16, padding: '20px 24px', background: 'var(--white)', borderRadius: 16, boxShadow: '0 2px 12px rgba(9,52,89,0.07)' }}>
            <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 46, fontWeight: 700, color: 'var(--heading)', lineHeight: 1 }}>
              ${product.price.toFixed(2)}
            </span>
            {product.old_price && (
              <>
                <span style={{ fontSize: 20, color: 'var(--text-light)', textDecoration: 'line-through' }}>${product.old_price.toFixed(2)}</span>
                <span style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--sale-red)', fontSize: 14, fontWeight: 700, padding: '5px 12px', borderRadius: 50 }}>
                  You save ${(product.old_price - product.price).toFixed(2)}
                </span>
              </>
            )}
          </div>

          {/* VIP savings callout */}
          {showPromos && (
          <Link href="/vip" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(90deg, #0f2441 0%, #1a3a5c 100%)', borderRadius: 14, padding: '14px 20px', textDecoration: 'none', marginBottom: 24, border: '1px solid rgba(77,217,184,0.2)' }}>
            <i className="fa-solid fa-crown" style={{ color: '#fbbf24', fontSize: 20, flexShrink: 0 }} />
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>
                VIP Members pay <strong style={{ color: '#4dd9b8' }}>${(product.price * 0.7).toFixed(2)}</strong>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400, marginLeft: 6 }}>— save ${(product.price * 0.3).toFixed(2)}</span>
              </p>
              <p style={{ color: '#4dd9b8', fontSize: 12, fontWeight: 600, margin: '3px 0 0' }}>
                Join VIP for $20/month → 30% off every order, always
              </p>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginLeft: 'auto', flexShrink: 0 }} />
          </Link>
          )}

          {/* Stock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: product.in_stock ? '#10b981' : '#ef4444', display: 'inline-block', boxShadow: product.in_stock ? '0 0 6px rgba(16,185,129,0.6)' : 'none' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: product.in_stock ? '#059669' : '#dc2626' }}>
              {product.in_stock ? 'In Stock — Ready to Ship' : 'Out of Stock'}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p style={{ fontSize: 17, lineHeight: 1.75, color: 'var(--text-mid)', marginBottom: 28 }}>
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
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, color: 'var(--text-mid)' }}>
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--teal)', fontSize: 15, flexShrink: 0 }} />
                {f}
              </motion.li>
            ))}
          </ul>

          {/* Quantity — tier chips or plain stepper */}
          {hasTiers ? (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-mid)', marginBottom: 12 }}>Select Quantity</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {product.quantity_options!.map((opt, i) => (
                  <motion.button key={i} onClick={() => setSelectedTierIdx(i)}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    style={{ padding: '14px 18px', borderRadius: 12, border: `2px solid ${selectedTierIdx === i ? 'var(--teal)' : 'var(--gray)'}`, background: selectedTierIdx === i ? 'rgba(88,148,143,0.1)' : 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit', fontSize: 15, fontWeight: selectedTierIdx === i ? 700 : 500, color: 'var(--text-dark)', textAlign: 'left', transition: 'border-color 0.2s, background 0.2s' }}>
                    <span>{opt.label}</span>
                    <span style={{ color: selectedTierIdx === i ? 'var(--teal)' : 'var(--text-mid)', fontWeight: 700, fontSize: 17, whiteSpace: 'nowrap', marginLeft: 12 }}>${opt.bundle_total.toFixed(2)}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Qty</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--white)', borderRadius: 50, border: '1.5px solid var(--gray)', overflow: 'hidden', boxShadow: '0 1px 6px rgba(9,52,89,0.06)' }}>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: 52, height: 52, border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</motion.button>
              <span style={{ width: 36, textAlign: 'center', fontSize: 17, fontWeight: 700, color: 'var(--heading)' }}>{qty}</span>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => setQty(q => q + 1)}
                style={{ width: 52, height: 52, border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</motion.button>
            </div>
          </div>
          )}

          {/* CTA — agents generate a customer link; shoppers add/buy */}
          {isAgentMode ? (
            <div style={{ marginBottom: 28, background: 'var(--white)', border: '2px solid var(--teal)', borderRadius: 16, padding: '20px 22px', boxShadow: '0 4px 20px rgba(9,52,89,0.08)' }}>
              <p style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--teal)', marginBottom: 6 }}>
                <i className="fa-solid fa-link" style={{ marginRight: 7 }} />Agent — Generate Customer Link
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 14, lineHeight: 1.5 }}>
                Choose the quantity above, then generate a link to send your customer. Their purchase is credited to <strong style={{ color: 'var(--heading)' }}>Agent {agentCode}</strong>.
              </p>
              <button onClick={copyAgentLink}
                disabled={!product.in_stock}
                style={{ width: '100%', background: 'linear-gradient(135deg, var(--teal) 0%, var(--teal-light) 100%)', color: 'white', border: 'none', padding: '16px 24px', borderRadius: 50, fontSize: 15, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: product.in_stock ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: product.in_stock ? 1 : 0.5 }}>
                <i className={`fa-solid ${linkCopied ? 'fa-check' : 'fa-link'}`} />
                {linkCopied ? 'Link Copied!' : 'Generate & Copy Link'}
              </button>
              {showLink && (
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <input readOnly value={buildAgentLink()} onFocus={e => e.currentTarget.select()}
                    style={{ flex: 1, border: '1.5px solid var(--gray)', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-dark)', background: 'var(--off-white)', outline: 'none', minWidth: 0 }} />
                  <button onClick={copyAgentLink}
                    style={{ background: 'var(--gray)', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--text-mid)', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    Copy
                  </button>
                </div>
              )}
            </div>
          ) : (
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            {showAddToCart && (
            <AnimatePresence mode="wait">
              <motion.button
                ref={addBtnRef}
                key={justAdded ? 'added' : 'cart'}
                onClick={handleAddToCart}
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                whileHover={!justAdded ? { boxShadow: '0 8px 28px rgba(202,138,4,0.55)' } : {}}
                whileTap={{ scale: 0.97 }}
                disabled={!product.in_stock}
                style={{ flex: 1, minWidth: 160, background: justAdded ? '#059669' : 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)', color: 'white', border: 'none', padding: '18px 24px', borderRadius: 50, fontSize: 16, fontWeight: 700, letterSpacing: '0.07em', cursor: product.in_stock ? 'pointer' : 'not-allowed', textTransform: 'uppercase', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: product.in_stock ? 1 : 0.5, boxShadow: '0 4px 18px rgba(202,138,4,0.32)' }}>
                {justAdded
                  ? <><i className="fa-solid fa-check" /> Added to Cart!</>
                  : <><i className="fa-solid fa-cart-plus" /> Add to Cart</>}
              </motion.button>
            </AnimatePresence>
            )}

            <motion.button onClick={handleBuyNow}
              whileHover={showAddToCart
                ? { borderColor: 'var(--gold)', color: 'var(--gold)', boxShadow: '0 4px 18px rgba(202,138,4,0.2)' }
                : { boxShadow: '0 8px 28px rgba(202,138,4,0.55)' }}
              whileTap={{ scale: 0.97 }}
              disabled={!product.in_stock}
              style={{
                flex: 1, minWidth: 160, padding: '18px 24px', borderRadius: 50, fontSize: 16, fontWeight: 700,
                letterSpacing: '0.07em', cursor: product.in_stock ? 'pointer' : 'not-allowed', textTransform: 'uppercase',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: product.in_stock ? 1 : 0.5, transition: 'all 0.22s',
                // Sole call to action when the cart button is hidden, so it takes the primary styling
                ...(showAddToCart
                  ? { background: 'transparent', color: 'var(--heading)', border: '2px solid var(--heading)' }
                  : { background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)', color: 'white', border: 'none', boxShadow: '0 4px 18px rgba(202,138,4,0.32)' }),
              }}>
              <i className="fa-solid fa-bolt" /> Buy Now
            </motion.button>
          </div>
          )}

          {/* Trust mini-bar */}
          <div className="mo-detail-trust">
            {[
              { icon: 'fa-truck-fast', label: 'Free Shipping', sub: `Orders ${freeShippingText}+` },
              { icon: 'fa-rotate-left', label: 'Easy Returns', sub: '30-day policy' },
              { icon: 'fa-lock', label: 'Secure Payment', sub: '256-bit SSL' },
            ].map(t => (
              <div key={t.icon} style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--white)', borderRadius: 14, boxShadow: '0 1px 8px rgba(9,52,89,0.06)' }}>
                <i className={`fa-solid ${t.icon}`} style={{ color: 'var(--teal)', fontSize: 18, marginBottom: 6, display: 'block' }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--heading)', marginBottom: 2 }}>{t.label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{t.sub}</p>
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
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 6 }}>More Like This</p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(22px, 2.5vw, 34px)', fontWeight: 900, color: 'var(--heading)' }}>Related Products</h2>
            </div>
            <Link href="/#products" style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 15, letterSpacing: '0.05em', borderBottom: '2px solid var(--teal)', paddingBottom: 2, textDecoration: 'none' }}>
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
