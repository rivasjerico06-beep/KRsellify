'use client'

import { useState, FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface OrderItem {
  name: string
  price: number
  qty: number
  img?: string
}

interface Order {
  id: string
  status: string
  total: number
  discount_amount: number
  items: OrderItem[]
  created_at: string
  coupon_code: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  paid:        { label: 'Paid',        color: '#065f46', bg: '#a7f3d0' },
  processing:  { label: 'Processing',  color: '#78350f', bg: '#fde68a' },
  shipped:     { label: 'Shipped',     color: '#1e3a8a', bg: '#bfdbfe' },
  delivered:   { label: 'Delivered',   color: '#4c1d95', bg: '#ddd6fe' },
  cancelled:   { label: 'Cancelled',   color: '#7f1d1d', bg: '#fecaca' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#1e3a5f', bg: '#dbeafe' }
  return (
    <span style={{
      display: 'inline-block', padding: '6px 16px', borderRadius: 24,
      fontSize: 14, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  )
}

export default function TrackOrderPage() {
  const [email, setEmail] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')
    setOrders(null)

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setOrders(data.orders)
      setSearched(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 20px 48px' }}>

      {/* logo */}
      <Link href="/" style={{ marginBottom: 36, display: 'block' }}>
        <Image src="/logo.png" alt="Maga Offers" width={80} height={80} style={{ objectFit: 'contain' }} />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: 'white', borderRadius: 28, padding: '48px 40px', maxWidth: 560, width: '100%', boxShadow: '0 8px 48px rgba(9,52,89,0.10)' }}>

        {/* icon */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'linear-gradient(135deg, #e0f2f1 0%, #dbeafe 100%)', borderRadius: 20, marginBottom: 16 }}>
            <i className="fa-solid fa-box-open" style={{ fontSize: 28, color: 'var(--teal)' }} />
          </div>
        </div>

        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 32, fontWeight: 900, color: 'var(--heading)', marginBottom: 10, textAlign: 'center' }}>
          Track Your Order
        </h1>
        <p style={{ fontSize: 17, color: 'var(--text-mid)', marginBottom: 32, lineHeight: 1.65, textAlign: 'center' }}>
          Enter the email address you used at checkout and we&apos;ll show your order status.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)', display: 'block', marginBottom: 6, letterSpacing: '0.03em' }}>
            Your Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              width: '100%', padding: '18px 20px', borderRadius: 14, fontSize: 17,
              border: '2px solid var(--gray)', outline: 'none', background: 'var(--off-white)',
              color: 'var(--text-dark)', fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'var(--text-light)' : 'var(--navy)', color: 'white',
              border: 'none', borderRadius: 50, padding: '18px 24px', fontSize: 17, fontWeight: 700,
              cursor: loading ? 'default' : 'pointer', transition: 'background 0.2s',
              fontFamily: 'inherit', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              minHeight: 58,
            }}>
            {loading
              ? <><i className="fa-solid fa-spinner fa-spin" /> Searching…</>
              : <><i className="fa-solid fa-magnifying-glass" /> Find My Orders</>
            }
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 18, padding: '14px 18px', background: '#fff0f0', border: '1.5px solid #fca5a5', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: '#ef4444', fontSize: 18 }} />
            <p style={{ fontSize: 16, color: '#b91c1c', fontWeight: 600, margin: 0 }}>{error}</p>
          </div>
        )}

        <AnimatePresence>
          {searched && orders !== null && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginTop: 32 }}>

              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', background: 'var(--off-white)', borderRadius: 16, border: '1.5px solid var(--gray)' }}>
                  <i className="fa-solid fa-box-open" style={{ fontSize: 40, color: 'var(--text-light)', marginBottom: 14, display: 'block' }} />
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 6 }}>No orders found</p>
                  <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.6, padding: '0 20px' }}>
                    We couldn&apos;t find any orders for this email address.<br />
                    Double-check your email or{' '}
                    <Link href="/contact" style={{ color: 'var(--teal)', fontWeight: 700 }}>contact us for help</Link>.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--heading)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
                    {orders.length} order{orders.length !== 1 ? 's' : ''} found
                  </p>

                  {orders.map(order => (
                    <div key={order.id} style={{ background: 'var(--off-white)', borderRadius: 18, padding: '22px 24px', border: '2px solid var(--gray)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <p style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: 'monospace', marginBottom: 4, fontWeight: 600 }}>
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p style={{ fontSize: 15, color: 'var(--text-mid)', fontWeight: 500 }}>
                            {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      {/* items preview */}
                      <div style={{ borderTop: '1.5px solid var(--gray)', paddingTop: 14, marginTop: 4 }}>
                        {order.items?.slice(0, 2).map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: 'var(--text-dark)', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600 }}>{item.name} &times; {item.qty}</span>
                            <span style={{ fontWeight: 700 }}>${(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                        {order.items?.length > 2 && (
                          <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 8 }}>+{order.items.length - 2} more items</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--gray)', paddingTop: 14, marginTop: 8 }}>
                        <span style={{ fontSize: 15, color: 'var(--text-mid)', fontWeight: 700 }}>Order Total</span>
                        <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'var(--heading)' }}>
                          ${Number(order.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      {/* footer links */}
      <div style={{ marginTop: 32, display: 'flex', gap: 24, fontSize: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{ color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />
          Back to Shop
        </Link>
        <Link href="/contact" style={{ color: 'var(--text-mid)', fontWeight: 600, textDecoration: 'none' }}>
          Need Help? Contact Us
        </Link>
      </div>
    </div>
  )
}
