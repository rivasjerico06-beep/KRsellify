'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PayPalButtons, usePayPalScriptReducer, FUNDING } from '@paypal/react-paypal-js'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart, updateQty, removeFromCart, changeBundleTier, showToast } = useCart()
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
  const [emailShake, setEmailShake] = useState(false)
  const [productOptions, setProductOptions] = useState<Record<string, { label: string; qty: number; bundle_total: number }[]>>({})
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then((products: { id: string; quantity_options?: { label: string; qty: number; bundle_total: number }[] | null }[]) => {
        const map: Record<string, { label: string; qty: number; bundle_total: number }[]> = {}
        for (const p of products) {
          if (p.quantity_options?.length) map[p.id] = p.quantity_options
        }
        setProductOptions(map)
      })
      .catch(() => {})
  }, [])

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
      localStorage.setItem('themaga_last_order', JSON.stringify({
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
    <div style={{ minHeight: '100vh', background: '#f0f0f0' }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '16px 24px' }}>
        <span style={{ fontSize: 15, color: '#666' }}>
          <Link href="/" style={{ color: '#0070ba', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
          <span style={{ margin: '0 8px', color: '#aaa' }}>/</span>
          <Link href="/shop" style={{ color: '#0070ba', textDecoration: 'none', fontWeight: 600 }}>Store</Link>
          <span style={{ margin: '0 8px', color: '#aaa' }}>/</span>
          <span style={{ color: '#444', fontWeight: 600 }}>Shopping cart</span>
        </span>
      </div>

      <div className="mo-checkout-grid" style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px 100px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 28, alignItems: 'start' }}>

        {/* ── LEFT: Cart items ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#111', marginBottom: 20 }}>Your Cart</h1>

          {/* Items list */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ddd', overflow: 'hidden', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {cart.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', gap: 18, padding: '22px 24px', borderBottom: idx < cart.length - 1 ? '1px solid #eee' : 'none', alignItems: 'flex-start' }}>

                {/* Image */}
                <div style={{ position: 'relative', width: 100, height: 100, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid #eee', background: '#fafafa' }}>
                  <Image src={item.img} alt={item.name} fill style={{ objectFit: 'cover' }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 17, color: '#111', marginBottom: 8, lineHeight: 1.4 }}>{item.name}</div>

                  {/* Bundle dropdown */}
                  {(() => {
                    const opts = productOptions[item.id] ?? item.quantity_options ?? []
                    if (opts.length === 0) return null
                    return (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Bundle / Quantity
                        </label>
                        <select
                          value={item.bundle_label ?? ''}
                          onChange={e => {
                            const opt = opts.find(o => o.label === e.target.value)
                            if (opt) changeBundleTier(item.id, opt.label, opt.qty, opt.bundle_total)
                          }}
                          style={{ fontSize: 15, color: '#111', border: '2px solid #ddd', borderRadius: 8, padding: '10px 14px', background: 'white', cursor: 'pointer', width: '100%', maxWidth: 340, height: 46 }}>
                          {!item.bundle_label && <option value="">— Choose a bundle —</option>}
                          {opts.map(opt => (
                            <option key={opt.label} value={opt.label}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })()}

                  {/* Sets counter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#555', marginRight: 12 }}>
                      {item.bundle_label ? 'Sets:' : 'Qty:'}
                    </span>
                    <button onClick={() => updateQty(item.id, -1)}
                      style={{ background: '#f0f0f0', border: '2px solid #ddd', width: 48, height: 48, borderRadius: '8px 0 0 8px', cursor: 'pointer', fontSize: 22, fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      −
                    </button>
                    <span style={{ padding: '0 20px', fontSize: 18, fontWeight: 800, color: '#111', border: '2px solid #ddd', borderLeft: 'none', borderRight: 'none', height: 48, display: 'flex', alignItems: 'center', minWidth: 60, justifyContent: 'center', background: 'white' }}>
                      {item.qty}
                    </span>
                    <button onClick={() => updateQty(item.id, 1)}
                      style={{ background: '#f0f0f0', border: '2px solid #ddd', width: 48, height: 48, borderRadius: '0 8px 8px 0', cursor: 'pointer', fontSize: 22, fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      +
                    </button>
                  </div>
                </div>

                {/* Price + remove */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0, minWidth: 120 }}>
                  <button onClick={() => removeFromCart(item.id)}
                    style={{ background: '#fff0f0', border: '1.5px solid #fca5a5', borderRadius: 8, cursor: 'pointer', color: '#dc2626', fontSize: 13, fontWeight: 700, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 5 }}
                    aria-label="Remove item">
                    <i className="fa-solid fa-trash-can" style={{ fontSize: 12 }} /> Remove
                  </button>
                  <span style={{ fontWeight: 800, fontSize: 20, color: '#111' }}>
                    ${((item.bundle_price ?? item.price) * item.qty).toFixed(2)}
                  </span>
                  {item.bundle_label && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                      <i className="fa-solid fa-box-open" style={{ fontSize: 12 }} />
                      You receive: {(item.bundle_qty ?? 1) * item.qty} pcs
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total row */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ddd', padding: '20px 24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '0.04em' }}>ORDER TOTAL</span>
              <div style={{ textAlign: 'right' }}>
                {discountAmount > 0 && (
                  <div style={{ fontSize: 14, color: '#059669', fontWeight: 700, marginBottom: 4 }}>
                    −${discountAmount.toFixed(2)} discount applied
                  </div>
                )}
                <span style={{ fontSize: 32, fontWeight: 900, color: '#111' }}>
                  ${finalTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </span>
              </div>
            </div>

            {/* Per-product breakdown */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cart.map(item => {
                const pcs = (item.bundle_qty ?? 1) * item.qty
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, color: '#333', fontWeight: 600, paddingRight: 12 }}>{item.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      {item.bundle_label && (
                        <span style={{ fontSize: 15, color: '#059669', fontWeight: 800 }}>{pcs} pcs</span>
                      )}
                      <span style={{ fontSize: 14, color: '#888', fontWeight: 600 }}>
                        ×{item.qty} {item.bundle_label ? 'set' : 'pc'}{item.qty > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e5e7eb', paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontSize: 16, color: '#111', fontWeight: 800 }}>Total pieces you will receive</span>
                <span style={{ fontSize: 18, color: '#059669', fontWeight: 900 }}>{cart.reduce((s, i) => s + (i.bundle_qty ?? 1) * i.qty, 0)} pcs</span>
              </div>
            </div>
          </div>

          {/* Coupon code */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #ddd', padding: '20px 24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#111', marginBottom: 14 }}>
              <i className="fa-solid fa-tag" style={{ marginRight: 8, color: '#0070ba' }} />
              Have a promo code?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value); setCouponDiscount(0); setCouponMsg('') }}
                placeholder="Enter promo code…"
                onKeyDown={e => e.key === 'Enter' && validateCoupon()}
                style={{ flex: 1, border: '2px solid #ddd', borderRadius: 8, padding: '13px 16px', fontSize: 16, outline: 'none', color: '#111' }}
              />
              <button
                onClick={validateCoupon}
                disabled={validating || !couponCode.trim()}
                style={{ background: '#0070ba', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'white', fontSize: 15, fontWeight: 700, padding: '13px 22px', opacity: (!couponCode.trim() || validating) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                {validating ? '…' : 'Apply'}
              </button>
            </div>
            {couponMsg && (
              <p style={{ fontSize: 15, fontWeight: 700, color: couponDiscount > 0 ? '#059669' : '#dc2626', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`fa-solid ${couponDiscount > 0 ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                {couponMsg}
              </p>
            )}
          </div>

          <p style={{ fontSize: 15, color: '#888' }}>
            Want to add more items?{' '}
            <Link href="/shop" style={{ color: '#0070ba', fontWeight: 700, fontSize: 15 }}>Continue shopping</Link>
          </p>
        </motion.div>

        {/* ── RIGHT: Checkout panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          style={{ background: 'white', borderRadius: 12, border: '1px solid #ddd', padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 6 }}>Checkout</h2>
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7, marginBottom: 20 }}>
            We'll send your order updates and shipping info to this email. No account needed.
          </p>

          {/* Email section */}
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#444', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Email for Order Updates
          </label>

          {user && !editingEmail ? (
            <>
              <div style={{ width: '100%', border: '2px solid #ddd', borderRadius: 8, padding: '15px 18px', fontSize: 16, color: '#111', background: '#fafafa', marginBottom: 10, wordBreak: 'break-all', lineHeight: 1.4 }}>
                {email}
              </div>
              <button
                onClick={() => setEditingEmail(true)}
                style={{ background: 'none', border: 'none', color: '#0070ba', cursor: 'pointer', fontSize: 15, fontWeight: 700, padding: 0, marginBottom: 24, display: 'block' }}>
                <i className="fa-solid fa-pen" style={{ marginRight: 6, fontSize: 13 }} />Change email
              </button>
            </>
          ) : (
            <>
              {user && (
                <button
                  onClick={() => { setEditingEmail(false); setEmail(user.email ?? '') }}
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 10, display: 'block', fontWeight: 600 }}>
                  ← Cancel
                </button>
              )}
              <motion.div
                animate={emailShake ? { x: [0, -8, 8, -8, 8, -4, 4, 0] } : {}}
                transition={{ duration: 0.45 }}
                onAnimationComplete={() => setEmailShake(false)}
              >
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@email.com"
                  required
                  style={{ width: '100%', border: `2px solid ${emailShake ? '#ef4444' : emailMissing ? '#f59e0b' : '#ddd'}`, borderRadius: 8, padding: '15px 18px', fontSize: 16, color: '#111', background: emailShake ? '#fff5f5' : 'white', marginBottom: 24, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s' }}
                />
              </motion.div>
            </>
          )}

          {/* Payment buttons */}
          {placing ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#555', fontSize: 17, fontWeight: 700 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 10, color: '#0070ba', fontSize: 20 }} />
              Processing your payment…
            </div>
          ) : paypalLoading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#888', fontSize: 15 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
              Loading payment options…
            </div>
          ) : paypalFailed ? (
            <div style={{ textAlign: 'center', padding: '16px', color: '#dc2626', fontSize: 15, background: '#fef2f2', borderRadius: 10, fontWeight: 600 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
              Payment failed to load. Please refresh the page.
            </div>
          ) : (
            <>
              <PayPalButtons
                fundingSource={FUNDING.CARD}
                style={{ layout: 'vertical', shape: 'rect', height: 55 }}
                disabled={placing}
                forceReRender={[finalTotal, cart.length, email]}
                onClick={(_, actions) => {
                  if (!email.trim()) {
                    setEmailShake(true)
                    emailRef.current?.focus()
                    emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

          {/* Security note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <i className="fa-solid fa-lock" style={{ color: '#059669', fontSize: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5, fontWeight: 600 }}>
              Secure checkout — all data is encrypted via SSL
            </span>
          </div>

          {/* Steps */}
          <div style={{ borderTop: '1px solid #eee', marginTop: 24, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0070ba', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>1</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 3 }}>Enter your email</p>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>Order status updates and shipping info will be sent here.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0070ba', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>2</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 3 }}>Choose payment</p>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>Pay securely with your debit or credit card.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>✓</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 3 }}>Order confirmed!</p>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>Order status updates will be sent to your email.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
