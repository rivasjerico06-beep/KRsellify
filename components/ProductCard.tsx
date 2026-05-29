'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { Product } from '@/lib/types'

function Stars({ rating }: { rating: number }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i < rating ? 'fa-solid fa-star' : 'fa-regular fa-star'} style={{ color: '#f59e0b', fontSize: 11 }} />
      ))}
    </>
  )
}

export default function ProductCard({ product, index }: { product: Product; index: number }) {
  const { addToCart, heartToggle, isInCart, showToast, setCartOpen } = useCart()
  const inCart = isInCart(product.id)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  // 3D tilt
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useTransform(my, [-0.5, 0.5], [7, -7])
  const rotateY = useTransform(mx, [-0.5, 0.5], [-7, 7])

  const glowRef = useRef<HTMLDivElement>(null)

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    mx.set(nx)
    my.set(ny)
    // update glow position via direct DOM (avoids framer-motion CSS var typing issue)
    if (glowRef.current) {
      const gx = (nx + 0.5) * 100
      const gy = (ny + 0.5) * 100
      glowRef.current.style.background = `radial-gradient(circle 120px at ${gx}% ${gy}%, rgba(88,148,143,0.12) 0%, transparent 65%)`
      glowRef.current.style.opacity = '1'
    }
  }

  function onMouseLeave() {
    mx.set(0)
    my.set(0)
    if (glowRef.current) glowRef.current.style.opacity = '0'
  }

  function handleHeart() {
    heartToggle(product)
    if (!inCart) {
      showToast(`❤️ ${product.name} added to cart!`)
      setCartOpen(true)
    } else {
      showToast('Removed from cart')
    }
  }

  function handleBuy() {
    addToCart(product, 'btn')
    showToast(`✓ ${product.name} added to cart`)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  const savings = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: (index % 4) * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800, position: 'relative', zIndex: 0 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <motion.div
        whileHover={{ y: -8, boxShadow: '0 20px 50px rgba(9,52,89,0.18)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ background: 'var(--white)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 16px rgba(9,52,89,0.07)', cursor: 'pointer', position: 'relative' }}>

        {/* dynamic shimmer glow on hover */}
        <div ref={glowRef}
          style={{ position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none', zIndex: 1, opacity: 0, transition: 'opacity 0.2s' }} />

        {/* image — clicking navigates to product page */}
        <Link href={`/products/${product.id}`} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{ position: 'relative', height: 228, overflow: 'hidden', background: 'var(--gray)' }}>
          {!imgLoaded && (
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', zIndex: 2 }} />
          )}
          <motion.div
            animate={{ opacity: imgLoaded ? 1 : 0 }}
            style={{ position: 'absolute', inset: 0 }}>
            <motion.div whileHover={{ scale: 1.09 }} transition={{ duration: 0.45 }} style={{ position: 'absolute', inset: 0 }}>
              <Image src={product.img} alt={product.name} fill style={{ objectFit: 'cover' }}
                onLoad={() => setImgLoaded(true)}
                sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 25vw" />
            </motion.div>
          </motion.div>

          {/* badges */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, zIndex: 3 }}>
            {product.is_sale && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}
                style={{ background: 'var(--sale-red)', color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Sale {savings > 0 ? `−${savings}%` : ''}
              </motion.span>
            )}
            {!product.is_sale && product.is_new && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}
                style={{ background: 'var(--navy)', color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                New
              </motion.span>
            )}
          </div>

          {/* heart — stopPropagation so it doesn't navigate */}
          <motion.button onClick={e => { e.preventDefault(); handleHeart() }} whileTap={{ scale: 1.5 }}
            animate={inCart
              ? { background: 'var(--sale-red)', color: 'white', boxShadow: '0 4px 16px rgba(224,84,84,0.5)' }
              : { background: 'rgba(255,255,255,0.9)', color: 'var(--text-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            style={{ position: 'absolute', top: 12, right: 12, border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
            <i className={`fa-${inCart ? 'solid' : 'regular'} fa-heart`} />
          </motion.button>
        </div>
        </Link>

        {/* body */}
        <Link href={`/products/${product.id}`} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{ padding: '18px 18px 12px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 6 }}>{product.cat_label}</p>
          <h3 style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-dark)', marginBottom: 9, lineHeight: 1.35, minHeight: 38 }}>{product.name}</h3>

          <div style={{ fontSize: 11, marginBottom: 12, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Stars rating={product.rating} />
            <span style={{ color: 'var(--text-light)', fontSize: 11 }}>({product.reviews_count})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>${product.price.toFixed(2)}</span>
              {product.old_price && (
                <span style={{ fontSize: 13, color: 'var(--text-light)', textDecoration: 'line-through', marginLeft: 6 }}>${product.old_price.toFixed(2)}</span>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.button
                key={justAdded ? 'added' : 'buy'}
                onClick={e => { e.preventDefault(); handleBuy() }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                whileHover={!justAdded ? { background: 'var(--teal)', scale: 1.05, boxShadow: '0 4px 16px rgba(88,148,143,0.4)' } : {}}
                whileTap={{ scale: 0.96 }}
                style={{ background: justAdded ? '#059669' : 'var(--navy)', color: 'white', border: 'none', padding: '9px 18px', borderRadius: 50, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s' }}>
                {justAdded
                  ? <><i className="fa-solid fa-check" /> Added!</>
                  : <><i className="fa-solid fa-cart-plus" /> Buy Now</>}
              </motion.button>
            </AnimatePresence>
          </div>
        </div>
        </Link>
      </motion.div>
    </motion.div>
  )
}
