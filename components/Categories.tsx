'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useMotionValue, useTransform } from 'framer-motion'

const CATS = [
  { icon: 'fa-medal',        name: 'Medallions',   count: 12, cat: 'medallions',  brand: false },
  { icon: 'fa-gem',          name: 'Collectibles', count: 8,  cat: 'collectibles', brand: false },
  { icon: 'fa-bitcoin',      name: 'Crypto',       count: 6,  cat: 'crypto',       brand: true  },
  { icon: 'fa-shirt',        name: 'Apparel',      count: 15, cat: 'apparel',      brand: false },
  { icon: 'fa-clock',        name: 'Accessories',  count: 10, cat: 'accessories',  brand: false },
  { icon: 'fa-bag-shopping', name: 'All Items',    count: 51, cat: 'all',          brand: false },
]

const CAT_GRADIENTS: Record<string, string> = {
  medallions:   'linear-gradient(135deg, #CA8A04, #d97706)',
  collectibles: 'linear-gradient(135deg, #0e4a80, #2563eb)',
  crypto:       'linear-gradient(135deg, #d97706, #ef4444)',
  apparel:      'linear-gradient(135deg, #58948F, #0d5c4f)',
  accessories:  'linear-gradient(135deg, #6d28d9, #9333ea)',
  all:          'linear-gradient(135deg, #0a1e33, #093459)',
}

// filterCat is kept for on-page use; CategoryCard uses router to /shop

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

type Cat = typeof CATS[number]

function CategoryCard({ c }: { c: Cat }) {
  const router = useRouter()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-0.5, 0.5], [9, -9])
  const rotateY = useTransform(x, [-0.5, 0.5], [-9, 9])
  const [hovered, setHovered] = useState(false)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left - r.width / 2) / (r.width / 2))
    y.set((e.clientY - r.top - r.height / 2) / (r.height / 2))
  }
  function onLeave() { x.set(0); y.set(0); setHovered(false) }

  return (
    <motion.div variants={cardVariants} style={{ perspective: 800 }}>
      <motion.div
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onLeave}
        onClick={() => router.push(`/shop?cat=${c.cat}`)}
        whileHover={{ boxShadow: '0 22px 52px rgba(202,138,4,0.16)', borderColor: 'rgba(202,138,4,0.5)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.25 }}
        style={{ background: 'var(--white)', borderRadius: 20, padding: '32px 16px 26px', textAlign: 'center', cursor: 'pointer', border: '1.5px solid var(--gray)', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', fontFamily: 'inherit', rotateX, rotateY, position: 'relative', overflow: 'hidden', userSelect: 'none' }}>

        {/* inner glow on hover */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(88,148,143,0.08) 0%, transparent 65%)', pointerEvents: 'none', borderRadius: 20 }} />

        {/* Icon with gradient bg */}
        <motion.div
          animate={{ y: hovered ? -4 : 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: CAT_GRADIENTS[c.cat] || 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.22)' : '0 4px 14px rgba(0,0,0,0.12)', transition: 'box-shadow 0.3s' }}>
            <i className={`${c.brand ? 'fa-brands' : 'fa-solid'} ${c.icon}`} style={{ color: 'white', fontSize: 26 }} />
          </div>
        </motion.div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{c.name}</div>
        <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>{c.count} items</div>
      </motion.div>
    </motion.div>
  )
}

export default function Categories() {
  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', padding: '68px 28px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>Browse by Type</p>
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900, color: 'var(--navy)' }}>Shop by Category</h2>
          </div>
          <a href="/shop" style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', borderBottom: '2px solid var(--teal)', paddingBottom: 2, textDecoration: 'none' }}>
            View All <i className="fa-solid fa-arrow-right" />
          </a>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
        {CATS.map(c => <CategoryCard key={c.cat} c={c} />)}
      </motion.div>
    </div>
  )
}
