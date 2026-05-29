'use client'

import { motion } from 'framer-motion'
import { SiteAnnounceBar } from '@/lib/site-config'

const DEFAULT: SiteAnnounceBar = {
  visible: true,
  bg_color: 'navy',
  text: 'Free shipping on orders over $75',
  highlight: 'Use code KRSELLIFY10 for 10% off',
  suffix: 'Limited time only',
}

export default function AnnounceBar({ config = DEFAULT }: { config?: SiteAnnounceBar }) {
  if (!config.visible) return null

  const bg = config.bg_color === 'teal'
    ? 'linear-gradient(90deg, var(--teal-dark), var(--teal))'
    : config.bg_color === 'red'
      ? 'linear-gradient(90deg, #7f1d1d, #dc2626)'
      : 'linear-gradient(90deg, #020c18 0%, #071c30 50%, #020c18 100%)'

  const items = [
    { text: config.text, icon: 'fa-truck-fast' },
    { text: config.highlight, icon: 'fa-tag', gold: true },
    { text: config.suffix, icon: 'fa-clock' },
  ]

  return (
    <motion.div
      initial={{ y: -36, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: bg, borderBottom: '1px solid rgba(202,138,4,0.15)', color: 'var(--white)', overflow: 'hidden', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', height: 36, display: 'flex', alignItems: 'center', position: 'relative' }}>

      {/* Gold shimmer */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 5 }}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 20%, rgba(202,138,4,0.06) 50%, transparent 80%)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Scrolling text */}
      <motion.div
        animate={{ x: ['0%', '-33.333%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} style={{ paddingRight: 72, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <i className={`fa-solid ${item.icon}`} style={{ color: item.gold ? 'var(--gold)' : 'var(--teal-light)', fontSize: 10 }} />
            <span style={{ color: item.gold ? 'var(--gold)' : 'rgba(255,255,255,0.82)' }}>{item.text}</span>
          </span>
        ))}
      </motion.div>
    </motion.div>
  )
}
