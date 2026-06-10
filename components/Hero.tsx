'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import Image from 'next/image'
import { SiteHeroSlide } from '@/lib/site-config'

const DEFAULT_SLIDES: SiteHeroSlide[] = [
  {
    img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80',
    eyebrow: 'New Arrivals · 2025 Collection',
    title: 'Premium Collectibles & Rare Finds',
    sub: 'Handpicked limited-edition pieces. Authentic, verified, and ready to own.',
    cta: 'Shop Now', ctaLink: '/shop',
    outline: 'Explore Categories', outlineLink: '#categories',
  },
  {
    img: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1400&q=80',
    eyebrow: "Founder's Seal Collection",
    title: 'Gold & Crypto Commemorative Bars',
    sub: 'Own a piece of history. Limited mint. Ships worldwide.',
    cta: 'View Collection', ctaLink: '/shop',
    outline: 'Learn More', outlineLink: '#about',
  },
  {
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80',
    eyebrow: 'Exclusive Deal · Save up to 80%',
    title: 'D.O.G.E Coin & Bitcoin Diamond',
    sub: "The most sought-after crypto collectibles. Get yours before they're gone.",
    cta: 'Grab the Deal', ctaLink: '/shop?cat=crypto',
    outline: 'See All Deals', outlineLink: '/shop',
  },
]

interface Particle { id: number; x: number; y: number; size: number; dur: number; delay: number; drift: number; gold: boolean }

