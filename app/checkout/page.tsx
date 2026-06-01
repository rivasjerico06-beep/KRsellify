'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PayPalButtons, usePayPalScriptReducer, FUNDING } from '@paypal/react-paypal-js'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart, updateQty, removeFromCart, showToast } = useCart()
  const { user, session } = useAuth()
  const router = useRouter()
  const [{ isPending: paypalLoading, isRejected: paypalFailed }] = usePayPalScriptReducer()

  const [email, setEmail] = useState('')
  const [editingEmail, setEditingEmail] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMsg, setCouponMsg] = useState('')
  const [validating, setValidating] = useState(false)
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
      setEditingEmail(false)
    }
  }, [user])

  useEffect(() => {
    if (cart.length === 0 && !placing) {
      router.push('/')
    }
  }, [cart.length, placing, router])

  const discountAmount = couponDiscount > 0 ? cartTotal * (couponDiscount / 100) : 0
  const finalTotal = cartTotal - discountAmount

  async function validateCoupon() {
    if (!couponCode.trim()) return
    setValidating(true)
    setCouponMsg('')
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ code: couponCode.trim(), cart_total: cartTotal }),
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

  async function createPayPalOrder() {
    if (!email.trim()) throw new Error('Please enter your email address')
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        items: cart.map(i => ({ id: i.id, qty: i.qty, bundle_label: i.bundle_label })),
        coupon_code: couponDiscount > 0 ? couponCode.trim() : undefined,
      }),
    })
    const data = await res.json()
    if (!data.id) throw new Error(data.error ?? 'Failed to create PayPal order')
    return data.id as string
  }

  async function onPayPalApprove(paypalOrderId: string) {
    setPlacing(true)
    const res = await fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        paypal_order_id: paypalOrderId,
        items: cart,
        total: finalTotal,
        discount_amount: discountAmount,
        coupon_code: couponDiscount > 0 ? couponCode.trim() : undefined,
        guest_email: !user ? email.trim() : undefined,
      }),
    })

    const order = await res.json()
    if (!res.ok) {
      showToast(`Payment error: ${order.error ?? 'Unknown error'}`)
      setPlacing(false)
      return
    }

    try {
      localStorage.setItem('krsellify_last_order', JSON.stringify({
        id: order.id ?? '',
        total: finalTotal,
        discount: discountAmount,
        itemCount: cart.reduce((s, i) => s + i.qty, 0),
        items: cart.map(i => ({ name: i.name, price: i.price, qty: i.qty, img: i.img })),
      }))
    } catch {}

    clearCart()
    setPlacing(false)
    router.push('/order-success')
  }

  function handlePayPalError(err: unknown) {
    const msg = typeof err === 'object' && err !== null && 'message' in err
      ? (err as { message: string }).message : String(err)
    showToast(`Payment error: ${msg || 'Please try again.'}`)
    setPlacing(false)
  }

  const emailMissing = !email.trim()

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f2' }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px' }}>
        <span style={{ fontSize: 13, color: '#888' }}>
          <Link href="/" style={{ color: '#0070ba', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <Link href="/shop" style={{ color: '#0070ba', textDecoration: 'none' }}>Store</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <span style={{ color: '#444' }}>Shopping cart</span>
        </span>
      </div>

      <div className="kr-checkout-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32, alignItems: 'start' }}>

        {/* ── LEFT: Cart items ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 20 }}>Shopping cart</h1>

          {/* Items list */}
          <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', overflow: 'hidden', marginBottom: 20 }}>
            {cart.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', gap: 16, padding: '18px 20px', borderBottom: idx < cart.length - 1 ? '1px solid #eee' : 'none', alignItems: 'flex-start' }}>
                {/* Image */}
                <div style={{ position: 'relative', width: 72, height: 72, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid #eee', background: '#fafafa' }}>
                  <Image src={item.img} alt={item.name} fill style={{ objectFit: 'cover' }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 3, lineHeight: 1.35 }}>{item.name}</div>
                  {item.bundle_label && (
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Quantity: {item.bundle_label}</div>
                  )}
                  {/* Qty controls */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 1, border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                    <button onClick={() => updateQty(item.id, -1)}
                      style={{ background: '#f5f5f5', border: 'none', width: 28, height: 28, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      −
                    </button>
                    <span style={{ padding: '0 12px', fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap' }}>
                      Qty: {item.qty}
                    </span>
                    <button onClick={() => updateQty(item.id, 1)}
                      style={{ background: '#f5f5f5', border: 'none', width: 28, height: 28, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      +
                    </button>
                  </div>
                </div>

                {/* Price + remove */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => removeFromCart(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 20, lineHeight: 1, padding: 0 }}
                    aria-label="Remove item">
                    ×
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>
                    ${((item.bundle_price ?? item.price) * item.qty).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '2px solid #222', marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#111', letterSpacing: '0.06em', textTransform: 'uppercase' }}>TOTAL</span>
            <div style={{ textAlign: 'right' }}>
              {discountAmount > 0 && (
                <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 2 }}>
                  −${discountAmount.toFixed(2)} discount applied
                </div>
              )}
              <span style={{ fontSize: 22, fontWeight: 900, color: '#111' }}>
                ${finalTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </span>
            </div>
          </div>

          {/* Coupon code */}
          <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 12 }}>Apply a promo coupon</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid #ddd', borderRadius: 6 }}>
              <i className="fa-solid fa-tag" style={{ color: '#aaa', fontSize: 14 }} />
              <span style={{ fontSize: 13, color: '#555', flex: 1 }}>Coupon code</span>
              <input
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value); setCouponDiscount(0); setCouponMsg('') }}
                placeholder="Enter code…"
                onKeyDown={e => e.key === 'Enter' && validateCoupon()}
                style={{ border: '1px solid #ddd', borderRadius: 4, padding: '7px 10px', fontSize: 13, outline: 'none', width: 130 }}
              />
              <button
                onClick={validateCoupon}
                disabled={validating || !couponCode.trim()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0070ba', fontSize: 13, fontWeight: 700, padding: '7px 4px', opacity: (!couponCode.trim() || validating) ? 0.45 : 1 }}>
                {validating ? '…' : 'Redeem'}
              </button>
            </div>
            {couponMsg && (
              <p style={{ fontSize: 13, fontWeight: 600, color: couponDiscount > 0 ? '#059669' : '#dc2626', marginTop: 8 }}>
                <i className={`fa-solid ${couponDiscount > 0 ? 'fa-check' : 'fa-xmark'}`} style={{ marginRight: 4 }} />
                {couponMsg}
              </p>
            )}
          </div>

          <p style={{ fontSize: 13, color: '#888' }}>
            Looking for more?{' '}
            <Link href="/shop" style={{ color: '#0070ba', fontWeight: 600 }}>Continue shopping</Link>
          </p>
        </motion.div>

        {/* ── RIGHT: Checkout panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', padding: 28 }}>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 16 }}>Checkout</h2>

          {/* Email section */}
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: user && !editingEmail ? 4 : 14 }}>
            Order status updates will be sent to the email address specified in your account.
          </p>

          {user && !editingEmail ? (
            <>
              <button
                onClick={() => setEditingEmail(true)}
                style={{ background: 'none', border: 'none', color: '#0070ba', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 12, display: 'block' }}>
                Change email
              </button>
              <div style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '13px 16px', fontSize: 14, color: '#111', background: '#fafafa', marginBottom: 20, wordBreak: 'break-all' }}>
                {email}
              </div>
            </>
          ) : (
            <>
              {user && (
                <button
                  onClick={() => { setEditingEmail(false); setEmail(user.email ?? '') }}
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: 0, marginBottom: 8, display: 'block' }}>
                  ← Cancel
                </button>
              )}
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address *"
                required
                style={{ width: '100%', border: `1.5px solid ${emailMissing ? '#f5a623' : '#ddd'}`, borderRadius: 6, padding: '13px 16px', fontSize: 14, color: '#111', background: 'white', marginBottom: 20, outline: 'none', boxSizing: 'border-box' }}
              />
            </>
          )}

          {/* Payment buttons */}
          {emailMissing && (
            <div style={{ background: '#fff8e6', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#92400e', textAlign: 'center' }}>
              <i className="fa-solid fa-envelope" style={{ marginRight: 6 }} />
              Enter your email above to receive your order confirmation
            </div>
          )}

          {placing ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#555', fontSize: 15, fontWeight: 600 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8, color: '#0070ba' }} />
              Processing payment…
            </div>
          ) : paypalLoading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#888', fontSize: 13 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />
              Loading payment options…
            </div>
          ) : paypalFailed ? (
            <div style={{ textAlign: 'center', padding: '12px', color: '#dc2626', fontSize: 13, background: '#fef2f2', borderRadius: 8 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
              Payment failed to load. Please refresh.
            </div>
          ) : (
            <>
              {/* PayPal Checkout */}
              <PayPalButtons
                fundingSource={FUNDING.PAYPAL}
                style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'checkout', height: 50 }}
                disabled={placing}
                forceReRender={[finalTotal, cart.length, email]}
                onClick={(_, actions) => {
                  if (!email.trim()) {
                    showToast('Please enter your email address first')
                    return actions.reject()
                  }
                  return actions.resolve()
                }}
                createOrder={createPayPalOrder}
                onApprove={async (data) => { await onPayPalApprove(data.orderID) }}
                onError={handlePayPalError}
                onCancel={() => showToast('Payment cancelled.')}
              />

              <div style={{ height: 10 }} />

              {/* Debit or Credit Card */}
              <PayPalButtons
                fundingSource={FUNDING.CARD}
                style={{ layout: 'vertical', shape: 'rect', height: 50 }}
                disabled={placing}
                forceReRender={[finalTotal, cart.length, email]}
                onClick={(_, actions) => {
                  if (!email.trim()) {
                    showToast('Please enter your email address first')
                    return actions.reject()
                  }
                  return actions.resolve()
                }}
                createOrder={createPayPalOrder}
                onApprove={async (data) => { await onPayPalApprove(data.orderID) }}
                onError={handlePayPalError}
                onCancel={() => showToast('Payment cancelled.')}
              />

            </>
          )}

          {/* Security footer */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginTop: 14, marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic', whiteSpace: 'nowrap' }}>Powered by PayPal</span>
            <span style={{ fontSize: 11, color: '#aaa', textAlign: 'right', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <i className="fa-solid fa-lock" style={{ fontSize: 10, marginTop: 2, flexShrink: 0 }} />
              All data is transmitted encrypted via a secure TLS connection
            </span>
          </div>

          {/* Next steps */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 0 }}>Next</p>

            <div style={{ borderTop: '1px solid #eee', marginTop: 14, paddingTop: 14, marginBottom: 14 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 4 }}>Payment information</p>
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.55 }}>Choose a payment method and enter your payment details.</p>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 4 }}>Order confirmation</p>
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.55 }}>Place your order and receive a confirmation email.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
