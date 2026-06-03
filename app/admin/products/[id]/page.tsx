'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import AuthGuard from '@/components/AuthGuard'
import { Product } from '@/lib/types'
import { getBrowserSupabase } from '@/lib/supabase-browser'

export default function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGuard adminOnly>
      <ProductEditor id={id} />
    </AuthGuard>
  )
}

const CATEGORIES = [
  { value: 'medallions',   label: 'Medallions' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'crypto',       label: 'Crypto' },
  { value: 'apparel',      label: 'Apparel' },
  { value: 'accessories',  label: 'Accessories' },
]

const inputCls: React.CSSProperties = {
  width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '11px 14px',
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const labelCls: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase',
  letterSpacing: '0.08em', display: 'block', marginBottom: 6,
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => onChange(!checked)}>
      <div style={{ width: 42, height: 24, borderRadius: 12, background: checked ? 'var(--teal)' : 'var(--gray)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <motion.div animate={{ x: checked ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>{label}</span>
    </div>
  )
}

function ProductPreview({ product }: { product: Partial<Product> }) {
  const [imgError, setImgError] = useState(false)
  useEffect(() => setImgError(false), [product.img])
  return (
    <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(9,52,89,0.1)', maxWidth: 260 }}>
      <div style={{ position: 'relative', height: 200, background: 'var(--gray)' }}>
        {product.img && !imgError ? (
          <Image src={product.img} alt={product.name ?? ''} fill style={{ objectFit: 'cover' }} onError={() => setImgError(true)} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)', fontSize: 40 }}>
            <i className="fa-solid fa-image" />
          </div>
        )}
        {product.is_sale && <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--sale-red)', color: 'white', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20 }}>SALE</span>}
        {!product.is_sale && product.is_new && <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--navy)', color: 'white', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20 }}>NEW</span>}
      </div>
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 5 }}>{product.cat_label || 'Category'}</p>
        <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-dark)', marginBottom: 10, lineHeight: 1.35, minHeight: 36 }}>{product.name || 'Product Name'}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: 'var(--heading)' }}>${Number(product.price || 0).toFixed(2)}</span>
            {product.old_price && <span style={{ fontSize: 12, color: 'var(--text-light)', textDecoration: 'line-through', marginLeft: 6 }}>${Number(product.old_price).toFixed(2)}</span>}
          </div>
          <span style={{ background: 'var(--navy)', color: 'white', padding: '6px 14px', borderRadius: 50, fontSize: 11, fontWeight: 700 }}>Buy Now</span>
        </div>
        {product.in_stock === false && <span style={{ marginTop: 8, display: 'inline-block', fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 10 }}>Out of Stock</span>}
      </div>
    </div>
  )
}

