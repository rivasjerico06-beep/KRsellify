'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  motion, useScroll, useTransform,
  useInView, AnimatePresence,
} from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

/* ── tiny helpers ───────────────────────────────────── */

function useCounter(target: number) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    let v = 0
    const step = target / 90
    const id = setInterval(() => {
      v += step
      if (v >= target) { setVal(target); clearInterval(id) }
      else setVal(Math.floor(v))
    }, 18)
    return () => clearInterval(id)
  }, [inView, target])
  return { ref, val }
}

/* ── static data ────────────────────────────────────── */

/* Deterministic positions — no Math.random to avoid hydration mismatch */
const PX = [12,87,43,65,29,78,55,91,18,67,34,82,48,73,23,96,39,14,58,84,27,71,45,62,8,94,31,76,52,19,88,41,69,25,97,36]
const PY = [8,72,45,91,33,68,15,84,52,27,79,41,96,23,61,47,88,13,64,38,75,19,92,55,30,83,48,7,71,44,98,26,59,87,22,66]
const PS = [2,3.5,1.8,2.8,1.5,3,2.2,3.8,2,2.6,1.7,3.2,2.4,3,1.6,3.6,2,2.8,1.9,3.4,2.1,3,2.3,1.8,3.1,2.7,1.6,3.3,2,2.9,1.7,3.5,2.2,3,1.8,2.6]
const PD = [0,2.1,0.8,3.2,1.4,0.3,2.5,1.8,0.6,3,1,2.3,0.5,1.9,3.5,0.9,2.8,1.2,3.8,0.4,2,1.6,0.2,3.1,1.5,0.7,2.4,1.1,3.6,0.8,2.2,1.7,0.3,3,1.3,2.7]
const PARTICLES = Array.from({ length: 36 }, (_, i) => ({
  id: i, x: PX[i], y: PY[i], size: PS[i], delay: PD[i], gold: i % 3 === 0,
}))

const TICKER = [
  'Premium Collectibles', 'Crypto Memorabilia', 'Gold Bars',
  'Limited Editions', 'Authenticated Pieces', 'Worldwide Shipping',
  'Museum-Grade Quality', 'Unique Gift Ideas', '100% Verified',
]

const FEATURES = [
  { icon: 'fa-gem', label: 'Premium Craftsmanship', body: 'Gold-plated, diamond-accented, museum-grade finishes crafted to last lifetimes.', grad: 'linear-gradient(135deg,#CA8A04,#f59e0b)' },
  { icon: 'fa-shield-halved', label: '100% Authenticated', body: 'Every piece comes with a Certificate of Authenticity — zero counterfeits, ever.', grad: 'linear-gradient(135deg,#093459,#0e4a80)' },
  { icon: 'fa-box-open', label: 'Luxury Unboxing', body: 'Custom velvet-lined gift box on every order — perfect for collectors and gift-givers alike.', grad: 'linear-gradient(135deg,#58948f,#3d6f6a)' },
  { icon: 'fa-fire', label: 'Limited Editions', body: 'Rare, limited quantities. Once they\'re gone, they\'re gone. Own it before someone else does.', grad: 'linear-gradient(135deg,#dc2626,#ef4444)' },
  { icon: 'fa-truck-fast', label: 'Worldwide Shipping', body: 'Fully insured, tracked delivery to 50+ countries. Your treasure arrives safely, guaranteed.', grad: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  { icon: 'fa-headset', label: 'White-Glove Service', body: 'Concierge support helps you find the perfect piece. Nothing short of exceptional.', grad: 'linear-gradient(135deg,#0d5c4f,#10b981)' },
]

const PRODUCTS = [
  { name: 'Bitcoin Diamond 2025', price: '$399', old: '$999', img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328754/5762178888.webp', badge: 'BEST SELLER', badgeClr: '#CA8A04' },
  { name: 'XRP Nesara Gesara Gold Bar', price: '$199', old: null, img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835331760/5762187052.webp', badge: 'NEW ARRIVAL', badgeClr: '#10b981' },
  { name: 'Trump 1000 BTC Gold Bar', price: '$199', old: '$1999', img: 'https://d2j6dbq0eux0bg.cloudfront.net/images/136003751/products/835328757/5762187026.webp', badge: 'HOT DEAL', badgeClr: '#ef4444' },
]

const STATS: { target: number; suffix: string; label: string; divBy?: number }[] = [
  { target: 12400, suffix: '+', label: 'Happy Collectors' },
  { target: 500, suffix: '+', label: 'Unique Pieces' },
  { target: 50, suffix: '+', label: 'Countries Shipped' },
  { target: 49, suffix: '★', label: 'Average Rating', divBy: 10 },
]

const REVIEWS = [
  { text: 'I ordered the Bitcoin Diamond and it exceeded all expectations. The packaging was gorgeous and the piece itself is stunning.', name: 'Kristy R.', role: 'Collector', avatar: 'https://i.pravatar.cc/100?img=47' },
  { text: 'The gold bar arrived beautifully packaged. As a coin collector, this is one of the most beautiful commemorative pieces I\'ve ever seen.', name: 'William C.', role: 'Investor', avatar: 'https://i.pravatar.cc/100?img=33' },
  { text: 'Got the Trump gold bar as a gift for my father and he absolutely loves it. The quality is unmatched. 10/10 would recommend!', name: 'Sarah M.', role: 'Gift Buyer', avatar: 'https://i.pravatar.cc/100?img=25' },
]

/* ── sub-components ──────────────────────────────────── */

function FloatParticle({ p }: { p: typeof PARTICLES[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, p.gold ? 0.8 : 0.35, 0], y: [0, -140], x: [0, (p.id % 2 === 0 ? 1 : -1) * 30] }}
      transition={{ duration: 3.5 + p.delay * 0.4, repeat: Infinity, delay: p.delay, ease: 'easeOut' }}
      style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: '50%', background: p.gold ? 'var(--gold)' : 'rgba(88,148,143,0.7)', boxShadow: p.gold ? '0 0 8px rgba(202,138,4,0.9)' : 'none', pointerEvents: 'none' }}
    />
  )
}

