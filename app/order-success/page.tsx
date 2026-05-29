'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const COLORS = ['#58948F', '#093459', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#f97316', '#06b6d4']

interface Piece {
  id: number; x: number; y: number; size: number; color: string
  rotate: number; rotateEnd: number; delay: number; duration: number; shape: 'circle' | 'rect'
}

function Confetti() {
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      size: Math.random() * 9 + 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotate: Math.random() * 360,
      rotateEnd: Math.random() * 720 + 360,
      delay: Math.random() * 1.5,
      duration: Math.random() * 2 + 2.5,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
    }))
  )

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99, overflow: 'hidden' }}>
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: `${p.y}vh`, rotate: p.rotate, opacity: 1, scale: 1 }}
          animate={{ y: '110vh', rotate: p.rotateEnd, opacity: [1, 1, 0], scale: [1, 1, 0.5] }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0, 0.8, 1] }}
          style={{ position: 'absolute', top: 0, left: 0, width: p.size, height: p.shape === 'circle' ? p.size : p.size * 0.5, background: p.color, borderRadius: p.shape === 'circle' ? '50%' : 2 }}
        />
      ))}
    </div>
  )
}

interface OrderInfo {
  id: string
  total: number
  discount: number
  itemCount: number
  items: { name: string; price: number; qty: number; img: string }[]
  referral_code?: string
}

export default function OrderSuccessPage() {
  const router = useRouter()
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [showConfetti, setShowConfetti] = useState(true)
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Load from localStorage (set by Cart on successful checkout)
    try {
      const raw = localStorage.getItem('krsellify_last_order')
      if (raw) {
        setOrder(JSON.parse(raw))
        localStorage.removeItem('krsellify_last_order')
      }
    } catch {}

    // Stop confetti after 4 s
    const t = setTimeout(() => setShowConfetti(false), 4000)

    // Auto-redirect to home after 30 s if user doesn't click
    redirectRef.current = setTimeout(() => router.push('/'), 30000)

    return () => { clearTimeout(t); if (redirectRef.current) clearTimeout(redirectRef.current) }
  }, [router])

  function cancelRedirect() {
    if (redirectRef.current) clearTimeout(redirectRef.current)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}
      onClick={cancelRedirect}>

      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      {/* logo */}
      <Link href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 900, color: 'var(--navy)', textDecoration: 'none', marginBottom: 32 }}>
        KR<span style={{ color: 'var(--teal)' }}>SELLIFY</span>
      </Link>

      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: 'var(--white)', borderRadius: 24, padding: '48px 40px', maxWidth: 540, width: '100%', boxShadow: '0 8px 48px rgba(9,52,89,0.12)', textAlign: 'center' }}>

        {/* animated check circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }}
          style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), #059669)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(88,148,143,0.4)' }}>
          <motion.i
            className="fa-solid fa-check"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            style={{ color: 'white', fontSize: 32 }} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ fontFamily: 'var(--font-playfair)', fontSize: 32, fontWeight: 900, color: 'var(--navy)', marginBottom: 10 }}>
          Order Placed!
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: 28 }}>
          Thank you for your purchase. We&apos;ll start processing your order right away.
        </motion.p>

        {/* order summary */}
        {order && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            style={{ background: 'var(--off-white)', borderRadius: 16, padding: 20, marginBottom: 28, textAlign: 'left' }}>

            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Order Summary</p>

            {order.items?.slice(0, 3).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--gray)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{item.name} × {item.qty}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            {order.items?.length > 3 && (
              <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 8 }}>+{order.items.length - 3} more items</p>
            )}

            {order.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#059669', fontWeight: 600, marginBottom: 6 }}>
                <span>Discount applied</span>
                <span>−${order.discount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '2px solid var(--gray)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-mid)' }}>Total Paid</span>
              <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'var(--navy)' }}>${order.total.toFixed(2)}</span>
            </div>

            {order.id && (
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>
                Order ID: <span style={{ fontFamily: 'monospace' }}>{order.id.slice(0, 8).toUpperCase()}</span>
              </p>
            )}
          </motion.div>
        )}

        {/* next steps */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/account"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--navy)', color: 'white', padding: '14px', borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            <i className="fa-solid fa-box" /> Track My Order
          </Link>
          <Link href="/"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--off-white)', color: 'var(--navy)', padding: '13px', borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: 'none', border: '2px solid var(--gray)' }}>
            <i className="fa-solid fa-store" /> Continue Shopping
          </Link>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 20 }}>
          A confirmation will be sent to your account. You can view order status in <Link href="/account" style={{ color: 'var(--teal)', fontWeight: 700 }}>My Account</Link>.
        </motion.p>
      </motion.div>
    </div>
  )
}