function ParticleField() {
  const [list, setList] = useState<Particle[]>([])
  useEffect(() => {
    setList(Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.2 + 0.8,
      dur: Math.random() * 14 + 8,
      delay: Math.random() * 7,
      drift: (Math.random() - 0.5) * 50,
      gold: i % 3 === 0,
    })))
  }, [])
  if (!list.length) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
      {list.map(p => (
        <motion.div key={p.id}
          animate={{ y: [0, -70, 0], x: [0, p.drift, 0], opacity: [0, p.gold ? 0.75 : 0.45, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: p.gold ? 'rgba(202,138,4,0.9)' : 'rgba(88,148,143,0.9)',
            boxShadow: `0 0 ${p.size * 6}px ${p.gold ? 'rgba(202,138,4,0.5)' : 'rgba(88,148,143,0.4)'}`,
          }} />
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

      {/* Cinematic letterbox */}
      <motion.div initial={{ scaleY: 1 }} animate={{ scaleY: 0 }}
        transition={{ duration: 0.95, ease: [0.87, 0, 0.13, 1] }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '13%', background: '#000', transformOrigin: 'top', zIndex: 30, pointerEvents: 'none' }} />
      <motion.div initial={{ scaleY: 1 }} animate={{ scaleY: 0 }}
        transition={{ duration: 0.95, ease: [0.87, 0, 0.13, 1] }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '13%', background: '#000', transformOrigin: 'bottom', zIndex: 30, pointerEvents: 'none' }} />

      {/* Background image */}
      <AnimatePresence mode="wait">
        <motion.div key={`bg-${current}`}
          style={{ x: bgX, y: bgY, position: 'absolute', inset: '-6%', zIndex: 0 }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
          <Image src={slide.img} alt="" fill style={{ objectFit: 'cover' }} priority={current === 0} sizes="100vw" />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(112deg, rgba(2,14,26,0.96) 0%, rgba(2,14,26,0.72) 46%, rgba(2,14,26,0.18) 100%)', zIndex: 2 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(2,14,26,0.88) 0%, transparent 52%)', zIndex: 2 }} />
      {/* Subtle gold vignette bottom-left */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40%', height: '40%', background: 'radial-gradient(ellipse at bottom left, rgba(202,138,4,0.06) 0%, transparent 70%)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Grid texture */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(88,148,143,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(88,148,143,0.028) 1px, transparent 1px)', backgroundSize: '72px 72px', zIndex: 2, pointerEvents: 'none' }} />

      {/* Teal orb */}
      <motion.div style={{ x: orbX, y: orbY, position: 'absolute', top: '4%', right: '3%', width: 560, height: 560, zIndex: 2, pointerEvents: 'none' }}>
        <motion.div
          animate={{ opacity: [0.2, 0.46, 0.2], scale: [1, 1.18, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,148,143,0.28) 0%, transparent 68%)' }} />
      </motion.div>
      {/* Gold orb */}
      <motion.div style={{ position: 'absolute', bottom: '8%', left: '20%', width: 280, height: 280, zIndex: 2, pointerEvents: 'none' }}
        animate={{ opacity: [0.06, 0.18, 0.06], scale: [1, 1.35, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(202,138,4,0.35) 0%, transparent 70%)' }} />
      </motion.div>

      <ParticleField />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 1340, margin: '0 auto', padding: '0 clamp(20px, 5vw, 60px)', height: '100%', display: 'flex', alignItems: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div key={`txt-${current}`}
            exit={{ opacity: 0, y: -14, filter: 'blur(6px)', transition: { duration: 0.28 } }}
            style={{ maxWidth: 740 }}>

            {/* Eyebrow */}
            <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <motion.div animate={{ scaleX: [0, 1] }} transition={{ duration: 0.45, delay: 0.1 }}
                style={{ width: 40, height: 1.5, background: 'var(--gold)', transformOrigin: 'left', flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--gold)' }}>
                {slide.eyebrow}
              </span>
            </motion.div>

            {/* Title — Cormorant Garamond */}
            <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(44px, 6vw, 88px)', fontWeight: 700, color: '#fff', lineHeight: 1.0, marginBottom: 22, display: 'flex', flexWrap: 'wrap', columnGap: '0.2em', rowGap: '0.04em' }}>
              {words.map((word, i) => (
                <motion.span key={`${current}-w${i}`}
                  initial={{ opacity: 0, y: 64, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.76, delay: 0.1 + i * 0.065, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'inline-block' }}>
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.88, delay: 0.44, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 16, color: 'rgba(255,255,255,0.68)', maxWidth: 480, marginBottom: 44, lineHeight: 1.75 }}>
              {slide.sub}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.58 }}
              style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 48 }}>

              {/* Primary — gold */}
              <motion.a href={slide.ctaLink}
                whileHover={{ scale: 1.06, y: -3, boxShadow: '0 18px 48px rgba(202,138,4,0.55)' }}
                whileTap={{ scale: 0.97 }}
                style={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)', color: 'white', padding: '15px 44px', borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.07em', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 28px rgba(202,138,4,0.4)' }}>
                {slide.cta}
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: 12 }} />
                </motion.span>
              </motion.a>

              {/* Secondary — ghost */}
              <motion.a href={slide.outlineLink}
                whileHover={{ borderColor: 'rgba(202,138,4,0.7)', color: 'var(--gold)', x: 4 }}
                style={{ color: 'rgba(255,255,255,0.78)', border: '1.5px solid rgba(255,255,255,0.24)', padding: '14px 32px', borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'all 0.28s', letterSpacing: '0.05em' }}>
                {slide.outline}
              </motion.a>
            </motion.div>

            {/* Social proof */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.86 }}
              style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ display: 'flex' }}>
                {[47, 33, 25, 68].map((n, i) => (
                  <div key={n} style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', border: '2.5px solid rgba(202,138,4,0.6)', overflow: 'hidden', marginLeft: i > 0 ? -10 : 0, background: '#1a3a5c', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', flexShrink: 0 }}>
                    <Image src={`https://i.pravatar.cc/64?img=${n}`} alt="" fill style={{ objectFit: 'cover' }} sizes="34px" />
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                  {[1,2,3,4,5].map(i => <i key={i} className="fa-solid fa-star" style={{ color: 'var(--gold)', fontSize: 10 }} />)}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)' }}>
                  <strong style={{ color: 'rgba(255,255,255,0.9)' }}>2,400+</strong> happy collectors
                </p>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.72 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, type: 'spring', stiffness: 180, damping: 16 }}
        style={{ position: 'absolute', right: 'clamp(20px, 5vw, 60px)', top: '28%', zIndex: 6 }}>
        <motion.div style={{ x: badgeX, y: badgeY }}>
          <div style={{ background: 'rgba(6,31,55,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(202,138,4,0.3)', borderRadius: 22, padding: '18px 24px', color: 'white', textAlign: 'center', minWidth: 148 }}>
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.65, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', margin: '0 auto 10px', boxShadow: '0 0 14px rgba(34,197,94,0.8)' }} />
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.92)' }}>Limited Stock</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.48)', marginTop: 3 }}>Order before it&apos;s gone</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Slide indicators */}
      <div style={{ position: 'absolute', right: 'clamp(12px, 2vw, 20px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        {SLIDES.map((_, i) => (
          <motion.button key={i} onClick={() => setCurrent(i)}
            animate={{
              height: i === current ? 28 : 6,
              background: i === current ? 'var(--gold)' : 'rgba(255,255,255,0.25)',
              boxShadow: i === current ? '0 0 10px rgba(202,138,4,0.6)' : 'none',
            }}
            transition={{ duration: 0.3 }}
            style={{ width: 3, borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0 }} />
        ))}
      </div>

      {/* Nav arrows */}
      <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 clamp(8px, 1.5vw, 16px)', zIndex: 10, pointerEvents: 'none' }}>
        {[-1, 1].map((dir, i) => (
          <motion.button key={i} onClick={() => go(dir)}
            whileHover={{ background: 'rgba(202,138,4,0.45)', scale: 1.1, borderColor: 'rgba(202,138,4,0.6)' }}
            whileTap={{ scale: 0.9 }}
            style={{ background: 'rgba(6,31,55,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', width: 48, height: 48, borderRadius: '50%', fontSize: 14, cursor: 'pointer', pointerEvents: 'all', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <i className={`fa-solid fa-chevron-${dir === -1 ? 'left' : 'right'}`} />
          </motion.button>
        ))}
      </div>

      {/* Scroll indicator */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        style={{ position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}>
        <div style={{ width: 22, height: 36, borderRadius: 11, border: '1.5px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 5 }}>
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 3, height: 8, borderRadius: 2, background: 'var(--gold)', opacity: 0.7 }} />
        </div>
        <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>scroll</span>
      </motion.div>
    </div>
  )
}