function FeatureCard({ f, i }: { f: typeof FEATURES[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [hov, setHov] = useState(false)
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48, scale: 0.94 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${hov ? 'rgba(202,138,4,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, padding: '32px 28px', cursor: 'default', transition: 'all 0.35s ease', position: 'relative', overflow: 'hidden' }}>
      <motion.div animate={{ opacity: hov ? 1 : 0 }} transition={{ duration: 0.3 }} style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(202,138,4,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ width: 52, height: 52, borderRadius: 14, background: f.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.3)' : '0 4px 14px rgba(0,0,0,0.2)', transition: 'box-shadow 0.35s' }}>
        <i className={`fa-solid ${f.icon}`} style={{ color: 'white', fontSize: 20 }} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 10, lineHeight: 1.2 }}>{f.label}</h3>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{f.body}</p>
    </motion.div>
  )
}

function ProductCard3D({ p, i }: { p: typeof PRODUCTS[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [hov, setHov] = useState(false)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    setTilt({
      ry: ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 12,
      rx: -((e.clientY - r.top - r.height / 2) / (r.height / 2)) * 8,
    })
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 900, flexShrink: 0, width: 280 }}>
      <motion.div
        onMouseMove={onMove}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setTilt({ rx: 0, ry: 0 }) }}
        animate={{ rotateX: tilt.rx, rotateY: tilt.ry, boxShadow: hov ? '0 30px 70px rgba(0,0,0,0.5), 0 0 30px rgba(202,138,4,0.15)' : '0 10px 40px rgba(0,0,0,0.3)' }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', cursor: 'pointer' }}>

        {/* Badge */}
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, background: p.badgeClr, color: 'white', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', padding: '5px 10px', borderRadius: 6 }}>{p.badge}</div>

        {/* Image */}
        <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
          <motion.div animate={{ scale: hov ? 1.06 : 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={{ height: '100%' }}>
            <Image src={p.img} alt={p.name} fill style={{ objectFit: 'cover' }} />
          </motion.div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,31,55,0.7) 0%, transparent 50%)' }} />
        </div>

        {/* Info */}
        <div style={{ padding: '20px 22px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>KRsellify Exclusive</p>
          <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 21, fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: 14 }}>{p.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 28, fontWeight: 700, color: 'var(--gold)' }}>{p.price}</span>
              {p.old && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>{p.old}</span>}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1,2,3,4,5].map(s => <i key={s} className="fa-solid fa-star" style={{ color: 'var(--gold)', fontSize: 9 }} />)}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatItem({ s }: { s: typeof STATS[0] }) {
  const { ref, val } = useCounter(s.target)
  const display = s.divBy ? (val / s.divBy).toFixed(1) : val.toLocaleString()
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(52px,6vw,80px)', fontWeight: 700, color: 'var(--gold)', lineHeight: 1, marginBottom: 8 }}>
        <span ref={ref}>{display}</span>{s.suffix}
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{s.label}</p>
    </div>
  )
}

