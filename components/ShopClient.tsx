'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ProductCard from './ProductCard'
import { Product } from '@/lib/types'

const CATS = [
  { value: 'all',          label: 'All Products' },
  { value: 'medallions',   label: 'Medallions' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'crypto',       label: 'Crypto' },
  { value: 'apparel',      label: 'Apparel' },
  { value: 'accessories',  label: 'Accessories' },
]

type Sort = 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'rating'

export default function ShopClient({ products, initialCat }: { products: Product[]; initialCat: string }) {
  const [cat, setCat]     = useState(CATS.find(c => c.value === initialCat) ? initialCat : 'all')
  const [sort, setSort]   = useState<Sort>('featured')
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(12)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => { setVisible(12) }, [cat, sort, search])

  const filtered = products.filter(p => {
    if (cat !== 'all' && p.category !== cat) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price_asc')  return a.price - b.price
    if (sort === 'price_desc') return b.price - a.price
    if (sort === 'newest')     return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    if (sort === 'rating')     return b.rating - a.rating
    return 0
  })

  const shown = sorted.slice(0, visible)
  const catCounts = Object.fromEntries(
    CATS.map(c => [c.value, c.value === 'all' ? products.length : products.filter(p => p.category === c.value).length])
  )
  const catProducts = cat === 'all' ? products : products.filter(p => p.category === cat)

  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', padding: '40px 28px 80px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: 'var(--text-light)' }}>
          <Link href="/" style={{ color: 'var(--teal)', fontWeight: 600 }}>Home</Link>
          <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
          <span style={{ color: 'var(--heading)', fontWeight: 600 }}>Shop</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 6 }}>
              {cat === 'all' ? 'Full Collection' : CATS.find(c => c.value === cat)?.label}
            </p>
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 900, color: 'var(--heading)' }}>
              {cat === 'all' ? 'All Products' : CATS.find(c => c.value === cat)?.label}
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-light)' }}>
            <strong style={{ color: 'var(--heading)' }}>{filtered.length}</strong> item{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, minWidth: 200, maxWidth: 340, border: '2px solid var(--gray)', borderRadius: 50, overflow: 'hidden', background: 'var(--white)' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-light)', fontSize: 13, padding: '0 12px 0 16px' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{ border: 'none', outline: 'none', flex: 1, padding: '10px 16px 10px 0', fontSize: 14, fontFamily: 'inherit', background: 'transparent' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', padding: '0 14px', cursor: 'pointer', color: 'var(--text-light)', fontSize: 13 }}>
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        {/* Sort */}
        <select value={sort} onChange={e => setSort(e.target.value as Sort)}
          style={{ border: '2px solid var(--gray)', borderRadius: 50, padding: '10px 20px', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', background: 'var(--white)', color: 'var(--text-mid)', fontWeight: 600 }}>
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32, alignItems: 'start' }}>
        {/* Sidebar filters */}
        <aside style={{ position: 'sticky', top: 88 }}>
          <div style={{ background: 'var(--white)', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-mid)', marginBottom: 16 }}>Category</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CATS.map(c => (
                <button key={c.value} onClick={() => setCat(c.value)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: cat === c.value ? 700 : 500, fontSize: 14, background: cat === c.value ? 'rgba(88,148,143,0.1)' : 'transparent', color: cat === c.value ? 'var(--teal)' : 'var(--text-mid)', textAlign: 'left', transition: 'all 0.15s' }}>
                  <span>{c.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: cat === c.value ? 'var(--teal)' : 'var(--gray)', color: cat === c.value ? 'white' : 'var(--text-light)', borderRadius: 50, padding: '1px 8px', minWidth: 24, textAlign: 'center' }}>
                    {catCounts[c.value]}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--gray)', marginTop: 20, paddingTop: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-mid)', marginBottom: 16 }}>Price</p>
              {[
                { label: 'Under $200',      fn: (p: Product) => p.price < 200 },
                { label: '$200 – $400',     fn: (p: Product) => p.price >= 200 && p.price <= 400 },
                { label: 'Over $400',       fn: (p: Product) => p.price > 400 },
              ].map(r => {
                const count = products.filter(p => (cat === 'all' || p.category === cat) && r.fn(p)).length
                return (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-mid)', padding: '6px 0' }}>
                    <span>{r.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-light)' }}>{count}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--gray)', marginTop: 20, paddingTop: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-mid)', marginBottom: 14 }}>Availability</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'On Sale',     count: catProducts.filter(p => p.is_sale).length },
                  { label: 'New Arrivals',count: catProducts.filter(p => p.is_new).length },
                  { label: 'In Stock',    count: catProducts.filter(p => p.in_stock).length },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-mid)' }}>
                    <span>{r.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-light)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <div>
          <AnimatePresence mode="wait">
            {shown.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '64px 20px' }}>
                <div style={{ fontSize: 56, color: 'var(--gray)', marginBottom: 16 }}>
                  <i className="fa-solid fa-box-open" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 800, color: 'var(--heading)', marginBottom: 8 }}>
                  No products found
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-light)', marginBottom: 20 }}>
                  {search ? `No results for "${search}"` : 'No products in this category yet.'}
                </p>
                <button onClick={() => { setSearch(''); setCat('all') }}
                  style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear Filters
                </button>
              </motion.div>
            ) : (
              <motion.div key={`${cat}-${sort}-${search}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 22 }}>
                {shown.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </motion.div>
            )}
          </AnimatePresence>

          {shown.length < sorted.length && (
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 14 }}>
                Showing {shown.length} of {sorted.length}
              </p>
              <motion.button onClick={() => setVisible(v => v + 12)}
                whileHover={{ background: 'var(--teal)' }} whileTap={{ scale: 0.97 }}
                style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '13px 36px', borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
                Load More
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
