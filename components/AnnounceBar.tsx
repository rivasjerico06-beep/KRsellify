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
      ? 'linear-gradient(90deg, #9b1c1c, #dc2626)'
      : 'linear-gradient(90deg, var(--navy), #0f3d5e)'

  const items = [
    `⭐ ${config.text}`,
    `🎁 ${config.highlight}`,
    `⚡ ${config.suffix}`,
  ]

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: bg, color: 'var(--white)', overflow: 'hidden', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', height: 36, display: 'flex', alignItems: 'center', position: 'relative' }}
    >
      {/* shimmer overlay */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.07) 50%, transparent 80%)', pointerEvents: 'none', zIndex: 1 }}
      />
      {/* scrolling text */}
      <motion.div
        animate={{ x: ['0%', '-33.333%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'flex', alignItems: 'center', gap: 0, whiteSpace: 'nowrap' }}
      >
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} style={{ paddingRight: 80 }}>
            {item.includes(config.highlight)
              ? <><span style={{ opacity: 0.8 }}>{item.split(config.highlight)[0]}</span><span style={{ color: 'var(--teal-light)' }}>{config.highlight}</span><span style={{ opacity: 0.8 }}>{item.split(config.highlight)[1]}</span></>
              : item}
          </span>
        ))}
      </motion.div>
    </motion.div>
  )
}