/* ── section components ──────────────────────────────── */

function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const fadeOut = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)

  const onMove = useCallback((e: MouseEvent) => {
    setMouseX((e.clientX / window.innerWidth - 0.5) * 18)
    setMouseY((e.clientY / window.innerHeight - 0.5) * 12)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [onMove])

  return (
    <div ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

      {/* Background with parallax */}
      <motion.div style={{ position: 'absolute', inset: 0, y: bgY }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 70% at 50% 40%, rgba(9,52,89,0.95) 0%, #020c18 65%)' }} />
        <div style={{ position: 'absolute', top: '15%', left: '8%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(202,138,4,0.07) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,148,143,0.09) 0%, transparent 70%)', filter: 'blur(35px)' }} />
        <div style={{ position: 'absolute', top: '60%', left: '60%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(202,138,4,0.05) 0%, transparent 70%)', filter: 'blur(25px)' }} />
      </motion.div>

      {/* Grid lines */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(202,138,4,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(202,138,4,0.025) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }} />

      {/* Particles */}
      {PARTICLES.map(p => <FloatParticle key={p.id} p={p} />)}

      {/* Corner ornaments */}
      <div style={{ position: 'absolute', top: 40, left: 40, width: 60, height: 60, borderTop: '1.5px solid rgba(202,138,4,0.4)', borderLeft: '1.5px solid rgba(202,138,4,0.4)' }} />
      <div style={{ position: 'absolute', top: 40, right: 40, width: 60, height: 60, borderTop: '1.5px solid rgba(202,138,4,0.4)', borderRight: '1.5px solid rgba(202,138,4,0.4)' }} />
      <div style={{ position: 'absolute', bottom: 40, left: 40, width: 60, height: 60, borderBottom: '1.5px solid rgba(202,138,4,0.4)', borderLeft: '1.5px solid rgba(202,138,4,0.4)' }} />
      <div style={{ position: 'absolute', bottom: 40, right: 40, width: 60, height: 60, borderBottom: '1.5px solid rgba(202,138,4,0.4)', borderRight: '1.5px solid rgba(202,138,4,0.4)' }} />

      {/* Main content */}
      <motion.div
        style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '120px 28px 160px', maxWidth: 860, opacity: fadeOut, y: contentY, x: mouseX * 0.4, translateY: mouseY * 0.3 }}>

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(202,138,4,0.1)', border: '1px solid rgba(202,138,4,0.35)', borderRadius: 50, padding: '8px 22px', marginBottom: 36, backdropFilter: 'blur(16px)' }}>
            <i className="fa-solid fa-crown" style={{ color: 'var(--gold)', fontSize: 10 }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--gold)' }}>Premium Collectibles — Est. 2024</span>
            <i className="fa-solid fa-crown" style={{ color: 'var(--gold)', fontSize: 10 }} />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(56px, 9.5vw, 124px)', fontWeight: 700, lineHeight: 1.02, color: 'white', marginBottom: 8, letterSpacing: '-0.025em' }}>
          Own Pieces
          <br />
          of{' '}
          <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #CA8A04 0%, #fbbf24 45%, #f59e0b 70%, #CA8A04 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', backgroundSize: '200% 100%' }}>
            History.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.55 }}
          style={{ fontSize: 'clamp(15px,1.9vw,20px)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, maxWidth: 560, margin: '28px auto 52px' }}>
          KRsellify curates the world's most exceptional crypto memorabilia, gold bars, and rare medallions — each piece authenticated, limited, and ready to become your legacy.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.72 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>

          <Link href="/" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.06, boxShadow: '0 0 50px rgba(202,138,4,0.55), 0 8px 30px rgba(202,138,4,0.35)' }}
              whileTap={{ scale: 0.96 }}
              style={{ background: 'linear-gradient(135deg, #CA8A04 0%, #f59e0b 100%)', color: '#020c18', border: 'none', borderRadius: 50, padding: '17px 44px', fontSize: 14, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(202,138,4,0.3)', transition: 'none' }}>
              <i className="fa-solid fa-bag-shopping" style={{ fontSize: 14 }} />
              Shop Now
              <motion.i
                className="fa-solid fa-arrow-right"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: 12 }} />
            </motion.button>
          </Link>

          <Link href="/about" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.5)' }}
              whileTap={{ scale: 0.96 }}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '17px 38px', fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer', backdropFilter: 'blur(16px)', display: 'inline-flex', alignItems: 'center', gap: 9, transition: 'all 0.3s ease' }}>
              <i className="fa-solid fa-book-open" style={{ fontSize: 13 }} />
              Our Story
            </motion.button>
          </Link>
        </motion.div>

        {/* Social proof mini */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          style={{ marginTop: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: -6 }}>
            {['47','33','12','25','68'].map((n, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(202,138,4,0.5)', marginLeft: i === 0 ? 0 : -8, position: 'relative', zIndex: 5 - i }}>
                <Image src={`https://i.pravatar.cc/64?img=${n}`} alt="customer" width={32} height={32} style={{ objectFit: 'cover' }} />
              </div>
            ))}
          </div>
          <div style={{ height: 24, width: 1, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', gap: 3 }}>
            {[1,2,3,4,5].map(i => <i key={i} className="fa-solid fa-star" style={{ color: 'var(--gold)', fontSize: 11 }} />)}
          </div>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Trusted by <strong style={{ color: 'white' }}>12,400+</strong> collectors worldwide</span>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Scroll</span>
        <motion.div
          animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 1, height: 44, background: 'linear-gradient(to bottom, var(--gold), transparent)', transformOrigin: 'top' }} />
      </motion.div>
    </div>
  )
}

