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
  paid:        { label: 'Paid',        color: '#059669', bg: '#d1fae5' },
  processing:  { label: 'Processing',  color: '#d97706', bg: '#fef3c7' },
  shipped:     { label: 'Shipped',     color: '#2563eb', bg: '#dbeafe' },
  delivered:   { label: 'Delivered',   color: '#7c3aed', bg: '#ede9fe' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#4a6170', bg: '#e8eff0' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
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
    <div style={{ minHeight: '100vh', background: 'var(--off-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px' }}>

      {/* logo */}
      <Link href="/" style={{ marginBottom: 32, display: 'block' }}>
        <Image src="/logo.png" alt="The Maga" width={64} height={64} style={{ objectFit: 'contain' }} />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: 'white', borderRadius: 24, padding: '40px 36px', maxWidth: 520, width: '100%', boxShadow: '0 8px 48px rgba(9,52,89,0.10)' }}>

        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--heading)', marginBottom: 8 }}>
          Track Your Order
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 28, lineHeight: 1.6 }}>
          Enter the email address you used at checkout to see your order status.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 15,
              border: '1.5px solid var(--gray)', outline: 'none', background: 'var(--off-white)',
              color: 'var(--text-dark)',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'var(--text-light)' : 'var(--navy)', color: 'white',
              border: 'none', borderRadius: 50, padding: '14px', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'default' : 'pointer', transition: 'background 0.2s',
            }}>
            {loading ? 'Searching…' : 'Find My Orders'}
          </button>
        </form>

        {error && (
          <p style={{ marginTop: 16, fontSize: 13, color: '#ef4444', textAlign: 'center' }}>{error}</p>
        )}

        <AnimatePresence>
          {searched && orders !== null && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginTop: 28 }}>

              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <i className="fa-solid fa-box-open" style={{ fontSize: 32, color: 'var(--text-light)', marginBottom: 12 }} />
                  <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>No orders found for this email.</p>
                  <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>
                    Double-check the email or{' '}
                    <Link href="/" style={{ color: 'var(--teal)', fontWeight: 600 }}>continue shopping</Link>.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {orders.length} order{orders.length !== 1 ? 's' : ''} found
                  </p>

                  {orders.map(order => (
                    <div key={order.id} style={{ background: 'var(--off-white)', borderRadius: 16, padding: 20, border: '1.5px solid var(--gray)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-light)', fontFamily: 'monospace', marginBottom: 4 }}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--text-light)' }}>
                            {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      {/* items preview */}
                      {order.items?.slice(0, 2).map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-dark)', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{item.name} × {item.qty}</span>
                          <span style={{ fontWeight: 700 }}>${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      ))}
                      {order.items?.length > 2 && (
                        <p style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 4 }}>+{order.items.length - 2} more items</p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid var(--gray)', paddingTop: 10, marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>Order Total</span>
                        <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 900, color: 'var(--heading)' }}>
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
      <div style={{ marginTop: 28, display: 'flex', gap: 20, fontSize: 13 }}>
        <Link href="/" style={{ color: 'var(--teal)', fontWeight: 600 }}>Back to Shop</Link>
        <Link href="/login" style={{ color: 'var(--text-mid)' }}>Sign In</Link>
      </div>
    </div>
  )
}
