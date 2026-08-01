'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { usePayLinkConfig } from '@/lib/use-pay-link'

export default function Cart() {
  const { cart, cartOpen, setCartOpen, cartTotal, updateQty, removeFromCart } = useCart()
  const payLinkCfg = usePayLinkConfig()
  const showPromos = payLinkCfg !== null && !payLinkCfg.hidePromos
  const router = useRouter()

  function goToCheckout() {
    setCartOpen(false)
    router.push('/checkout')
  }

  return (
    <>
      <AnimatePresence>
        {cartOpen && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000 }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <motion.div key="panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="mo-cart-panel"
            style={{ position: 'fixed', top: 0, right: 0, width: 440, maxWidth: '100vw', height: '100%', background: 'var(--white)', zIndex: 2001, boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottom: '1px solid var(--gray)', background: 'var(--navy)', color: 'white' }}>
              <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fa-solid fa-cart-shopping" /> Your Cart
              </h3>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', opacity: 0.8, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

              {/* Items */}
              <div style={{ padding: 20 }}>
                <AnimatePresence>
                  {cart.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-light)' }}>
                      <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4, color: 'var(--teal)' }}>
                        <i className="fa-solid fa-bag-shopping" />
                      </div>
                      <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-mid)' }}>Your cart is empty</p>
                      <p style={{ fontSize: 15, marginTop: 8, color: 'var(--text-light)', lineHeight: 1.55 }}>
                        Tap the <i className="fa-solid fa-heart" style={{ color: 'var(--sale-red)' }} /> heart or <strong>Buy Now</strong> on any product to add items!
                      </p>
                    </motion.div>
                  ) : (
                    cart.map(item => (
                      <motion.div key={item.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30, height: 0, padding: 0, margin: 0 }} transition={{ duration: 0.25 }}
                        style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--gray)' }}>
                        <div style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                          <Image src={item.img} alt={item.name} fill style={{ objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)', marginBottom: 4 }}>{item.name}</div>
                          <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 15 }}>
                            ${((item.bundle_price != null ? item.bundle_price : item.price) * item.qty).toFixed(2)}
                          </div>
                          {item.bundle_label && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', marginBottom: 4, marginTop: 2 }}>
                              <i className="fa-solid fa-tag" style={{ marginRight: 4 }} />{item.bundle_label}
                            </div>
                          )}
                          {item.bundle_label && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 4 }}>
                              <i className="fa-solid fa-box-open" style={{ fontSize: 10 }} />
                              You receive: {(item.bundle_qty ?? 1) * item.qty} pcs total
                            </div>
                          )}
                          {/* How the item got here. The cart mixes two entry
                              points — the heart on a product card and Buy —
                              and without this pill a saved item and a bought
                              one look identical in the drawer. */}
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4,
                            borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                            background: item.via === 'heart' ? 'rgba(224,84,84,0.12)' : 'rgba(88,148,143,0.12)',
                            border: `1px solid ${item.via === 'heart' ? 'rgba(224,84,84,0.3)' : 'rgba(88,148,143,0.3)'}`,
                            color: item.via === 'heart' ? 'var(--sale-red)' : 'var(--teal)',
                          }}>
                            <i className={`fa-solid ${item.via === 'heart' ? 'fa-heart' : 'fa-cart-shopping'}`} style={{ fontSize: 10 }} />
                            {item.via === 'heart' ? 'Added via heart' : 'Added via cart'}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateQty(item.id, -1)} style={{ background: 'var(--gray)', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</motion.button>
                            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateQty(item.id, 1)} style={{ background: 'var(--gray)', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</motion.button>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontSize: 12, alignSelf: 'flex-start', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fa-solid fa-xmark" /> Remove
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div style={{ padding: '16px 20px 32px', borderTop: '1px solid var(--gray)' }}>
                  {/* Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-mid)' }}>Total</span>
                    <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 700, color: 'var(--heading)' }}>
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* VIP upsell */}
                  {showPromos && (
                  <Link href="/vip" onClick={() => setCartOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(90deg, #0f2441 0%, #1a3a5c 100%)', borderRadius: 14, padding: '13px 16px', textDecoration: 'none', marginBottom: 14, border: '1px solid rgba(77,217,184,0.2)' }}>
                    <i className="fa-solid fa-crown" style={{ color: '#fbbf24', fontSize: 18, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>
                        VIP saves you <strong style={{ color: '#4dd9b8' }}>${(cartTotal * 0.3).toFixed(2)}</strong> on this order
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, margin: '2px 0 0' }}>
                        Join VIP — $20/month, cancel anytime →
                      </p>
                    </div>
                  </Link>
                  )}

                  {/* Proceed to Checkout */}
                  <motion.button
                    onClick={goToCheckout}
                    whileHover={{ scale: 1.02, boxShadow: '0 8px 28px rgba(9,52,89,0.30)' }}
                    whileTap={{ scale: 0.97 }}
                    style={{ width: '100%', background: 'linear-gradient(135deg, var(--navy) 0%, #0e4a80 100%)', color: 'white', border: 'none', padding: '17px 24px', borderRadius: 50, fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', marginBottom: 12 }}>
                    <i className="fa-solid fa-credit-card" />
                    Proceed to Checkout
                    <i className="fa-solid fa-arrow-right" style={{ fontSize: 13 }} />
                  </motion.button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--text-light)' }}>
                    <i className="fa-solid fa-shield-halved" style={{ color: '#0070ba' }} />
                    Secure checkout — SSL encrypted
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
