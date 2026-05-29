'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import Image from 'next/image'
import { SiteHeroSlide } from '@/lib/site-config'

const DEFAULT_SLIDES: SiteHeroSlide[] = [
  { img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80', eyebrow: '✦ New Arrivals · 2025 Collection', title: 'Premium Collectibles & Rare Finds', sub: 'Handpicked limited-edition pieces. Authentic, verified, and ready to own.', cta: 'Shop Now', ctaLink: '#products', outline: 'Explore Categories', outlineLink: '#categories' },
  { img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1400&q=80', eyebrow: "🔥 Founder's Seal Collection", title: 'Gold & Crypto Commemorative Bars', sub: 'Own a piece of history. Limited mint. Ships worldwide.', cta: 'View Collection', ctaLink: '#products', outline: 'Learn More', outlineLink: '#about' },
  { img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80', eyebrow: '💎 Exclusive Deal · Save up to 80%', title: 'D.O.G.E Coin & Bitcoin Diamond', sub: "The most sought-after crypto collectibles. Get yours before they're gone.", cta: 'Grab the Deal', ctaLink: '#products', outline: 'See All Deals', outlineLink: '#products' },
]

interface Particle { id: number; x: number; y: number; size: number; dur: number; delay: number; drift: number }

function ParticleField() {
  const [list, setList] = useState<Particle[]>([])

  useEffect(() => {
    setList(Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.4 + 0.7,
      dur: Math.random() * 12 + 7,
      delay: Math.random() * 6,
      drift: (Math.random() - 0.5) * 56,
    })))
  }, [])

  if (!list.length) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
      {list.map(p => (
        <motion.div key={p.id}
          animate={{ y: [0, -65, 0], x: [0, p.drift, 0], opacity: [0, 0.55, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: '50%', background: 'rgba(88,148,143,0.95)', boxShadow: `0 0 ${p.size * 5}px rgba(88,148,143,0.5)` }} />
      ))}
    </div>
  )
}

