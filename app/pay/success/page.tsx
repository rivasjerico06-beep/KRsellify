import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Payment received — PATRIOT’S ONLINE SHOP',
  robots: { index: false, follow: false },
}

/**
 * Where Lemon Squeezy sends the customer after paying. Anyone can open this
 * URL directly, so it only says thank you — it must never grant anything on
 * its own. Lemon Squeezy emails the receipt itself.
 */
export default function PaySuccessPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f2441 0%, #093451 50%, #0a3d5c 100%)', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 'clamp(28px, 6vw, 40px) clamp(20px, 6vw, 48px)', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #34d399, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <i className="fa-solid fa-check" style={{ fontSize: 32, color: 'white' }} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: '#0f2441', marginBottom: 10 }}>
          Thank you!
        </h1>
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
          Your payment went through. A receipt from Lemon Squeezy is on its way to your inbox.
        </p>
        <Link href="/shop" style={{ display: 'inline-block', background: '#0f2441', color: 'white', padding: '14px 32px', borderRadius: 50, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
          Continue shopping →
        </Link>
      </div>
    </div>
  )
}
