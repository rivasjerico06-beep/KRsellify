'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Cart from '@/components/Cart'
import Toast from '@/components/Toast'
import ProductCard from '@/components/ProductCard'
import Link from 'next/link'
import { Product } from '@/lib/types'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'medallions', label: 'Medallions' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'accessories', label: 'Accessories' },
]

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') ?? ''
  const initialCat = searchParams.get('cat') ?? 'all'

  const [query, setQuery] = useState(initialQ)
  const [inputVal, setInputVal] = useState(initialQ)
  const [category, setCategory] = useState(initialCat)
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'newest'>('relevance')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProducts = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=50`)
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      setProducts([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts(query)
  }, [query, fetchProducts])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputVal.trim()
    setQuery(q)
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false })
  }

  const filtered = products.filter(p => {
    if (category !== 'all' && p.category !== category) return false
    if (!query) return true
    const q = query.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.cat_label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price
    if (sortBy === 'price_desc') return b.price - a.price
    if (sortBy === 'newest') return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    return 0
  })

  return (
    <main style={{ minHeight: '80vh', background: 'var(--off-white)', padding: '40px 28px 80px' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, fontSize: 13, color: 'var(--text-light)' }}>
          <Link href="/" style={{ color: 'var(--teal)', fontWeight: 600 }}>Home</Link>
          <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
          <span style={{ color: 'var(--heading)', fontWeight: 700 }}>Search</span>
        </div>

        {/* Search bar */}
        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', gap: 0, border: '2.5px solid var(--navy)', borderRadius: 50, overflow: 'hidden', maxWidth: 640, boxShadow: '0 4px 20px rgba(9,52,89,0.12)' }}>
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Search products…"
              autoFocus
              style={{ flex: 1, border: 'none', outline: 'none', padding: '14px 24px', fontSize: 16, fontFamily: 'inherit', background: 'var(--white)' }}
            />
            <button type="submit"
              style={{ background: 'var(--navy)', border: 'none', padding: '0 28px', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontWeight: 700 }}>
              <i className="fa-solid fa-magnifying-glass" />
              <span style={{ fontSize: 14 }}>Search</span>
            </button>
          </div>
        </motion.form>

        {/* Filters row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          {/* Category filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {CATEGORIES.map(c => (
              <motion.button key={c.value} onClick={() => setCategory(c.value)}
                whileTap={{ scale: 0.96 }}
                style={{ border: category === c.value ? '2px solid var(--teal)' : '2px solid var(--gray)', background: category === c.value ? 'var(--teal)' : 'var(--white)', color: category === c.value ? 'white' : 'var(--text-mid)', padding: '7px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                {c.label}
              </motion.button>
            ))}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            style={{ border: '2px solid var(--gray)', borderRadius: 50, padding: '8px 20px', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', background: 'var(--white)', color: 'var(--text-mid)', fontWeight: 600 }}>
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {/* Results header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            {query ? (
              <p style={{ fontSize: 15, color: 'var(--text-mid)' }}>
                {loading ? 'Searching…' : (
                  <>
                    <strong style={{ color: 'var(--heading)' }}>{sorted.length}</strong> result{sorted.length !== 1 ? 's' : ''} for{' '}
                    <strong style={{ color: 'var(--heading)' }}>"{query}"</strong>
                    {category !== 'all' && <> in <strong style={{ color: 'var(--teal)' }}>{CATEGORIES.find(c => c.value === category)?.label}</strong></>}
                  </>
                )}
              </p>
            ) : (
              <p style={{ fontSize: 15, color: 'var(--text-mid)' }}>
                Showing <strong style={{ color: 'var(--heading)' }}>{sorted.length}</strong> products
                {category !== 'all' && <> in <strong style={{ color: 'var(--teal)' }}>{CATEGORIES.find(c => c.value === category)?.label}</strong></>}
              </p>
            )}
          </div>
          {query && (
            <button onClick={() => { setQuery(''); setInputVal(''); router.replace('/search') }}
              style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
              <i className="fa-solid fa-xmark" /> Clear search
            </button>
          )}
        </div>

        {/* Products grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24 }}>
              {Array.from({ length: 8 }, (_, i) => (
                <motion.div key={i} animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
                  style={{ background: 'var(--white)', borderRadius: 18, height: 340, boxShadow: '0 2px 10px rgba(9,52,89,0.06)' }} />
              ))}
            </motion.div>
          ) : sorted.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', padding: '64px 20px' }}>
              <div style={{ fontSize: 64, color: 'var(--gray)', marginBottom: 20 }}>
                <i className="fa-solid fa-magnifying-glass" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)', marginBottom: 10 }}>
                No results found
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-mid)', maxWidth: 360, margin: '0 auto 28px', lineHeight: 1.7 }}>
                {query ? `We couldn't find anything for "${query}".` : 'Try searching for a product name or category.'}
              </p>
              <Link href="/#products">
                <motion.button whileHover={{ background: 'var(--teal)' }} whileTap={{ scale: 0.97 }}
                  style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '14px 32px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'inherit', transition: 'background 0.2s' }}>
                  Browse All Products
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            <motion.div key={`${query}-${category}-${sortBy}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24 }}>
              {sorted.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--teal)' }} />
        </div>
      }>
        <SearchResults />
      </Suspense>
      <Footer />
      <Cart />
      <Toast />
    </>
  )
}
