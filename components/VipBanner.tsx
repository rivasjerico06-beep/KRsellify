'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function VipBanner() {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #0f2441 0%, #1a3a5c 40%, #0f3d5a 60%, #0f2441 100%)',
      padding: '11px 20px',
      textAlign: 'center',
      borderBottom: '1px solid rgba(77,217,184,0.3)',
      position: 'relative',
      zIndex: 50,
      overflow: 'hidden',
    }}>
      {/* shimmer sweep */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)', pointerEvents: 'none' }}
      />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <motion.i
          className="fa-solid fa-crown"
          animate={{ scale: [1, 1.18, 1], rotate: [-6, 6, -6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3 }}
          style={{ color: '#fbbf24', fontSize: 13, display: 'inline-block' }}
        />
        <span>
          Unlock <strong style={{ color: '#4dd9b8' }}>30% off every order</strong> with VIP Membership
          <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 6, fontSize: 12 }}>— just $20/month</span>
        </span>
        <Link href="/vip" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(77,217,184,0.18)', color: '#4dd9b8', fontWeight: 800, padding: '4px 14px', borderRadius: 50, border: '1px solid rgba(77,217,184,0.4)', textDecoration: 'none', fontSize: 12, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          Join VIP <i className="fa-solid fa-arrow-right" style={{ fontSize: 10 }} />
        </Link>
      </span>
    </div>
  )
}
