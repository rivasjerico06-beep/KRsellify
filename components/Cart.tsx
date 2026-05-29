'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { getBrowserSupabase } from '@/lib/supabase-browser'

export default function Cart() {
  const { cart, cartOpen, setCartOpen, cartTotal, updateQty, removeFromCart, clearCart, showToast } = useCart()
  const { user } = useAuth()
  const router = useRouter()

  const [referralCode, setReferralCode] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMsg, setCouponMsg] = useState('')
  const [validating, setValidating] = useState(false)
  const [placing, setPlacing] = useState(false)

  const discountAmount = couponDiscount > 0 ? cartTotal * (couponDiscount / 100) : 0
  const finalTotal = cartTotal - discountAmount

  async function validateCoupon() {
    if (!couponCode.trim()) return
    setValidating(true)
    setCouponMsg('')
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode.trim(), cart_total: cartTotal, user_id: user?.id }),
    })
    const data = await res.json()
    if (data.valid) {
      setCouponDiscount(data.discount_pct)
      setCouponMsg(data.message)
    } else {
      setCouponDiscount(0)
      setCouponMsg(data.message)
    }
    setValidating(false)
  }

  async function checkout() {
    if (!cart.length) { showToast('Your cart is empty!'); return }

    if (!user) {
      setCartOpen(false)
      router.push('/login?next=checkout')
      return
    }

    setPlacing(true)
    const supabase = getBrowserSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    let orderData: { id?: string } | null = null
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          items: cart,
          total: finalTotal,
          discount_amount: discountAmount,
          referral_code: referralCode.trim() || undefined,
          coupon_code: couponDiscount > 0 ? couponCode.trim() : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        showToast(`Order failed: ${err.error ?? 'Unknown error'}`)
        setPlacing(false)
        return
      }
      orderData = await res.json().catch(() => null)
    } catch {
      showToast('Network error. Please try again.')
      setPlacing(false)
      return
    }
    try {
      localStorage.setItem('krsellify_last_order', JSON.stringify({
        id: orderData?.id ?? '',
        total: finalTotal,
        discount: discountAmount,
        itemCount: cart.reduce((s, i) => s + i.qty, 0),
        items: cart.map(i => ({ name: i.name, price: i.price, qty: i.qty, img: i.img })),
        referral_code: referralCode || undefined,
      }))
    } catch {}

    clearCart()
    setCartOpen(false)
    setCouponCode('')
    setCouponDiscount(0)
    setCouponMsg('')
    setReferralCode('')
    setPlacing(false)
    router.push('/order-success')
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
            className="kr-cart-panel"
            style={{ position: 'fixed', top: 0, right: 0, width: 440, maxWidth: '100vw', height: '100%', background: 'var(--white)', zIndex: 2001, boxShadow: '-4px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>

            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottom: '1px solid var(--gray)', background: 'var(--navy)', color: 'white' }}>
              <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fa-solid fa-cart-shopping" /> Your Cart
              </h3>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', opacity: 0.7 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <AnimatePresence>
                {cart.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-light)' }}>
                    <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4, color: 'var(--teal)' }}>
                      <i className="fa-solid fa-bag-shopping" />
                    </div>
                    <p>Your cart is empty</p>
                    <p style={{ fontSize: 13, marginTop: 6 }}>
                      Click the <i className="fa-solid fa-heart" style={{ color: 'var(--sale-red)' }} /> heart or Buy Now to add items!
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
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)', marginBottom: 4 }}>{item.name}</div>
                        <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 15 }}>${((item.bundle_price != null ? item.bundle_price : item.price) * item.qty).toFixed(2)}</div>
                        {item.bundle_label && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', marginBottom: 4, marginTop: 2 }}>
                            <i className="fa-solid fa-tag" style={{ marginRight: 4 }} />{item.bundle_label}
                          </div>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 600, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: item.via === 'heart' ? '#ffe0e0' : '#e0eef8', color: item.via === 'heart' ? '#c43e3e' : 'var(--navy)' }}>
                          <i className={`fa-solid ${item.via === 'heart' ? 'fa-heart' : 'fa-cart-shopping'}`} />
                          {item.via === 'heart' ? 'Added via heart' : 'Added via cart'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateQty(item.id, -1)} style={{ background: 'var(--gray)', border: 'none', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</motion.button>
                          <span>{item.qty}</span>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateQty(item.id, 1)} style={{ background: 'var(--gray)', border: 'none', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</motion.button>
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

            {/* footer */}
            <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--gray)' }}>
              {/* Referral code */}
              <div style={{ marginBottom: 10 }}>
                <input
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value)}
                  placeholder="Agent referral code (optional)"
                  style={{ width: '100%', border: '1.5px solid var(--gray)', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Coupon code */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponDiscount(0); setCouponMsg('') }}
                  placeholder="Coupon code"
                  style={{ flex: 1, border: '1.5px solid var(--gray)', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && validateCoupon()}
                />
                <button onClick={validateCoupon} disabled={validating || !couponCode.trim()}
                  style={{ background: 'var(--teal)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (!couponCode.trim() || validating) ? 0.5 : 1 }}>
                  {validating ? '…' : 'Apply'}
                </button>
              </div>

              {couponMsg && (
                <p style={{ fontSize: 12, fontWeight: 600, color: couponDiscount > 0 ? '#059669' : '#dc2626', marginBottom: 10 }}>
                  <i className={`fa-solid ${couponDiscount > 0 ? 'fa-tag' : 'fa-xmark'}`} style={{ marginRight: 5 }} />
                  {couponMsg}
                </p>
              )}

              {/* Totals */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-mid)', marginBottom: 4 }}>
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#059669', fontWeight: 600, marginBottom: 4 }}>
                    <span>Discount ({couponDiscount}% off)</span>
                    <span>−${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-mid)' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 700, color: 'var(--heading)' }}>${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {!user && (
                <p style={{ fontSize: 12, color: 'var(--text-mid)', textAlign: 'center', marginBottom: 8 }}>
                  <i className="fa-solid fa-lock" style={{ marginRight: 5, color: 'var(--teal)' }} />
                  You&apos;ll be asked to sign in before placing your order.
                </p>
              )}

              <motion.button onClick={checkout} disabled={placing} whileHover={{ background: 'var(--teal)' }} whileTap={{ scale: 0.98 }}
                style={{ width: '100%', background: 'var(--navy)', color: 'white', border: 'none', padding: 16, borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', opacity: placing ? 0.7 : 1 }}>
                {placing ? 'Placing Order…' : (user ? 'Proceed to Checkout' : 'Sign In to Checkout')}
                {!placing && <i className="fa-solid fa-arrow-right" />}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
