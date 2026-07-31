'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VipSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return }

    fetch('/api/stripe/activate-vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setEmail(d.email); setStatus('success') }
        else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [sessionId])

  if (status === 'loading') {
    return (
      <div style={{ textAlign: 'center', color: 'white' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, marginBottom: 16, display: 'block' }} />
        <p style={{ fontSize: 16 }}>Activating your VIP membership…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ background: 'white', borderRadius: 20, padding: '40px 48px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
        <i className="fa-solid fa-circle-xmark" style={{ fontSize: 48, color: '#dc2626', marginBottom: 16, display: 'block' }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f2441', marginBottom: 10 }}>Activation issue</h2>
        <p style={{ color: '#555', lineHeight: 1.6, marginBottom: 20 }}>
          Your payment may have gone through. Please contact{' '}
          <a href="mailto:themagaoffer@gmail.com" style={{ color: '#093459', fontWeight: 700 }}>
            themagaoffer@gmail.com
          </a>{' '}
          and we'll activate your account right away.
        </p>
        <Link href="/vip" style={{ display: 'inline-block', background: '#0f2441', color: 'white', padding: '12px 28px', borderRadius: 50, fontWeight: 700, textDecoration: 'none' }}>
          Back to VIP page
        </Link>
      </div>
    )
  }

  return (
    <div style={{ background: 'white', borderRadius: 24, padding: '40px 48px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <i className="fa-solid fa-crown" style={{ fontSize: 32, color: 'white' }} />
      </div>
      <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: '#0f2441', marginBottom: 10 }}>
        Welcome to VIP!
      </h2>
      {email && (
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 8 }}>
          <strong style={{ color: '#0f2441' }}>{email}</strong>
        </p>
      )}
      <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
        Your 30% discount is now active. Just use this email at checkout to get your discount automatically — no login needed.
      </p>
      <Link href="/shop" style={{ display: 'inline-block', background: '#0f2441', color: 'white', padding: '14px 32px', borderRadius: 50, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
        Shop Now →
      </Link>
    </div>
  )
}

export default function VipSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f2441 0%, #093451 50%, #0a3d5c 100%)', padding: 24 }}>
      <Suspense fallback={
        <div style={{ textAlign: 'center', color: 'white' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, display: 'block', marginBottom: 16 }} />
        </div>
      }>
        <VipSuccessContent />
      </Suspense>
    </div>
  )
}
