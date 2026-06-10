'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { SiteNewsletter } from '@/lib/site-config'

const DEFAULT: SiteNewsletter = {
  heading: 'Stay in the Loop',
  subheading: 'Get notified about new arrivals, exclusive deals, and limited-edition drops straight to your inbox.',
}

export default function Newsletter({ config = DEFAULT }: { config?: SiteNewsletter }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useCart()
  const { heading, subheading } = config

  async function subscribe() {
    if (!email || !email.includes('@')) { showToast('Please enter a valid email address'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (res.ok || data.message === 'Already subscribed') {
        showToast(`✓ You're subscribed! Check ${email} for a welcome gift.`)
        setEmail('')
      } else {
        showToast('Something went wrong. Please try again.')
      }
    } catch {
      showToast('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative', background: 'linear-gradient(135deg, var(--teal-dark) 0%, var(--teal) 50%, #2a7d78 100%)', padding: '72px 28px', overflow: 'hidden' }}>
      {/* animated orbs */}
      <motion.div animate={{ x: [0, 40, 0], y: [0, -20, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '-30%', left: '10%', width: 380, height: 380, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <motion.div animate={{ x: [0, -30, 0], y: [0, 25, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', bottom: '-40%', right: '5%', width: 460, height: 460, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>

        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: 36, marginBottom: 16, display: 'inline-block', color: 'rgba(255,255,255,0.9)' }}>
          <i className="fa-solid fa-envelope-open-text" />
        </motion.div>

        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(28px,4vw,42px)', color: 'white', fontWeight: 900, marginBottom: 12, lineHeight: 1.1 }}>
          {heading}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, marginBottom: 32, lineHeight: 1.65 }}>
          {subheading}
        </p>

        <div style={{ display: 'flex', gap: 0, borderRadius: 50, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: '2px solid rgba(255,255,255,0.15)' }}>
          <input
            type="email"
            placeholder="Enter your email address…"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && subscribe()}
            style={{ flex: 1, border: 'none', padding: '15px 24px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'rgba(255,255,255,0.95)' }}
          />
          <motion.button onClick={subscribe} disabled={loading}
            whileHover={{ background: '#020e1a' }}
            whileTap={{ scale: 0.97 }}
            style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '15px 28px', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', transition: 'background 0.2s' }}>
            <i className="fa-solid fa-paper-plane" /> {loading ? 'Subscribing…' : 'Subscribe'}
          </motion.button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 14 }}>
          No spam, ever. Unsubscribe anytime. <i className="fa-solid fa-lock" style={{ marginLeft: 4 }} />
        </p>
      </motion.div>
    </div>
  )
}
