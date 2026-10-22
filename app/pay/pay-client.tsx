'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useSiteConfig } from '@/context/SiteConfigContext'
import PaymentMaintenanceNotice from '@/components/PaymentMaintenanceNotice'
import type { LemonSqueezyOffer } from '@/lib/lemonsqueezy'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '2px solid #ddd', borderRadius: 10, padding: '14px 18px',
  fontSize: 16, color: '#111', outline: 'none', boxSizing: 'border-box', background: 'white',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700, color: '#0f2441', marginBottom: 6,
}

export default function PayClient({ offer, testMode }: { offer: LemonSqueezyOffer | null; testMode: boolean }) {
  const { user } = useAuth()
  // Same rule as the checkout route: the admin switch only holds back live payments.
  const paymentsMaintenance = useSiteConfig().payments_config.maintenance && !testMode
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setPaying(true)
    setError('')
    try {
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, name: name.trim() }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setPaying(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setPaying(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f2441 0%, #093451 50%, #0a3d5c 100%)' }}>
      {/* Nav */}
      <div style={{ padding: '20px clamp(16px, 4vw, 32px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'white', textDecoration: 'none' }}>
          PATRIOT’S <span style={{ color: '#4dd9b8' }}>ONLINE SHOP</span>
        </Link>
        <Link href="/shop" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Shop</Link>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: 'clamp(32px, 8vw, 60px) 16px' }}>
        <div style={{ background: 'white', borderRadius: 24, padding: 'clamp(28px, 6vw, 40px) clamp(20px, 6vw, 44px)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>

          {testMode && (
            <div role="note" style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
              <strong><i className="fa-solid fa-flask" style={{ marginRight: 8 }} />Test mode — no real money is taken.</strong>
              <br />
              Pay with card <code style={{ fontWeight: 700 }}>4242 4242 4242 4242</code>, any future expiry date and any CVC.
            </div>
          )}

          {!offer ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 40, color: '#CA8A04', marginBottom: 14, display: 'block' }} />
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: '#0f2441', marginBottom: 10 }}>
                Payments unavailable
              </h1>
              <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, margin: 0 }}>
                Checkout isn&apos;t available right now. Please try again shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePay} noValidate>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: '#0f2441', marginBottom: 8, lineHeight: 1.2 }}>
                  {offer.productName}
                </h1>
                {offer.description && (
                  <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>{offer.description}</p>
                )}
                <div style={{ fontSize: 44, fontWeight: 900, color: '#0f2441', lineHeight: 1 }}>{offer.priceFormatted}</div>
                <div style={{ fontSize: 14, color: '#888', fontWeight: 600, marginTop: 6 }}>one-time payment</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                <div>
                  <label htmlFor="pay-name" style={labelStyle}>Name <span style={{ color: '#888', fontWeight: 600 }}>(optional)</span></label>
                  <input id="pay-name" type="text" autoComplete="name" value={name} maxLength={100}
                    onChange={e => setName(e.target.value)} placeholder="Jane Doe" style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="pay-email" style={labelStyle}>Email</label>
                  <input id="pay-email" type="email" autoComplete="email" required value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }} placeholder="yourname@gmail.com" style={inputStyle} />
                </div>
              </div>

              {error && (
                <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 14, fontWeight: 600 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
                  {error}
                </div>
              )}

              {paymentsMaintenance ? (
                <PaymentMaintenanceNotice />
              ) : (
                <button
                  type="submit"
                  disabled={paying}
                  style={{
                    width: '100%', background: '#0f2441', color: 'white', border: 'none', borderRadius: 10,
                    height: 55, fontSize: 16, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    opacity: paying ? 0.7 : 1, transition: 'opacity 0.2s',
                  }}
                >
                  {paying ? (
                    <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 14 }} />Redirecting…</>
                  ) : (
                    <><i className="fa-solid fa-lock" style={{ fontSize: 14 }} />Pay {offer.priceFormatted}</>
                  )}
                </button>
              )}

              <p style={{ fontSize: 12, color: '#999', marginTop: 14, textAlign: 'center', lineHeight: 1.6 }}>
                You&apos;ll finish paying on Lemon Squeezy&apos;s secure checkout. Card details never touch this site.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
