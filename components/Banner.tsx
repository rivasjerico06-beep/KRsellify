'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { SiteBanner } from '@/lib/site-config'

const DEFAULT: SiteBanner = {
  title: 'Why Choose Maga Offers?',
  description: "Every product is authenticated, quality-checked, and shipped with care. We partner with verified suppliers to bring you exclusive collectibles you won't find anywhere else.",
  stats: [
    { num: '2400', label: 'Orders Shipped' },
    { num: '4.9', label: 'Avg. Rating' },
    { num: '100', label: '% Authentic' },
  ],
}

function AnimatedStat({ num, label, delay = 0 }: { num: string; label: string; delay?: number }) {
  const [displayVal, setDisplayVal] = useState('0')
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const rawNum = parseFloat(num.replace(/[^0-9.]/g, '')) || 0
  const decimals = num.includes('.') ? (num.split('.')[1]?.match(/^[0-9]+/)?.[0]?.length ?? 0) : 0

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true) }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const duration = 2200
    const startTime = performance.now()
    function step(now: number) {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = rawNum * eased
      const formatted = rawNum >= 1000
        ? Math.floor(v).toLocaleString()
        : decimals > 0
          ? v.toFixed(decimals)
          : Math.floor(v).toString()
      setDisplayVal(formatted)
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [started, rawNum, decimals])

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}>
      <motion.h3
        style={{ fontFamily: 'var(--font-cormorant)', fontSize: 52, color: 'var(--gold)', fontWeight: 700, lineHeight: 1 }}>
        {rawNum >= 1000 ? displayVal + '+' : displayVal}
      </motion.h3>
      <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.52)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 6 }}>{label}</p>
    </motion.div>
  )
}

export default function Banner({ config = DEFAULT }: { config?: SiteBanner }) {
  const { title, description, stats } = config

  return (
    <div id="about" style={{ background: 'linear-gradient(135deg, #020e1a 0%, var(--navy) 45%, #0d4a44 100%)', padding: '72px 28px', position: 'relative', overflow: 'hidden' }}>
      {/* background grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(88,148,143,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
      {/* glow blob */}
      <motion.div
        animate={{ opacity: [0.15, 0.28, 0.15], x: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '-20%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,148,143,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="kr-banner-grid" style={{ maxWidth: 1340, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--teal-light)', marginBottom: 14 }}>Why Us</p>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(30px,4vw,52px)', color: 'white', fontWeight: 900, lineHeight: 1.08, marginBottom: 20 }}>
            {title}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.68)', fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
            {description}
          </p>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            {stats.map((s, i) => (
              <AnimatedStat key={s.label} num={s.num} label={s.label} delay={0.3 + i * 0.12} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { src: 'https://images.unsplash.com/photo-1622473590773-f588134b6ce7?w=600&q=80', span: 2, h: 160 },
            { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80', span: 1, h: 148 },
            { src: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&q=80', span: 1, h: 148 },
          ].map((img, i) => (
            <motion.div key={i}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
              style={{ gridColumn: img.span === 2 ? 'span 2' : undefined, position: 'relative', height: img.h, borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <Image src={img.src} alt="" fill style={{ objectFit: 'cover', opacity: 0.88 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(2,14,26,0.4) 100%)' }} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
