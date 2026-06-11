'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { getBrowserSupabase } from '@/lib/supabase-browser'

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
  order_number?: number | null
  total: number
  discount: number
  itemCount: number
  items: { name: string; price: number; qty: number; img: string }[]
  guest_email?: string
}

function GiftCardBonusModal({ authToken, onClose }: { authToken?: string; onClose: () => void }) {
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [wonChoice, setWonChoice] = useState<30 | 50 | null>(null)
  const [countdown, setCountdown] = useState(180) // 3 minutes
  const [copied, setCopied] = useState(false)
  const [paypalError, setPaypalError] = useState('')

  useEffect(() => {
    if (couponCode) return
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(t); onClose(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [couponCode, onClose])

  const mins = String(Math.floor(countdown / 60)).padStart(2, '0')
  const secs = String(countdown % 60).padStart(2, '0')

  async function handleApprove(orderID: string, choice: 30 | 50) {
    setPaypalError('')
    const res = await fetch('/api/coupons/gift-bonus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ orderID, choice }),
    })
    const data = await res.json()
    if (data.code) {
      setWonChoice(choice)
      setCouponCode(data.code)
    } else {
      setPaypalError(data.error ?? 'Something went wrong. Please contact support.')
    }
  }

  function copyCode() {
    if (!couponCode) return
    navigator.clipboard.writeText(couponCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.76)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        style={{ background: 'white', borderRadius: 24, padding: '40px 32px', maxWidth: 540, width: '100%', textAlign: 'center', position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.4)', margin: 'auto' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', lineHeight: 1 }}>
          <i className="fa-solid fa-xmark" />
        </button>

        {!couponCode ? (
          <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '', currency: 'USD', intent: 'capture' }}>
            {/* Header */}
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
              <i className="fa-solid fa-bolt" style={{ color: 'white', fontSize: 28 }} />
            </div>

            <div style={{ display: 'inline-block', background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 50, padding: '4px 14px', fontSize: 11, fontWeight: 800, color: '#92400e', letterSpacing: '0.06em', marginBottom: 14 }}>
              LIMITED TIME OFFER
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 6, lineHeight: 1.3 }}>
              Exclusive Discount Coupons
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 6 }}>
              Grab a powerful discount for your next order before this offer disappears!
            </p>

            <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 800, marginBottom: 28 }}>
              <i className="fa-solid fa-clock" style={{ marginRight: 5 }} />
              Offer expires in {mins}:{secs}
            </p>

            {paypalError && (
              <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 700, marginBottom: 16, padding: '10px 14px', background: '#fff5f5', borderRadius: 8, border: '1px solid #fca5a5' }}>
                {paypalError}
              </p>
            )}

            {/* 30% card — $30 */}
            <div style={{ border: '2px solid #e2e8f0', borderRadius: 16, padding: '20px 20px 16px', marginBottom: 14, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>30% OFF</span>
                  <span style={{ fontSize: 14, color: '#64748b', marginLeft: 8 }}>coupon</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>$30</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>one-time payment</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Get 30% off your entire next order. No minimum spend.
              </p>
              <PayPalButtons
                style={{ layout: 'horizontal', color: 'blue', shape: 'rect', label: 'pay', height: 40, tagline: false }}
                createOrder={async () => {
                  const res = await fetch('/api/coupons/gift-bonus/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ choice: 30 }),
                  })
                  const data = await res.json()
                  if (!data.id) throw new Error(data.error ?? 'Failed')
                  return data.id
                }}
                onApprove={async (data) => handleApprove(data.orderID, 30)}
                onError={() => setPaypalError('Payment error. Please try again.')}
              />
            </div>

            {/* 50% card — $50 */}
            <div style={{ border: '2.5px solid #ef4444', borderRadius: 16, padding: '20px 20px 16px', textAlign: 'left', background: '#fffbfb', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 10, right: 12, background: '#ef4444', color: 'white', borderRadius: 50, fontSize: 9, fontWeight: 900, padding: '3px 8px', letterSpacing: '0.05em' }}>
                BEST DEAL
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>50% OFF</span>
                  <span style={{ fontSize: 14, color: '#64748b', marginLeft: 8 }}>coupon</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#ef4444' }}>$50</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>one-time payment</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Half off your entire next order — maximum savings on any purchase!
              </p>
              <PayPalButtons
                style={{ layout: 'horizontal', color: 'gold', shape: 'rect', label: 'pay', height: 40, tagline: false }}
                createOrder={async () => {
                  const res = await fetch('/api/coupons/gift-bonus/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ choice: 50 }),
                  })
                  const data = await res.json()
                  if (!data.id) throw new Error(data.error ?? 'Failed')
                  return data.id
                }}
                onApprove={async (data) => handleApprove(data.orderID, 50)}
                onError={() => setPaypalError('Payment error. Please try again.')}
              />
            </div>

            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>
              Single-use coupon. No minimum spend. No expiry.
            </p>

            <div style={{ marginTop: 16, padding: '10px 14px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: 5 }} />
                THEMAGA10 (10% off) is already activated for your email!
              </p>
            </div>
          </PayPalScriptProvider>
        ) : (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), #059669)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(88,148,143,0.4)' }}>
              <i className="fa-solid fa-check" style={{ color: 'white', fontSize: 30 }} />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
              Your {wonChoice}% Off Coupon!
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
              Use this code at checkout on your next order.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '2.5px dashed #cbd5e1', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 900, color: '#0f172a', flex: 1, letterSpacing: '0.08em', textAlign: 'left' }}>
                {couponCode}
              </span>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={copyCode}
                style={{ background: copied ? '#059669' : 'var(--navy)', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 700, padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                <i className={`fa-solid ${copied ? 'fa-circle-check' : 'fa-copy'}`} />
                {copied ? 'Copied!' : 'Copy'}
              </motion.button>
            </div>

            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              {wonChoice}% off your entire next order. Single-use, no minimum spend, no expiry.
            </p>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              style={{ width: '100%', background: 'var(--navy)', border: 'none', borderRadius: 50, color: 'white', fontSize: 15, fontWeight: 700, padding: '14px', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-store" style={{ marginRight: 8 }} />
              Continue Shopping
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function OrderSuccessPage() {
  const router = useRouter()
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [showConfetti, setShowConfetti] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authToken, setAuthToken] = useState<string | undefined>(undefined)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Load order from localStorage
    try {
      const raw = localStorage.getItem('themaga_last_order')
      if (raw) {
        setOrder(JSON.parse(raw))
        localStorage.removeItem('themaga_last_order')
      }
    } catch {}

    // Check for gift card bonus flag
    const hasGiftCardBonus = localStorage.getItem('themaga_gift_card_bonus')
    if (hasGiftCardBonus) {
      localStorage.removeItem('themaga_gift_card_bonus')
      // Delay modal slightly so order success screen loads first
      setTimeout(() => setShowBonusModal(true), 2000)
    }

    // Auth session
    getBrowserSupabase().auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      setAuthToken(session?.access_token)
    })

    const t = setTimeout(() => setShowConfetti(false), 4000)
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

      {/* Gift card bonus modal */}
      <AnimatePresence>
        {showBonusModal && (
          <GiftCardBonusModal
            authToken={authToken}
            onClose={() => setShowBonusModal(false)}
          />
        )}
      </AnimatePresence>

      {/* logo */}
      <Link href="/" style={{ marginBottom: 32, display: 'block' }}>
        <Image src="/logo.png" alt="Maga Offers" width={72} height={72} style={{ objectFit: 'contain' }} />
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
          style={{ fontFamily: 'var(--font-playfair)', fontSize: 32, fontWeight: 900, color: 'var(--heading)', marginBottom: 10 }}>
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
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--heading)' }}>${(item.price * item.qty).toFixed(2)}</span>
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
              <span style={{ fontWeight: 700, color: 'var(--text-mid)' }}>Order Total</span>
              <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'var(--heading)' }}>${order.total.toFixed(2)}</span>
            </div>

            {(order.order_number || order.id) && (
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>
                Order #: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {order.order_number ?? order.id.slice(0, 8).toUpperCase()}
                </span>
              </p>
            )}
          </motion.div>
        )}

        {/* next steps */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoggedIn ? (
            <Link href="/account"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--navy)', color: 'white', padding: '14px', borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              <i className="fa-solid fa-box" /> Track My Order
            </Link>
          ) : (
            <Link href="/track-order"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--navy)', color: 'white', padding: '14px', borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              <i className="fa-solid fa-box" /> Track My Order
            </Link>
          )}
          <Link href="/"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--off-white)', color: 'var(--heading)', padding: '13px', borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: 'none', border: '2px solid var(--gray)' }}>
            <i className="fa-solid fa-store" /> Continue Shopping
          </Link>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 20 }}>
          A confirmation has been sent to your email.{isLoggedIn && <> You can view order status in <Link href="/account" style={{ color: 'var(--teal)', fontWeight: 700 }}>My Account</Link>.</>}
        </motion.p>
      </motion.div>
    </div>
  )
}