export default function Hero({ slides = DEFAULT_SLIDES }: { slides?: SiteHeroSlide[] }) {
  const SLIDES = slides.length > 0 ? slides : DEFAULT_SLIDES
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const sx = useSpring(mouseX, { stiffness: 28, damping: 22 })
  const sy = useSpring(mouseY, { stiffness: 28, damping: 22 })

  const bgX = useTransform(sx, [0, 1], ['-3%', '3%'])
  const bgY = useTransform(sy, [0, 1], ['-1.5%', '1.5%'])
  const orbX = useTransform(sx, [0, 1], ['-8%', '8%'])
  const orbY = useTransform(sy, [0, 1], ['-4%', '4%'])
  const badgeX = useTransform(sx, [0, 1], ['0px', '-22px'])
  const badgeY = useTransform(sy, [0, 1], ['-10px', '10px'])

  const handleMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    mouseX.set((e.clientX - r.left) / r.width)
    mouseY.set((e.clientY - r.top) / r.height)
  }, [mouseX, mouseY])

  function resetTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCurrent(c => (c + 1) % SLIDES.length), 5500)
  }

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, SLIDES.length])

  function go(dir: number) { setCurrent(c => (c + dir + SLIDES.length) % SLIDES.length) }

  const slide = SLIDES[current]
  const words = slide.title.split(' ')

  return (
    <div ref={containerRef} onMouseMove={handleMouse}
      style={{ position: 'relative', height: 'clamp(600px, 88vh, 820px)', overflow: 'hidden', background: '#020e1a', cursor: 'default' }}>

      {/* Cinematic letterbox reveal — collapses on mount */}
      <motion.div initial={{ scaleY: 1 }} animate={{ scaleY: 0 }}
        transition={{ duration: 0.9, ease: [0.87, 0, 0.13, 1] }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '13%', background: '#000', transformOrigin: 'top', zIndex: 30, pointerEvents: 'none' }} />
      <motion.div initial={{ scaleY: 1 }} animate={{ scaleY: 0 }}
        transition={{ duration: 0.9, ease: [0.87, 0, 0.13, 1] }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '13%', background: '#000', transformOrigin: 'bottom', zIndex: 30, pointerEvents: 'none' }} />

      {/* Parallax background layer */}
      <AnimatePresence mode="wait">
        <motion.div key={`bg-${current}`}
          style={{ x: bgX, y: bgY, position: 'absolute', inset: '-6%', zIndex: 0 }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
          <Image src={slide.img} alt="" fill style={{ objectFit: 'cover' }} priority={current === 0} />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(108deg, rgba(2,14,26,0.94) 0%, rgba(2,14,26,0.68) 44%, rgba(2,14,26,0.2) 100%)', zIndex: 2 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(2,14,26,0.82) 0%, transparent 55%)', zIndex: 2 }} />

      {/* Grid texture */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(88,148,143,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(88,148,143,0.035) 1px, transparent 1px)', backgroundSize: '64px 64px', zIndex: 2, pointerEvents: 'none' }} />

      {/* Floating orb — parallax depth 2 */}
      <motion.div style={{ x: orbX, y: orbY, position: 'absolute', top: '5%', right: '4%', width: 540, height: 540, zIndex: 2, pointerEvents: 'none' }}>
        <motion.div
          animate={{ opacity: [0.22, 0.52, 0.22], scale: [1, 1.18, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,148,143,0.3) 0%, transparent 68%)' }} />
      </motion.div>
      {/* Secondary orb (bottom-left) */}
      <motion.div style={{ position: 'absolute', bottom: '5%', left: '25%', width: 300, height: 300, zIndex: 2, pointerEvents: 'none' }}
        animate={{ opacity: [0.08, 0.22, 0.08], scale: [1, 1.3, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(9,52,89,0.5) 0%, transparent 70%)' }} />
      </motion.div>

      {/* Particle field */}
      <ParticleField />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 1340, margin: '0 auto', padding: '0 clamp(20px, 5vw, 60px)', height: '100%', display: 'flex', alignItems: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div key={`txt-${current}`}
            exit={{ opacity: 0, y: -16, filter: 'blur(6px)', transition: { duration: 0.3 } }}
            style={{ maxWidth: 720 }}>

            {/* Eyebrow */}
            <motion.div initial={{ opacity: 0, x: -26 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <motion.div
                animate={{ scaleX: [0, 1] }} transition={{ duration: 0.45, delay: 0.1 }}
                style={{ width: 36, height: 1.5, background: 'var(--teal-light)', transformOrigin: 'left', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--teal-light)' }}>
                {slide.eyebrow}
              </span>
            </motion.div>

            {/* Word-split animated title */}
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(38px, 5.5vw, 80px)', fontWeight: 900, color: '#fff', lineHeight: 1.04, marginBottom: 24, display: 'flex', flexWrap: 'wrap', columnGap: '0.24em', rowGap: '0.06em' }}>
              {words.map((word, i) => (
                <motion.span key={`${current}-w${i}`}
                  initial={{ opacity: 0, y: 58, filter: 'blur(5px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.72, delay: 0.08 + i * 0.062, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'inline-block' }}>
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.88, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 16, color: 'rgba(255,255,255,0.72)', maxWidth: 486, marginBottom: 44, lineHeight: 1.72 }}>
              {slide.sub}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.56 }}
              style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 48 }}>
              <motion.a href={slide.ctaLink}
                whileHover={{ scale: 1.06, y: -4, boxShadow: '0 20px 48px rgba(88,148,143,0.68)' }}
                whileTap={{ scale: 0.97 }}
                style={{ background: 'var(--teal)', color: 'white', padding: '15px 44px', borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.07em', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 28px rgba(88,148,143,0.45)' }}>
                {slide.cta}
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: 12 }} />
                </motion.span>
              </motion.a>
              <motion.a href={slide.outlineLink}
                whileHover={{ borderColor: 'rgba(88,148,143,0.8)', color: 'var(--teal-light)', x: 4 }}
                style={{ color: 'rgba(255,255,255,0.82)', border: '1.5px solid rgba(255,255,255,0.27)', padding: '14px 32px', borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'all 0.25s', letterSpacing: '0.05em' }}>
                {slide.outline}
              </motion.a>
            </motion.div>

            {/* Social proof strip */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.82 }}
              style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ display: 'flex' }}>
                {[47, 33, 25, 68].map((n, i) => (
                  <div key={n} style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', border: '2.5px solid #020e1a', overflow: 'hidden', marginLeft: i > 0 ? -10 : 0, background: '#1a3a5c', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', flexShrink: 0 }}>
                    <Image src={`https://i.pravatar.cc/64?img=${n}`} alt="" fill style={{ objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                  {[1,2,3,4,5].map(i => <i key={i} className="fa-solid fa-star" style={{ color: '#f59e0b', fontSize: 10 }} />)}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)' }}>
                  <strong style={{ color: 'rgba(255,255,255,0.92)' }}>2,400+</strong> happy collectors
                </p>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating badge — parallax depth 3 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, type: 'spring', stiffness: 180, damping: 16 }}
        style={{ position: 'absolute', right: 'clamp(20px, 5vw, 60px)', top: '30%', zIndex: 6 }}>
        <motion.div style={{ x: badgeX, y: badgeY }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, padding: '18px 24px', color: 'white', textAlign: 'center', minWidth: 138 }}>
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', margin: '0 auto 10px', boxShadow: '0 0 14px rgba(34,197,94,0.75)' }} />
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>Limited Stock</p>
            <p style={{ fontSize: 10, opacity: 0.56, marginTop: 3 }}>Order before it&apos;s gone</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Vertical slide indicators */}
      <div style={{ position: 'absolute', right: 'clamp(12px, 2vw, 22px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        {SLIDES.map((_, i) => (
          <motion.button key={i} onClick={() => setCurrent(i)}
            animate={{ height: i === current ? 28 : 6, background: i === current ? 'var(--teal-light)' : 'rgba(255,255,255,0.28)' }}
            transition={{ duration: 0.3 }}
            style={{ width: 3, borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0 }} />
        ))}
      </div>

      {/* Nav arrows */}
      <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 clamp(8px, 1.5vw, 16px)', zIndex: 10, pointerEvents: 'none' }}>
        {[-1, 1].map((dir, i) => (
          <motion.button key={i} onClick={() => go(dir)}
            whileHover={{ background: 'rgba(88,148,143,0.65)', scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)', color: 'white', width: 48, height: 48, borderRadius: '50%', fontSize: 15, cursor: 'pointer', pointerEvents: 'all', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            <i className={`fa-solid fa-chevron-${dir === -1 ? 'left' : 'right'}`} />
          </motion.button>
        ))}
      </div>

      {/* Scroll indicator — mouse graphic */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
        style={{ position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.28)', pointerEvents: 'none' }}>
        <div style={{ width: 22, height: 36, borderRadius: 11, border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5px' }}>
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 3, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
        </div>
        <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>scroll</span>
      </motion.div>
    </div>
  )
}
