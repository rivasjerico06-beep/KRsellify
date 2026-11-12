'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { SiteReview, DEFAULT_REVIEWS } from '@/lib/reviews-config'

function StarRow({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <motion.i key={i}
          className={i < n ? 'fa-solid fa-star' : 'fa-regular fa-star'}
          initial={{ opacity: 0, scale: 0.4 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07, duration: 0.35, type: 'spring', stiffness: 340 }}
          style={{ color: 'var(--gold)', fontSize: 11 }} />
      ))}
    </div>
  )
}

function ReviewCard({ r }: { r: SiteReview }) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 24px 60px rgba(9,52,89,0.15)', borderColor: 'rgba(202,138,4,0.3)' }}
      transition={{ duration: 0.25 }}
      style={{ background: 'var(--white)', borderRadius: 22, padding: '28px 26px', boxShadow: '0 4px 22px rgba(9,52,89,0.08)', width: 324, flexShrink: 0, position: 'relative', overflow: 'hidden', border: '1.5px solid rgba(9,52,89,0.06)', cursor: 'default' }}>

      {/* Gold accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: 'linear-gradient(180deg, var(--gold), transparent)', borderRadius: '22px 0 0 22px' }} />

      {/* Large Cormorant quote mark */}
      <span style={{ fontSize: 130, lineHeight: 0.75, color: 'var(--gold)', opacity: 0.06, fontFamily: 'var(--font-cormorant)', position: 'absolute', top: 4, right: 16, pointerEvents: 'none', userSelect: 'none' }}>"</span>

      <StarRow n={r.stars} />
      <p style={{ fontSize: 13.5, lineHeight: 1.74, color: 'var(--text-mid)', marginBottom: 22, position: 'relative' }}>{r.text}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--gray)', paddingTop: 16 }}>
        <div style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2.5px solid var(--teal)', flexShrink: 0 }}>
          <Image src={r.avatar} alt={r.name} fill unoptimized style={{ objectFit: 'cover' }} />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--heading)' }}>{r.name}</p>
          <p style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <i className="fa-solid fa-circle-check" /> {r.role}
          </p>
        </div>
        {/* Verified badge */}
        <div style={{ marginLeft: 'auto', background: 'rgba(88,148,143,0.08)', borderRadius: 8, padding: '4px 8px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.05em' }}>VERIFIED</span>
        </div>
      </div>
    </motion.div>
  )
}

export default function Testimonials({ reviews = DEFAULT_REVIEWS }: { reviews?: SiteReview[] }) {
  const [paused, setPaused] = useState(false)
  const doubled = [...reviews, ...reviews]

  return (
    <div style={{ background: 'var(--off-white)', padding: '80px 0', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '0 28px', marginBottom: 44 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>Customer Love</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 900, color: 'var(--heading)' }}>
              What Our Customers Say
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--white)', padding: '8px 16px', borderRadius: 50, boxShadow: '0 2px 10px rgba(9,52,89,0.07)', border: '1px solid var(--gray)' }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3,4,5].map(i => <i key={i} className="fa-solid fa-star" style={{ color: 'var(--gold)', fontSize: 10 }} />)}
              </div>
              <strong style={{ fontSize: 13, color: 'var(--heading)' }}>4.9</strong>
              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>· 2,400+ reviews</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Marquee row 1 → */}
      <div style={{ overflow: 'hidden', marginBottom: 20 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}>
        <motion.div
          animate={{ x: paused ? undefined : ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: 20, paddingLeft: 28, width: 'max-content' }}>
          {doubled.map((r, i) => <ReviewCard key={i} r={r} />)}
        </motion.div>
      </div>

      {/* Marquee row 2 ← */}
      <div style={{ overflow: 'hidden' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}>
        <motion.div
          animate={{ x: paused ? undefined : ['-50%', '0%'] }}
          transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: 20, paddingLeft: 28, width: 'max-content' }}>
          {[...doubled].reverse().map((r, i) => <ReviewCard key={i} r={r} />)}
        </motion.div>
      </div>
    </div>
  )
}
