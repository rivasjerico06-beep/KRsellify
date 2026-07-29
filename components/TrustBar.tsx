'use client'

import { motion } from 'framer-motion'
import { SiteTrustItem } from '@/lib/site-config'

const DEFAULT: SiteTrustItem[] = [
  { icon: 'fa-truck-fast',  title: 'Free Shipping',  sub: 'On orders over $75' },
  { icon: 'fa-lock',        title: 'Secure Payment', sub: '256-bit SSL encryption' },
  { icon: 'fa-rotate-left', title: 'Easy Returns',   sub: '30-day return policy' },
  { icon: 'fa-star',        title: '4.9/5 Rated',    sub: '2,400+ happy customers' },
]

export default function TrustBar({ items = DEFAULT }: { items?: SiteTrustItem[] }) {
  const list = items.length > 0 ? items : DEFAULT

  return (
    <div style={{
      background: 'linear-gradient(90deg, #020c16 0%, #0a1e33 50%, #020c16 100%)',
      borderBottom: '1px solid rgba(202,138,4,0.12)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Gold shimmer sweep */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'linear', repeatDelay: 7 }}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 20%, rgba(202,138,4,0.04) 50%, transparent 80%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* One column per item only while they still fit. Forcing all four onto
          a phone gave each ~80px, which wrapped "Free Shipping" onto three
          lines and squeezed the last item down to its icon. */}
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 0, position: 'relative', zIndex: 1 }}>
        {list.map((item, i) => (
          <motion.div key={item.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRight: i < list.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'default' }}>

            <motion.div
              whileHover={{ scale: 1.18, rotate: [0, -12, 10, -5, 0] }}
              transition={{ duration: 0.4 }}
              style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(202,138,4,0.1)', border: '1px solid rgba(202,138,4,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`fa-solid ${item.icon}`} style={{ fontSize: 16, color: 'var(--gold)' }} />
            </motion.div>

            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>{item.title}</h4>
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.60)' }}>{item.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