function ProductEditor({ id }: { id: string }) {
  const router = useRouter()
  const isNew = id === 'new'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName]             = useState('')
  const [category, setCategory]     = useState('collectibles')
  const [catLabel, setCatLabel]     = useState('Collectibles')
  const [price, setPrice]           = useState('')
  const [oldPrice, setOldPrice]     = useState('')
  const [gallery, setGallery]       = useState<string[]>([])
  const [pasteUrl, setPasteUrl]     = useState('')
  const [description, setDescription] = useState('')
  const [isSale, setIsSale]         = useState(false)
  const [isNew_, setIsNew_]         = useState(false)
  const [inStock, setInStock]       = useState(true)
  const [rating, setRating]         = useState(5)
  const [reviews, setReviews]       = useState(0)
  const [loading, setLoading]       = useState(!isNew)
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState('')
  const [saved, setSaved]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [token, setToken]           = useState('')

  useEffect(() => {
    getBrowserSupabase().auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? '')
    })
  }, [])

  useEffect(() => {
    if (isNew) { setLoading(false); return }
    if (!token) return
    fetch('/api/admin/products', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then((products: Product[]) => {
        const p = products.find(p => p.id === id)
        if (p) {
          setName(p.name); setCategory(p.category); setCatLabel(p.cat_label)
          setPrice(p.price.toString()); setOldPrice(p.old_price?.toString() ?? '')
          const existing = p.images?.length ? p.images : (p.img ? [p.img] : [])
          setGallery(existing)
          setIsSale(p.is_sale); setIsNew_(p.is_new)
          setInStock(p.in_stock); setRating(p.rating); setReviews(p.reviews_count)
          setDescription(p.description ?? '')
        }
        setLoading(false)
      })
  }, [id, isNew, token])

  function handleCatChange(val: string) {
    setCategory(val)
    const found = CATEGORIES.find(c => c.value === val)
    if (found) setCatLabel(found.label)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { setError(`${file.name} is over 5MB — skipped.`); continue }
    }
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024)
    if (!valid.length) return

    setUploading(true)
    setError('')
    setUploadProgress(0)

    try {
      const supabase = getBrowserSupabase()
      const uploaded: string[] = []

      for (let i = 0; i < valid.length; i++) {
        const file = valid[i]
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const progressInterval = setInterval(() => {
          setUploadProgress(p => Math.min(p + 15, 85))
        }, 200)

        const { data, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

        clearInterval(progressInterval)

        if (uploadError) { setError(`Upload failed: ${uploadError.message}`); continue }

        setUploadProgress(Math.round(((i + 1) / valid.length) * 100))

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path)

        uploaded.push(publicUrl)
      }

      if (uploaded.length) setGallery(prev => [...prev, ...uploaded])
      setTimeout(() => setUploadProgress(0), 800)
    } catch {
      setError('Upload failed. Check your Supabase storage bucket is set up.')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function addPasteUrl() {
    const url = pasteUrl.trim()
    if (!url) return
    setGallery(prev => [...prev, url])
    setPasteUrl('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !price || gallery.length === 0) { setError('Name, price, and at least one photo are required.'); return }
    setSaving(true); setError('')
    const body = {
      id: isNew ? undefined : id,
      name, category, cat_label: catLabel,
      price: parseFloat(price),
      old_price: oldPrice ? parseFloat(oldPrice) : null,
      img: gallery[0],
      images: gallery,
      description: description || null,
      is_sale: isSale, is_new: isNew_,
      in_stock: inStock, rating, reviews_count: reviews,
    }
    const res = await fetch('/api/admin/products', {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => router.push('/admin'), 1000)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save product.')
    }
    setSaving(false)
  }

  const preview: Partial<Product> = { name, category, cat_label: catLabel, price: parseFloat(price) || 0, old_price: oldPrice ? parseFloat(oldPrice) : null, img: gallery[0] ?? '', is_sale: isSale, is_new: isNew_, in_stock: inStock }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--off-white)' }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--teal)' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      {/* header */}
      <div style={{ background: 'var(--navy)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.push('/admin')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 16px', borderRadius: 50, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-arrow-left" /> Back to Admin
        </button>
        <a href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 900, color: 'white', textDecoration: 'none' }}>
          Maga <span style={{ color: 'var(--teal-light)' }}>Offers</span>
          <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--sale-red)', padding: '2px 8px', borderRadius: 20, marginLeft: 8, verticalAlign: 'middle' }}>ADMIN</span>
        </a>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 28px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        {/* form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 30, fontWeight: 900, color: 'var(--heading)', marginBottom: 24 }}>
            {isNew ? 'Add New Product' : 'Edit Product'}
          </h1>

          <form onSubmit={save}>
            {/* Basic Info */}
            <div style={{ background: 'var(--white)', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(9,52,89,0.06)', marginBottom: 20 }}>
              <p style={{ fontWeight: 700, color: 'var(--heading)', marginBottom: 18, fontSize: 14 }}>Basic Info</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelCls}>Product Name *</label>
                  <input style={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bitcoin Diamond 2025" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelCls}>Category *</label>
                    <select style={{ ...inputCls, cursor: 'pointer' }} value={category} onChange={e => handleCatChange(e.target.value)}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelCls}>Display Label</label>
                    <input style={inputCls} value={catLabel} onChange={e => setCatLabel(e.target.value)} placeholder="Crypto" />
                  </div>
                </div>
                <div>
                  <label style={labelCls}>Description <span style={{ fontWeight: 400, textTransform: 'none' }}>— shown on product page</span></label>
                  <textarea
                    style={{ ...inputCls, height: 96, resize: 'vertical', lineHeight: 1.6 }}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe this product — materials, significance, what makes it special…"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div style={{ background: 'var(--white)', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(9,52,89,0.06)', marginBottom: 20 }}>
              <p style={{ fontWeight: 700, color: 'var(--heading)', marginBottom: 18, fontSize: 14 }}>Pricing</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelCls}>Price ($) *</label>
                  <input style={inputCls} type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="199.00" required />
                </div>
                <div>
                  <label style={labelCls}>Original Price ($) <span style={{ fontWeight: 400, textTransform: 'none' }}>— leave blank if no discount</span></label>
                  <input style={inputCls} type="number" min="0" step="0.01" value={oldPrice} onChange={e => setOldPrice(e.target.value)} placeholder="999.00" />
                </div>
              </div>
            </div>

            {/* Gallery */}
            <div style={{ background: 'var(--white)', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(9,52,89,0.06)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--heading)', fontSize: 14, marginBottom: 3 }}>Product Photos</p>
                  <p style={{ fontSize: 12, color: 'var(--text-light)' }}>First photo is the main image shown in cards. Add up to 8 photos.</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>{gallery.length} / 8</span>
              </div>

              {/* Existing gallery grid */}
              {gallery.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {gallery.map((src, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: i === 0 ? '2.5px solid var(--teal)' : '2px solid var(--gray)', background: 'var(--gray)' }}>
                      <Image src={src} alt="" fill style={{ objectFit: 'cover' }} sizes="120px" />
                      {i === 0 && (
                        <span style={{ position: 'absolute', bottom: 5, left: 5, background: 'var(--teal)', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main</span>
                      )}
                      <button type="button"
                        onClick={() => setGallery(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, padding: 0 }}>
                        <i className="fa-solid fa-xmark" />
                      </button>
                      {i > 0 && (
                        <button type="button"
                          onClick={() => setGallery(prev => { const a = [...prev]; [a[0], a[i]] = [a[i], a[0]]; return a })}
                          style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white', borderRadius: 6, padding: '2px 5px', cursor: 'pointer', fontSize: 9, fontWeight: 700 }}>
                          SET MAIN
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              {gallery.length < 8 && (
                <>
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{ border: '2px dashed var(--teal)', borderRadius: 14, padding: '20px', textAlign: 'center', cursor: uploading ? 'wait' : 'pointer', marginBottom: 14, background: 'rgba(88,148,143,0.03)', transition: 'background 0.2s' }}
                    onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = 'rgba(88,148,143,0.07)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(88,148,143,0.03)' }}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
                    {uploading ? (
                      <div>
                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--teal)', marginBottom: 8, display: 'block' }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', marginBottom: 6 }}>Uploading…</p>
                        <div style={{ height: 5, background: 'var(--gray)', borderRadius: 3, overflow: 'hidden', maxWidth: 180, margin: '0 auto' }}>
                          <motion.div animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }}
                            style={{ height: '100%', background: 'var(--teal)', borderRadius: 3 }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 24, color: 'var(--teal)', marginBottom: 8, display: 'block' }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--heading)', marginBottom: 3 }}>Click to upload photos</p>
                        <p style={{ fontSize: 11, color: 'var(--text-light)' }}>Select multiple — JPG, PNG, WebP — max 5MB each</p>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--gray)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600 }}>OR PASTE URL</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--gray)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inputCls, flex: 1 }} value={pasteUrl} onChange={e => setPasteUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPasteUrl() } }}
                      placeholder="https://example.com/photo.jpg" />
                    <button type="button" onClick={addPasteUrl}
                      style={{ background: 'var(--teal)', color: 'white', border: 'none', padding: '11px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      Add
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Status & Flags */}
            <div style={{ background: 'var(--white)', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(9,52,89,0.06)', marginBottom: 20 }}>
              <p style={{ fontWeight: 700, color: 'var(--heading)', marginBottom: 18, fontSize: 14 }}>Status & Flags</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Toggle checked={inStock} onChange={setInStock} label="In Stock" />
                <Toggle checked={isSale} onChange={setIsSale} label="On Sale (shows red SALE badge)" />
                <Toggle checked={isNew_} onChange={setIsNew_} label="New Arrival (shows NEW badge)" />
              </div>
            </div>

            {/* Ratings */}
            <div style={{ background: 'var(--white)', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(9,52,89,0.06)', marginBottom: 24 }}>
              <p style={{ fontWeight: 700, color: 'var(--heading)', marginBottom: 18, fontSize: 14 }}>Ratings</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelCls}>Rating (1–5)</label>
                  <select style={{ ...inputCls, cursor: 'pointer' }} value={rating} onChange={e => setRating(Number(e.target.value))}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelCls}>Review Count</label>
                  <input style={inputCls} type="number" min="0" value={reviews} onChange={e => setReviews(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }} />{error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button type="submit" disabled={saving || saved || uploading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ width: '100%', background: saved ? '#059669' : 'var(--navy)', color: 'white', border: 'none', padding: '15px', borderRadius: 50, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background 0.2s', opacity: uploading ? 0.6 : 1 }}>
              {saved ? <><i className="fa-solid fa-check" /> Saved! Redirecting…</> : saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : <><i className="fa-solid fa-floppy-disk" /> {isNew ? 'Create Product' : 'Save Changes'}</>}
            </motion.button>
          </form>
        </motion.div>

        {/* live preview */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          style={{ position: 'sticky', top: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Live Preview</p>
          <ProductPreview product={preview} />
          <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 10, textAlign: 'center' }}>Updates as you type</p>
        </motion.div>
      </div>
    </div>
  )
}
