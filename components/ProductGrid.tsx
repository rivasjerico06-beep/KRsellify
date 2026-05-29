'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import ProductCard from './ProductCard'
import { Product } from '@/lib/types'

export default function ProductGrid({ initialProducts }: { initialProducts: Product[] }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(8)

  useEffect(() => {
    function onFilter(e: Event) {
      setFilter((e as CustomEvent).detail)
      setVisible(8)
    }
    function onSearch(e: Event) {
      setSearch((e as CustomEvent).detail)
      setVisible(8)
    }
    window.addEventListener('krsellify:filter', onFilter)
    window.addEventListener('krsellify:search', onSearch)
    return () => {
      window.removeEventListener('krsellify:filter', onFilter)
      window.removeEventListener('krsellify:search', onSearch)
    }
  }, [])

  const filtered = initialProducts.filter(p => {
    const matchCat = filter === 'all' || p.category === filter
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.cat_label.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const shown = filtered.slice(0, visible)

  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', padding: '0 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, gap: 20, flexWrap: 'wrap', paddingTop: 40 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>Founder's Seal Collection</p>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 900, color: 'var(--navy)' }}>Featured Products</h2>
        </div>
        <Link href="/shop" style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', borderBottom: '2px solid var(--teal)', paddingBottom: 2, textDecoration: 'none' }}>
          View All Products <i className="fa-solid fa-arrow-right" />
        </Link>
      </div>

      {filtered.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-light)' }}
        >
          No products found.
        </motion.p>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={filter + search}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 24 }}
          >
            {shown.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {shown.length < filtered.length && (
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <motion.button
            whileHover={{ scale: 1.04, background: 'var(--teal)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setVisible(v => v + 4)}
            style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '14px 36px', borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Load More Products
          </motion.button>
        </div>
      )}
    </div>
  )
}
