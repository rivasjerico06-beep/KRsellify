'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import InfoPageLayout from '@/components/InfoPageLayout'

/* ── Animated counter ─────────────────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1400
    const step = 16
    const increment = to / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= to) { setCount(to); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, step)
    return () => clearInterval(timer)
  }, [inView, to])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/* ── Animated section wrapper ─────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  direction = 'up',
}: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 36 : 0,
      x: direction === 'left' ? -36 : direction === 'right' ? 36 : 0,
    },
    visible: { opacity: 1, y: 0, x: 0 },
  }

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

/* ── Stat card ───────────────────────────────────────────── */
const STATS = [
  { icon: 'fa-shield-check', title: '100% Authentic', body: 'Every product is verified and authenticated before listing.', count: null },
  { icon: 'fa-truck-fast',   title: '1–2 Day Dispatch', body: 'Orders processed and shipped within 1–2 business days worldwide.', count: null },
  { icon: 'fa-users',        title: '2,400+ Collectors', body: 'Happy customers across the globe trust KRSELLIFY for rare finds.', count: 2400 },
  { icon: 'fa-star',         title: '4.9 Star Rating', body: 'Consistently rated 5 stars for quality and customer care.', count: null },
]

function StatCard({ icon, title, body, count, delay }: typeof STATS[number] & { delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(9,52,89,0.14)' }}
      style={{ background: 'var(--white)', borderRadius: 18, padding: '28px 22px', boxShadow: '0 2px 12px rgba(9,52,89,0.07)', textAlign: 'center', cursor: 'default', transition: 'box-shadow 0.25s' }}>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: delay + 0.1 }}
        style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(88,148,143,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <i className={`fa-solid ${icon}`} style={{ color: 'var(--teal)', fontSize: 22 }} />
      </motion.div>

      <h3 style={{ fontWeight: 800, fontSize: 15, color: 'var(--heading)', marginBottom: 6 }}>
        {count ? <Counter to={count} suffix="+" /> : title}
      </h3>
      {count && (
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--teal)', marginBottom: 6 }}>{title}</p>
      )}
      <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.65 }}>{body}</p>
    </motion.div>
  )
}

/* ── Timeline step ───────────────────────────────────────── */
const TIMELINE = [
  { year: '2021', label: 'Founded', body: 'KRSELLIFY was born out of a passion for rare, authenticated collectibles.' },
  { year: '2022', label: 'First 500 Customers', body: 'Word spread fast — our hand-picked inventory drew collectors worldwide.' },
  { year: '2023', label: 'Agent Network Launched', body: 'We built a dedicated agent programme to provide personal buying assistance.' },
  { year: '2024', label: '2,400+ Happy Collectors', body: 'Trusted by thousands, still growing. Every order hand-packed with care.' },
]

