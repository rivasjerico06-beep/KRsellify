'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { useAuth } from '@/context/AuthContext'

const VIP_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_VIP_PLAN_ID!

const BENEFITS = [
  { icon: 'fa-tag', title: '30% Off Every Order', desc: 'Automatically applied at checkout on every purchase, forever.' },
  { icon: 'fa-crown', title: 'VIP Badge on Account', desc: 'Your account displays an exclusive VIP crown badge.' },
  { icon: 'fa-lock-open', title: 'Exclusive Products', desc: 'Access products only available to VIP members before anyone else.' },
  { icon: 'fa-bolt', title: 'Early Access', desc: 'Shop new arrivals and limited editions before the general public.' },
]

export default function VipPage() {
  const { user, session } = useAuth()
  const [isVip, setIsVip] = useState<boolean | null>(null)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !session?.access_token) { setIsVip(false); return }
    fetch('/api/vip/status', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(d => setIsVip(d.is_vip))
      .catch(() => setIsVip(false))
  }, [user, session])

  async function handleSubscriptionApproved(subscriptionId: string) {
    if (!session?.access_token) return
    setActivating(true)
    setError('')
    try {
      const res = await fetch('/api/paypal/activate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ subscription_id: subscriptionId }),
      })
      if (res.ok) {
        setIsVip(true)
      } else {
        const d = await res.json()
        setError(d.error ?? 'Something went wrong. Please contact support.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setActivating(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f2441 0%, #093451 50%, #0a3d5c 100%)' }}>
      {/* Nav */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'white', textDecoration: 'none' }}>
          Maga <span style={{ color: '#4dd9b8' }}>Offers</span>
        </Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/shop" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Shop</Link>
          {user
            ? <Link href="/account" style={{ color: '#4dd9b8', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>My Account</Link>
            : <Link href="/auth" style={{ background: '#4dd9b8', color: '#0f2441', padding: '8px 18px', borderRadius: 50, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
          }
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 28px' }}>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(77,217,184,0.12)', border: '1px solid rgba(77,217,184,0.3)', borderRadius: 50, padding: '8px 20px', marginBottom: 24 }}>
            <i className="fa-solid fa-crown" style={{ color: '#fbbf24', fontSize: 16 }} />
            <span style={{ color: '#4dd9b8', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>VIP Membership</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 52, fontWeight: 900, color: 'white', marginBottom: 16, lineHeight: 1.15 }}>
            Unlock VIP Access
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Join the inner circle. Get 30% off every purchase, exclusive products, and early access — all for $20/month.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 48 }}>
          {BENEFITS.map((b, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px 28px', backdropFilter: 'blur(10px)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(77,217,184,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <i className={`fa-solid ${b.icon}`} style={{ fontSize: 20, color: '#4dd9b8' }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'white', marginBottom: 8 }}>{b.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Subscription card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          style={{ background: 'white', borderRadius: 24, padding: '40px 48px', maxWidth: 480, margin: '0 auto', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>

          {isVip === null ? (
            <div style={{ padding: '32px 0', color: '#888' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12, display: 'block' }} />
              Checking status…
            </div>
          ) : isVip ? (
            // Already VIP
            <div>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <i className="fa-solid fa-crown" style={{ fontSize: 32, color: 'white' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: '#0f2441', marginBottom: 10 }}>
                You are a VIP Customer!
              </h2>
              <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
                Your 30% discount is active and will be automatically applied at checkout. Enjoy exclusive access!
              </p>
              <Link href="/shop" style={{ display: 'inline-block', background: '#0f2441', color: 'white', padding: '14px 32px', borderRadius: 50, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                Shop Now →
              </Link>
            </div>
          ) : !user ? (
            // Not logged in
            <div>
              <i className="fa-solid fa-lock" style={{ fontSize: 36, color: '#ddd', marginBottom: 16, display: 'block' }} />
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', marginBottom: 10 }}>Sign in to Subscribe</h2>
              <p style={{ fontSize: 15, color: '#888', marginBottom: 24 }}>You need an account to become a VIP member.</p>
              <Link href="/auth?redirect=/vip" style={{ display: 'inline-block', background: '#0f2441', color: 'white', padding: '14px 32px', borderRadius: 50, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                Sign In / Register
              </Link>
            </div>
          ) : activating ? (
            <div style={{ padding: '32px 0', color: '#555' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12, display: 'block', color: '#0f2441' }} />
              <p style={{ fontWeight: 700 }}>Activating your VIP membership…</p>
            </div>
          ) : (
            // Logged in, not VIP — show subscribe button
            <div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: '#0f2441', lineHeight: 1 }}>$20</div>
                <div style={{ fontSize: 16, color: '#888', fontWeight: 600 }}>/month — cancel anytime by contacting us</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' }}>
                {BENEFITS.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#444' }}>
                    <i className="fa-solid fa-circle-check" style={{ color: '#059669', fontSize: 15, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{b.title}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 14, fontWeight: 600 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
                  {error}
                </div>
              )}

              <PayPalScriptProvider options={{
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
                merchantId: 'FZADET62SVJG4',
                vault: 'true',
                intent: 'subscription',
              }}>
                <PayPalButtons
                  style={{ layout: 'vertical', shape: 'rect', height: 50 }}
                  createSubscription={(_, actions) =>
                    actions.subscription.create({ plan_id: VIP_PLAN_ID })
                  }
                  onApprove={async (data) => {
                    if (data.subscriptionID) {
                      await handleSubscriptionApproved(data.subscriptionID)
                    }
                  }}
                  onError={() => setError('Payment failed. Please try again.')}
                  onCancel={() => setError('')}
                />
              </PayPalScriptProvider>

              <p style={{ fontSize: 12, color: '#aaa', marginTop: 14 }}>
                <i className="fa-solid fa-lock" style={{ marginRight: 6 }} />
                Secured by PayPal — cancel anytime by contacting support
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
