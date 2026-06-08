'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { useAuth } from '@/context/AuthContext'

const VIP_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_VIP_PLAN_ID!

const BENEFITS = [
  { icon: 'fa-tag', title: '30% Off Every Order', desc: 'Automatically applied at checkout on every purchase, forever.' },
  { icon: 'fa-crown', title: 'VIP Status', desc: 'Your email is registered as VIP — discount applies at any checkout.' },
  { icon: 'fa-lock-open', title: 'Exclusive Products', desc: 'Access products only available to VIP members before anyone else.' },
  { icon: 'fa-bolt', title: 'Early Access', desc: 'Shop new arrivals and limited editions before the general public.' },
]

export default function VipPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState(user?.email ?? '')
  const [emailReady, setEmailReady] = useState(false)
  const [isVip, setIsVip] = useState(false)
  const [checking, setChecking] = useState(false)
  const [activating, setActivating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckEmail() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setChecking(true)
    setError('')
    const res = await fetch(`/api/vip/check?email=${encodeURIComponent(trimmed)}`)
    const data = await res.json()
    setChecking(false)
    if (data.is_vip) {
      setIsVip(true)
    } else {
      setEmailReady(true)
    }
  }

  async function handleSubscriptionApproved(subscriptionId: string) {
    setActivating(true)
    setError('')
    try {
      const res = await fetch('/api/paypal/activate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subscriptionId, email: email.trim().toLowerCase() }),
      })
      if (res.ok) {
        setSuccess(true)
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

          {/* Already VIP */}
          {(isVip || success) ? (
            <div>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <i className="fa-solid fa-crown" style={{ fontSize: 32, color: 'white' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: '#0f2441', marginBottom: 10 }}>
                {success ? 'Welcome to VIP!' : 'You\'re already VIP!'}
              </h2>
              <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 8 }}>
                <strong style={{ color: '#0f2441' }}>{email}</strong>
              </p>
              <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
                Your 30% discount is active. Just enter this email at checkout to get your discount automatically — no login needed.
              </p>
              <Link href="/shop" style={{ display: 'inline-block', background: '#0f2441', color: 'white', padding: '14px 32px', borderRadius: 50, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                Shop Now →
              </Link>
            </div>

          ) : activating ? (
            <div style={{ padding: '32px 0', color: '#555' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12, display: 'block', color: '#0f2441' }} />
              <p style={{ fontWeight: 700 }}>Activating your VIP membership…</p>
            </div>

          ) : emailReady ? (
            // Email entered — show PayPal subscribe button
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: '#0f2441', lineHeight: 1 }}>$20</div>
                <div style={{ fontSize: 16, color: '#888', fontWeight: 600 }}>/month — cancel anytime</div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 14, color: '#15803d', fontWeight: 600 }}>
                <i className="fa-solid fa-envelope" style={{ marginRight: 8 }} />
                VIP for: <strong>{email}</strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: 'left' }}>
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
                merchantId: process.env.NEXT_PUBLIC_PAYPAL_MERCHANT_ID,
                vault: 'true',
                intent: 'subscription',
              }}>
                <PayPalButtons
                  style={{ layout: 'vertical', shape: 'rect', height: 50 }}
                  createSubscription={(_, actions) =>
                    actions.subscription.create({ plan_id: VIP_PLAN_ID })
                  }
                  onApprove={async (data) => {
                    if (data.subscriptionID) await handleSubscriptionApproved(data.subscriptionID)
                  }}
                  onError={() => setError('Payment failed. Please try again.')}
                  onCancel={() => {}}
                />
              </PayPalScriptProvider>

              <button
                onClick={() => { setEmailReady(false); setError('') }}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, marginTop: 12, fontWeight: 600 }}>
                ← Use a different email
              </button>

              <p style={{ fontSize: 12, color: '#aaa', marginTop: 10 }}>
                <i className="fa-solid fa-lock" style={{ marginRight: 6 }} />
                Secured by PayPal — cancel anytime by contacting support
              </p>
            </div>

          ) : (
            // Email input step
            <div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: '#0f2441', lineHeight: 1 }}>$20</div>
                <div style={{ fontSize: 16, color: '#888', fontWeight: 600 }}>/month — cancel anytime</div>
              </div>

              <p style={{ fontSize: 15, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
                Enter the email you use at checkout. Your 30% discount will be applied automatically whenever you shop.
              </p>

              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="yourname@gmail.com"
                onKeyDown={e => e.key === 'Enter' && handleCheckEmail()}
                style={{ width: '100%', border: '2px solid #ddd', borderRadius: 10, padding: '14px 18px', fontSize: 16, color: '#111', marginBottom: 14, outline: 'none', boxSizing: 'border-box' }}
              />

              {error && (
                <p style={{ color: '#dc2626', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                  <i className="fa-solid fa-circle-xmark" style={{ marginRight: 6 }} />
                  {error}
                </p>
              )}

              <button
                onClick={handleCheckEmail}
                disabled={checking || !email.trim()}
                style={{ width: '100%', background: '#0f2441', color: 'white', border: 'none', borderRadius: 10, padding: '15px', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: (checking || !email.trim()) ? 0.6 : 1 }}>
                {checking ? (
                  <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Checking…</>
                ) : 'Continue →'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