/* ── Page ─────────────────────────────────────────────────── */
export default function AboutPage() {
  return (
    <InfoPageLayout title="About KRSELLIFY" subtitle="Premium collectibles, verified and shipped with care." breadcrumb="About">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

        {/* Our Story */}
        <Reveal direction="left">
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '36px 40px', boxShadow: '0 2px 16px rgba(9,52,89,0.07)', position: 'relative', overflow: 'hidden' }}>
            {/* Accent line */}
            <div style={{ position: 'absolute', left: 0, top: 24, bottom: 24, width: 4, borderRadius: 4, background: 'linear-gradient(180deg, var(--teal) 0%, var(--gold) 100%)' }} />
            <div style={{ paddingLeft: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 10 }}>Our Story</p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)', marginBottom: 18, lineHeight: 1.2 }}>
                Started by collectors,<br />built for collectors.
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text-mid)', marginBottom: 14 }}>
                KRSELLIFY was founded with one mission: to make premium collectibles and limited-edition memorabilia accessible to enthusiasts everywhere. What started as a passion for rare finds grew into a trusted marketplace for collectors, investors, and gift buyers worldwide.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text-mid)' }}>
                Every item we carry is hand-picked, authenticated, and quality-checked before it reaches your door. We partner exclusively with verified suppliers to ensure you receive exactly what you pay for — no counterfeits, no surprises.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {STATS.map((s, i) => (
            <StatCard key={s.icon} {...s} delay={i * 0.08} />
          ))}
        </div>

        {/* What We Carry */}
        <Reveal direction="right" delay={0.05}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '36px 40px', boxShadow: '0 2px 16px rgba(9,52,89,0.07)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: 0, top: 24, bottom: 24, width: 4, borderRadius: 4, background: 'linear-gradient(180deg, var(--gold) 0%, var(--teal) 100%)' }} />
            <div style={{ paddingRight: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 10 }}>Our Catalog</p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)', marginBottom: 18, lineHeight: 1.2 }}>
                What We Carry
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text-mid)', marginBottom: 20 }}>
                Our catalog includes gold and silver commemorative bars, crypto-themed collectibles, limited-edition medallions, branded apparel, and exclusive accessories. We update our inventory regularly with new drops — sign up for our newsletter to get notified first.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {['Medallions', 'Collectibles', 'Crypto Items', 'Apparel', 'Accessories'].map((cat, i) => (
                  <motion.span
                    key={cat}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
                    whileHover={{ background: 'var(--teal)', color: 'white', scale: 1.04 }}
                    style={{ background: 'rgba(88,148,143,0.1)', color: 'var(--teal)', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 20, letterSpacing: '0.05em', cursor: 'default', transition: 'background 0.2s, color 0.2s' }}>
                    {cat}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Timeline */}
        <Reveal direction="up" delay={0.05}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '36px 40px', boxShadow: '0 2px 16px rgba(9,52,89,0.07)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 10 }}>Our Journey</p>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)', marginBottom: 28, lineHeight: 1.2 }}>
              How We Got Here
            </h2>

            <div style={{ position: 'relative', paddingLeft: 28 }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 10, top: 8, bottom: 8, width: 2, background: 'linear-gradient(180deg, var(--teal) 0%, var(--navy) 100%)', borderRadius: 2 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {TIMELINE.map((item, i) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{ position: 'relative' }}>
                    {/* Dot */}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 + 0.15, type: 'spring', stiffness: 300 }}
                      style={{ position: 'absolute', left: -26, top: 3, width: 14, height: 14, borderRadius: '50%', background: i === TIMELINE.length - 1 ? 'var(--teal)' : 'var(--navy)', border: '2px solid var(--white)', boxShadow: '0 0 0 2px var(--teal)' }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.1em' }}>{item.year}</span>
                        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--heading)' }}>{item.label}</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.65 }}>{item.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* CTA */}
        <Reveal direction="up" delay={0.05}>
          <div style={{ background: 'linear-gradient(135deg, var(--navy) 0%, #0e4a80 100%)', borderRadius: 20, padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(88,148,143,0.1)', pointerEvents: 'none' }} />
            <motion.i
              className="fa-solid fa-medal"
              initial={{ rotate: -15, scale: 0 }}
              whileInView={{ rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
              style={{ fontSize: 40, color: 'var(--gold)', display: 'block', marginBottom: 16 }} />
            <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 900, color: 'white', marginBottom: 10 }}>
              Ready to Start Collecting?
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 24, lineHeight: 1.7 }}>
              Browse our full catalog of authenticated collectibles and rare finds.
            </p>
            <motion.a
              href="/shop"
              whileHover={{ scale: 1.05, background: 'var(--teal)' }}
              whileTap={{ scale: 0.97 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--gold)', color: 'var(--navy-dark)', padding: '13px 28px', borderRadius: 50, fontSize: 14, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.04em', transition: 'background 0.22s, color 0.22s' }}>
              <i className="fa-solid fa-store" /> Browse the Store
            </motion.a>
          </div>
        </Reveal>

      </div>
    </InfoPageLayout>
  )
}
