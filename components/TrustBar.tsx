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
    <div style={{ background: 'linear-gradient(90deg, #020e1a 0%, #0b253f 50%, #020e1a 100%)', borderBottom: '1px solid rgba(88,148,143,0.14)', position: 'relative', overflow: 'hidden' }}>
      {/* shimmer sweep */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear', repeatDelay: 6 }}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 20%, rgba(88,148,143,0.05) 50%, transparent 80%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: `repeat(${list.length}, 1fr)`, gap: 0, position: 'relative', zIndex: 1 }}>
        {list.map((item, i) => (
          <motion.div key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ background: 'rgba(88,148,143,0.07)' }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 22px', borderRight: i < list.length - 1 ? '1px solid rgba(88,148,143,0.13)' : 'none', cursor: 'default', transition: 'background 0.3s' }}>

            <motion.div
              whileHover={{ scale: 1.18, rotate: [0, -12, 10, -6, 0] }}
              transition={{ duration: 0.45 }}
              style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(88,148,143,0.1)', border: '1px solid rgba(88,148,143,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`fa-solid ${item.icon}`} style={{ fontSize: 18, color: 'var(--teal-light)' }} />
            </motion.div>

            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 2 }}>{item.title}</h4>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{item.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
