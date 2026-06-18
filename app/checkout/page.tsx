'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart, updateQty, removeFromCart, changeBundleTier, showToast } = useCart()
  const { user, session } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [editingEmail, setEditingEmail] = useState(false)
  const [isVip, setIsVip] = useState(false)
  const [tipAmount, setTipAmount] = useState(0)
  const [customTipInput, setCustomTipInput] = useState('')
  const vipCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMsg, setCouponMsg] = useState('')
  const [validating, setValidating] = useState(false)
  const [emailShake, setEmailShake] = useState(false)
  const [productOptions, setProductOptions] = useState<Record<string, { label: string; qty: number; bundle_total: number }[]>>({})
  const emailRef = useRef<HTMLInputElement>(null)
  const paypalSucceeded = useRef(false)

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
    if (vipCheckRef.current) clearTimeout(vipCheckRef.current)
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) { setIsVip(false); return }
    vipCheckRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vip/check?email=${encodeURIComponent(trimmed)}`)
        const data = await res.json()
        setIsVip(data.is_vip ?? false)
      } catch { setIsVip(false) }
    }, 600)
    return () => { if (vipCheckRef.current) clearTimeout(vipCheckRef.current) }
  }, [email])

  useEffect(() => {
    if (cart.length === 0 && !paypalSucceeded.current) {
      router.push('/')
    }
  }, [cart.length, router])

  const vipDiscountAmount = isVip ? cartTotal * 0.3 : 0
  const afterVipTotal = cartTotal - vipDiscountAmount
  const couponDiscountAmount = couponDiscount > 0 ? afterVipTotal * (couponDiscount / 100) : 0
  const discountAmount = vipDiscountAmount + couponDiscountAmount
  const finalTotal = cartTotal - discountAmount
  const grandTotal = finalTotal + tipAmount

  function selectTip(amt: number) {
    const next = tipAmount === amt ? 0 : amt
    setTipAmount(next)
    setCustomTipInput(next === 0 ? '' : String(amt))
  }

  function handleCustomTip(val: string) {
    setCustomTipInput(val)
    const parsed = parseFloat(val)
    setTipAmount(!isNaN(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0)
  }

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

  function requireEmail() {
    if (!email.trim()) {
      setEmailShake(true)
      emailRef.current?.focus()
      emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setEmailShake(false), 600)
      return false
    }
    return true
  }

  const emailMissing = !email.trim()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '16px 24px' }}>
        <span style={{ fontSize: 15, color: 'var(--text-mid)' }}>
          <Link href="/" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
          <span style={{ margin: '0 8px', color: 'var(--text-light)' }}>/</span>
          <Link href="/shop" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Store</Link>
          <span style={{ margin: '0 8px', color: 'var(--text-light)' }}>/</span>
          <span style={{ color: 'var(--text-mid)', fontWeight: 600 }}>Shopping cart</span>
        </span>
      </div>

      <div className="mo-checkout-grid" style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px 100px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 28, alignItems: 'start' }}>

        {/* ── LEFT: Cart items ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 20 }}>Your Cart</h1>

          {/* Items list */}
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--gray)', overflow: 'hidden', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {cart.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', gap: 18, padding: '22px 24px', borderBottom: idx < cart.length - 1 ? '1px solid var(--gray)' : 'none', alignItems: 'flex-start' }}>

                {/* Image */}
                <div style={{ position: 'relative', width: 100, height: 100, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--gray)', background: 'var(--off-white)' }}>
                  <Image src={item.img} alt={item.name} fill style={{ objectFit: 'cover' }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-dark)', marginBottom: 8, lineHeight: 1.4 }}>{item.name}</div>

                  {/* Bundle dropdown */}
                  {(() => {
                    const opts = productOptions[item.id] ?? item.quantity_options ?? []
                    if (opts.length === 0) return null
                    return (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Bundle / Quantity
                        </label>
                        <select
                          value={item.bundle_label ?? ''}
                          onChange={e => {
                            const opt = opts.find(o => o.label === e.target.value)
                            if (opt) changeBundleTier(item.id, opt.label, opt.qty, opt.bundle_total)
                          }}
                          style={{ fontSize: 15, color: 'var(--text-dark)', border: '2px solid var(--gray)', borderRadius: 8, padding: '10px 14px', background: 'var(--white)', cursor: 'pointer', width: '100%', maxWidth: 340, height: 46 }}>
                          {!item.bundle_label && <option value="">— Choose a bundle —</option>}
                          {opts.map(opt => (
                            <option key={opt.label} value={opt.label}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })()}

                  {/* Qty counter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', marginRight: 12 }}>
                      {item.bundle_label ? 'Sets:' : 'Qty:'}
                    </span>
                    <button onClick={() => updateQty(item.id, -1)}
                      style={{ background: 'var(--gray)', border: '2px solid var(--gray)', width: 48, height: 48, borderRadius: '8px 0 0 8px', cursor: 'pointer', fontSize: 22, fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      −
                    </button>
                    <span style={{ padding: '0 20px', fontSize: 18, fontWeight: 800, color: 'var(--text-dark)', border: '2px solid var(--gray)', borderLeft: 'none', borderRight: 'none', height: 48, display: 'flex', alignItems: 'center', minWidth: 60, justifyContent: 'center', background: 'var(--white)' }}>
                      {item.qty}
                    </span>
                    <button onClick={() => updateQty(item.id, 1)}
                      style={{ background: 'var(--gray)', border: '2px solid var(--gray)', width: 48, height: 48, borderRadius: '0 8px 8px 0', cursor: 'pointer', fontSize: 22, fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-dark)' }}>
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
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--gray)', padding: '20px 24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '0.04em' }}>ORDER TOTAL</span>
              <div style={{ textAlign: 'right' }}>
                {isVip && (
                  <div style={{ fontSize: 14, color: '#d97706', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-crown" style={{ fontSize: 12 }} />
                    VIP 30% off — −${vipDiscountAmount.toFixed(2)}
                  </div>
                )}
                {couponDiscountAmount > 0 && (
                  <div style={{ fontSize: 14, color: '#059669', fontWeight: 700, marginBottom: 4 }}>
                    <i className="fa-solid fa-tag" style={{ marginRight: 5, fontSize: 12 }} />
                    Coupon −${couponDiscountAmount.toFixed(2)}
                  </div>
                )}
                {tipAmount > 0 && (
                  <div style={{ fontSize: 14, color: '#e11d48', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-heart" style={{ fontSize: 12 }} />
                    Tip +${tipAmount.toFixed(2)}
                  </div>
                )}
                <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-dark)' }}>
                  ${grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </span>
              </div>
            </div>

            {/* Per-product breakdown */}
            <div style={{ borderTop: '1px solid var(--gray)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cart.map(item => {
                const pcs = (item.bundle_qty ?? 1) * item.qty
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, color: 'var(--text-dark)', fontWeight: 600, paddingRight: 12 }}>{item.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      {item.bundle_label && (
                        <span style={{ fontSize: 15, color: '#059669', fontWeight: 800 }}>{pcs} pcs</span>
                      )}
                      <span style={{ fontSize: 14, color: 'var(--text-light)', fontWeight: 600 }}>
                        ×{item.qty} {item.bundle_label ? 'set' : 'pc'}{item.qty > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--gray)', paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontSize: 16, color: 'var(--text-dark)', fontWeight: 800 }}>Total pieces you will receive</span>
                <span style={{ fontSize: 18, color: '#059669', fontWeight: 900 }}>{cart.reduce((s, i) => s + (i.bundle_qty ?? 1) * i.qty, 0)} pcs</span>
              </div>

              {/* Tip Agent */}
              <div style={{ borderTop: '1px solid var(--gray)', paddingTop: 16, marginTop: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <i className="fa-solid fa-heart" style={{ color: '#e11d48', fontSize: 14 }} />
                  Tip your agent
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-light)' }}>(Optional)</span>
                </div>
                {/* Preset buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {[5, 10, 15, 20, 30].map(amt => {
                    const active = tipAmount === amt && customTipInput === String(amt)
                    return (
                      <button key={amt} onClick={() => selectTip(amt)}
                        style={{ border: `2px solid ${active ? 'var(--teal)' : 'var(--gray)'}`, borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: active ? 'var(--teal)' : 'var(--white)', color: active ? 'white' : 'var(--text-dark)', transition: 'all 0.15s' }}>
                        ${amt}
                      </button>
                    )
                  })}
                </div>
                {/* Custom amount */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>Custom amount:</span>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: 'var(--text-mid)', pointerEvents: 'none' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customTipInput}
                      onChange={e => handleCustomTip(e.target.value)}
                      placeholder="0.00"
                      style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 8, padding: '10px 14px 10px 28px', fontSize: 15, color: 'var(--text-dark)', background: 'var(--white)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  {tipAmount > 0 && (
                    <button onClick={() => { setTipAmount(0); setCustomTipInput('') }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 22, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
                      title="Remove tip">×</button>
                  )}
                </div>
                {tipAmount > 0 && (
                  <div style={{ marginTop: 10, fontSize: 14, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-circle-check" style={{ fontSize: 12 }} />
                    +${tipAmount.toFixed(2)} tip added — thank you!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coupon code */}
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--gray)', padding: '20px 24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 14 }}>
              <i className="fa-solid fa-tag" style={{ marginRight: 8, color: 'var(--teal)' }} />
              Have a promo code?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value); setCouponDiscount(0); setCouponMsg('') }}
                placeholder="Enter promo code…"
                onKeyDown={e => e.key === 'Enter' && validateCoupon()}
                style={{ flex: 1, border: '2px solid var(--gray)', borderRadius: 8, padding: '13px 16px', fontSize: 16, outline: 'none', color: 'var(--text-dark)', background: 'var(--white)' }}
              />
              <button
                onClick={validateCoupon}
                disabled={validating || !couponCode.trim()}
                style={{ background: 'var(--navy)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'white', fontSize: 15, fontWeight: 700, padding: '13px 22px', opacity: (!couponCode.trim() || validating) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
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

          <p style={{ fontSize: 15, color: 'var(--text-light)' }}>
            Want to add more items?{' '}
            <Link href="/shop" style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 15 }}>Continue shopping</Link>
          </p>
        </motion.div>

        {/* ── RIGHT: Checkout panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--gray)', padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 6 }}>Checkout</h2>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.7, marginBottom: 20 }}>
            We&apos;ll send your order updates and shipping info to this email. No account needed.
          </p>

          {/* Email section */}
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Email for Order Updates
          </label>

          {user && !editingEmail ? (
            <>
              <div style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 8, padding: '15px 18px', fontSize: 16, color: 'var(--text-dark)', background: 'var(--off-white)', marginBottom: 10, wordBreak: 'break-all', lineHeight: 1.4 }}>
                {email}
              </div>
              <button
                onClick={() => setEditingEmail(true)}
                style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: 15, fontWeight: 700, padding: 0, marginBottom: 24, display: 'block' }}>
                <i className="fa-solid fa-pen" style={{ marginRight: 6, fontSize: 13 }} />Change email
              </button>
            </>
          ) : (
            <>
              {user && (
                <button
                  onClick={() => { setEditingEmail(false); setEmail(user.email ?? '') }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 10, display: 'block', fontWeight: 600 }}>
                  ← Cancel
                </button>
              )}
              <motion.div
                animate={emailShake ? { x: [0, -8, 8, -8, 8, -4, 4, 0] } : {}}
                transition={{ duration: 0.45 }}
              >
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@email.com"
                  required
                  style={{ width: '100%', border: `2px solid ${emailShake ? '#ef4444' : emailMissing ? '#f59e0b' : 'var(--gray)'}`, borderRadius: 8, padding: '15px 18px', fontSize: 16, color: 'var(--text-dark)', background: emailShake ? '#fff5f5' : 'var(--white)', marginBottom: 24, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s' }}
                />
              </motion.div>
            </>
          )}

          {/* PayPal payment */}
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Payment
          </label>

          {emailMissing ? (
            <div style={{ textAlign: 'center', padding: '18px', background: 'var(--off-white)', borderRadius: 8, border: '1px solid var(--gray)', marginBottom: 4 }}>
              <p style={{ fontSize: 14, color: 'var(--text-light)', fontWeight: 600 }}>Enter your email above to continue</p>
            </div>
          ) : (
            <PayPalScriptProvider
              options={{
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '',
                currency: 'USD',
                intent: 'capture',
              }}
            >
              <PayPalButtons
                style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 55 }}
                forceReRender={[email, couponCode, couponDiscount, finalTotal, tipAmount]}
                createOrder={async () => {
                  if (!requireEmail()) throw new Error('Email required')
                  const res = await fetch('/api/paypal/create-order', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                    },
                    body: JSON.stringify({
                      items: cart.map(i => ({ id: i.id, qty: i.qty, bundle_label: i.bundle_label })),
                      coupon_code: couponDiscount > 0 ? couponCode.trim() : undefined,
                      email: email.trim(),
                      tip_amount: tipAmount > 0 ? tipAmount : undefined,
                    }),
                  })
                  const data = await res.json()
                  if (!data.id) throw new Error(data.error ?? 'Failed to create order')
                  return data.id
                }}
                onApprove={async (data) => {
                  const res = await fetch('/api/paypal/capture-order', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                    },
                    body: JSON.stringify({
                      orderID: data.orderID,
                      items: cart,
                      coupon_code: couponDiscount > 0 ? couponCode.trim() : undefined,
                      email: email.trim(),
                    }),
                  })
                  const order = await res.json()
                  if (!res.ok) {
                    showToast(order.error ?? 'Payment failed. Please try again.')
                    return
                  }
                  try {
                    localStorage.setItem('themaga_last_order', JSON.stringify({
                      id: order.id ?? '',
                      order_number: order.order_number ?? null,
                      total: grandTotal,
                      discount: discountAmount,
                      itemCount: cart.reduce((s, i) => s + i.qty, 0),
                      items: cart.map(i => ({ name: i.name, price: i.bundle_price ?? i.price, qty: i.qty, img: i.img })),
                      guest_email: email.trim(),
                    }))
                    if (order.has_gift_card) {
                      localStorage.setItem('themaga_gift_card_bonus', 'true')
                    }
                  } catch {}
                  paypalSucceeded.current = true
                  clearCart()
                  router.push('/order-success')
                }}
                onError={() => {
                  showToast('Payment error. Please try again.')
                }}
                onCancel={() => {
                  showToast('Payment cancelled.')
                }}
              />
            </PayPalScriptProvider>
          )}

          {/* Security note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 18, padding: '12px 16px', background: 'var(--off-white)', borderRadius: 8, border: '1px solid var(--gray)' }}>
            <i className="fa-solid fa-lock" style={{ color: '#059669', fontSize: 16, flexShrink: 0, marginTop: 2 }} />
            <div>
              <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5, fontWeight: 700, display: 'block' }}>
                Secure checkout — PayPal buyer protection included
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-light)', lineHeight: 1.5, display: 'block', marginTop: 2 }}>
                Log in to your PayPal account to complete payment. Don&apos;t have one? Create a free account at paypal.com — it only takes a minute.
              </span>
            </div>
          </div>

          {/* Steps */}
          <div style={{ borderTop: '1px solid var(--gray)', marginTop: 24, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>1</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-dark)', marginBottom: 3 }}>Enter your email</p>
                <p style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.6 }}>Order status updates and shipping info will be sent here.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>2</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-dark)', marginBottom: 3 }}>Pay with PayPal</p>
                <p style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.6 }}>Log in to your PayPal account to complete your purchase securely.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>✓</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-dark)', marginBottom: 3 }}>Order confirmed!</p>
                <p style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.6 }}>Order status updates will be sent to your email.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