function TickerSection() {
  return (
    <div style={{ background: 'linear-gradient(90deg, #CA8A04, #f59e0b, #CA8A04)', padding: '13px 0', overflow: 'hidden' }}>
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'flex', whiteSpace: 'nowrap' }}>
        {[...TICKER, ...TICKER].map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 18, paddingRight: 40 }}>
            <i className="fa-solid fa-diamond" style={{ fontSize: 7, color: '#020c18', opacity: 0.7 }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#020c18' }}>{t}</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

function WhySection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  return (
    <div style={{ background: '#061f37', padding: '110px 28px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)' }}>Why Choose Us</span>
            <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(38px,5vw,68px)', fontWeight: 700, color: 'white', lineHeight: 1.1, marginBottom: 20 }}>
            The KRsellify
            <br />
            <span style={{ background: 'linear-gradient(135deg, var(--gold), #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Difference</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
            We don't just sell collectibles — we deliver experiences, authenticity, and pieces that outlast generations.
          </p>
        </motion.div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => <FeatureCard key={f.label} f={f} i={i} />)}
        </div>
      </div>
    </div>
  )
}

function FeaturedSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <div style={{ background: 'linear-gradient(180deg, #020c18 0%, #061f37 100%)', padding: '110px 28px', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 60 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)' }}>Bestsellers</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(34px,4.5vw,60px)', fontWeight: 700, color: 'white', lineHeight: 1.15 }}>
              Our Most<br />
              <span style={{ background: 'linear-gradient(135deg, var(--gold), #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Coveted Pieces</span>
            </h2>
          </div>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ background: 'rgba(202,138,4,0.12)', borderColor: 'var(--gold)' }}
              style={{ background: 'transparent', color: 'var(--gold)', border: '1.5px solid rgba(202,138,4,0.4)', borderRadius: 50, padding: '12px 28px', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.3s ease' }}>
              View All <i className="fa-solid fa-arrow-right" style={{ fontSize: 11 }} />
            </motion.button>
          </Link>
        </motion.div>

        {/* Cards — horizontal scroll on mobile */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {PRODUCTS.map((p, i) => <ProductCard3D key={p.name} p={p} i={i} />)}
        </div>
      </div>
    </div>
  )
}

function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <div style={{ background: '#020c18', borderTop: '1px solid rgba(202,138,4,0.12)', borderBottom: '1px solid rgba(202,138,4,0.12)', padding: '90px 28px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(9,52,89,0.4) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 48, position: 'relative' }}>
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}>
            <StatItem s={s} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

function TestimonialSection() {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  useEffect(() => {
    const t = setInterval(() => setActive(v => (v + 1) % REVIEWS.length), 5000)
    return () => clearInterval(t)
  }, [])

  const r = REVIEWS[active]

  return (
    <div ref={ref} style={{ background: '#061f37', padding: '110px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(202,138,4,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)' }}>Customer Love</span>
          <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(34px,4.5vw,58px)', fontWeight: 700, color: 'white', marginBottom: 60, lineHeight: 1.2 }}>
          Real Stories,<br />
          <span style={{ background: 'linear-gradient(135deg, var(--gold), #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Real People</span>
        </h2>
      </motion.div>

      <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }}>
        {/* Big quote mark */}
        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 200, lineHeight: 0.6, color: 'var(--gold)', opacity: 0.07, position: 'absolute', top: -20, left: -20, pointerEvents: 'none', userSelect: 'none' }}>"</span>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 24 }}>
              {[1,2,3,4,5].map(i => <i key={i} className="fa-solid fa-star" style={{ color: 'var(--gold)', fontSize: 13 }} />)}
            </div>
            <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(20px,2.5vw,28px)', fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, marginBottom: 36, fontWeight: 400 }}>
              "{r.text}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(202,138,4,0.5)', position: 'relative', flexShrink: 0 }}>
                <Image src={r.avatar} alt={r.name} fill style={{ objectFit: 'cover' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{r.name}</p>
                <p style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{r.role}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
          {REVIEWS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{ width: i === active ? 24 : 8, height: 8, borderRadius: 4, background: i === active ? 'var(--gold)' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <div ref={ref} style={{ background: '#020c18', padding: '120px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Background glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(202,138,4,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(202,138,4,0.4), transparent)' }} />

      {/* Floating orbs */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', left: `${15 + i * 14}%`, top: `${20 + (i % 2) * 55}%`, boxShadow: '0 0 12px rgba(202,138,4,0.8)', pointerEvents: 'none' }} />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)' }}>Ready to Collect</span>
          <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
        </div>

        <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(44px,6vw,82px)', fontWeight: 700, color: 'white', lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em' }}>
          Your Next Legendary<br />
          <span style={{ background: 'linear-gradient(135deg, #CA8A04 0%, #fbbf24 50%, #CA8A04 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Piece Awaits.</span>
        </h2>

        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: 52 }}>
          Join thousands of collectors who trust KRsellify for the rarest, most beautiful pieces in the world. Limited stock. Unlimited prestige.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.07, boxShadow: '0 0 60px rgba(202,138,4,0.55), 0 12px 40px rgba(202,138,4,0.3)' }}
              whileTap={{ scale: 0.96 }}
              style={{ background: 'linear-gradient(135deg, #CA8A04 0%, #f59e0b 100%)', color: '#020c18', border: 'none', borderRadius: 50, padding: '20px 52px', fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 36px rgba(202,138,4,0.35)', transition: 'none' }}>
              <i className="fa-solid fa-bag-shopping" />
              Browse the Collection
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 13 }} />
            </motion.button>
          </Link>
        </div>

        {/* Trust signals */}
        <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: 'fa-shield-halved', label: '100% Authentic' },
            { icon: 'fa-truck-fast', label: 'Insured Shipping' },
            { icon: 'fa-rotate-left', label: '30-Day Returns' },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500 }}>
              <i className={`fa-solid ${t.icon}`} style={{ color: 'var(--gold)', fontSize: 13 }} />
              {t.label}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function LandingFooter() {
  return (
    <div style={{ background: '#010811', borderTop: '1px solid rgba(202,138,4,0.12)', padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em' }}>KRSELLIFY</p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© {new Date().getFullYear()} KRsellify. All rights reserved.</p>
      <div style={{ display: 'flex', gap: 20 }}>
        {[['/', 'Shop'], ['/about', 'About'], ['/faq', 'FAQ'], ['/contact', 'Contact']].map(([href, label]) => (
          <Link key={href} href={href} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ── main export ─────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div style={{ background: '#061f37', overflowX: 'hidden' }}>
      <HeroSection />
      <TickerSection />
      <WhySection />
      <FeaturedSection />
      <StatsSection />
      <TestimonialSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  )
}
