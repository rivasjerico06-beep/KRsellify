'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useMotionValue, useTransform } from 'framer-motion'
import { Product } from '@/lib/types'
import { useSiteConfig } from '@/context/SiteConfigContext'
import { SiteCategory } from '@/lib/owner-config'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

type Cat = SiteCategory & { count: number }

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
          <div style={{ width: 64, height: 64, borderRadius: 18, background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.22)' : '0 4px 14px rgba(0,0,0,0.12)', transition: 'box-shadow 0.3s' }}>
            <i className={`${c.brand ? 'fa-brands' : 'fa-solid'} ${c.icon}`} style={{ color: 'white', fontSize: 26 }} />
          </div>
        </motion.div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--heading)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{c.name}</div>
        <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>{c.count} items</div>
      </motion.div>
    </motion.div>
  )
}

export default function Categories({ products }: { products: Product[] }) {
  const CATS = useSiteConfig().categories_config.items
  const catsWithCounts: Cat[] = CATS.map(c => ({
    ...c,
    count: c.cat === 'all' ? products.length : products.filter(p => p.category === c.cat).length,
  }))

  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', padding: '68px 28px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 40, textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>Browse by Type</p>
        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900, color: 'var(--heading)', marginBottom: 18 }}>Shop by Category</h2>
        <a href="/shop" style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', borderBottom: '2px solid var(--teal)', paddingBottom: 2, textDecoration: 'none' }}>
          View All <i className="fa-solid fa-arrow-right" />
        </a>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        // Four hard 200px columns plus gaps needs 848px, so on a phone the row
        // ran off the side and dragged the whole page wider than the screen.
        // .mo-cat-grid drops it to two flexible columns under 768px; desktop
        // keeps the original 4 × 200px exactly.
        className="mo-cat-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 200px)', gap: 16, justifyContent: 'center' }}>
        {catsWithCounts.map(c => <CategoryCard key={c.cat} c={c} />)}
      </motion.div>
    </div>
  )
}
