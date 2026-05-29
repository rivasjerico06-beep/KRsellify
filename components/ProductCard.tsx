'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { Product } from '@/lib/types'
import Stars from '@/components/Stars'

export default function ProductCard({ product, index }: { product: Product; index: number }) {
  const { cart, addToCart, heartToggle, showToast, setCartOpen } = useCart()
  const inWishlist = cart.some(i => i.id === product.id && i.via === 'heart')
  const [imgLoaded, setImgLoaded] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useTransform(my, [-0.5, 0.5], [6, -6])
  const rotateY = useTransform(mx, [-0.5, 0.5], [-6, 6])
  const glowRef = useRef<HTMLDivElement>(null)

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    mx.set(nx); my.set(ny)
    if (glowRef.current) {
      const gx = (nx + 0.5) * 100
      const gy = (ny + 0.5) * 100
      glowRef.current.style.background = `radial-gradient(circle 130px at ${gx}% ${gy}%, rgba(202,138,4,0.09) 0%, transparent 65%)`
      glowRef.current.style.opacity = '1'
    }
  }

  function onMouseLeave() {
    mx.set(0); my.set(0); setHovered(false)
    if (glowRef.current) glowRef.current.style.opacity = '0'
  }

  function handleHeart() {
    heartToggle(product)
    if (!inWishlist) { showToast(`Added to wishlist`); setCartOpen(true) }
    else showToast('Removed from wishlist')
  }

  function handleBuy() {
    addToCart(product, 'btn')
    showToast(`${product.name} added to cart`)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1300)
  }

  const savings = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: (index % 4) * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 900, position: 'relative', zIndex: 0 }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}>

      <motion.div
        whileHover={{ y: -7, boxShadow: '0 22px 52px rgba(9,52,89,0.16)' }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        style={{ background: 'var(--white)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(9,52,89,0.07)', cursor: 'pointer', position: 'relative', border: '1px solid transparent' }}>

        {/* Dynamic glow */}
        <div ref={glowRef} style={{ position: 'absolute', inset: 0, borderRadius: 20, pointerEvents: 'none', zIndex: 1, opacity: 0, transition: 'opacity 0.25s' }} />

        {/* Gold border reveal on hover */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ position: 'absolute', inset: 0, borderRadius: 20, border: '1.5px solid rgba(202,138,4,0.3)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Image */}
        <Link href={`/products/${product.id}`} style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{ position: 'relative', height: 228, overflow: 'hidden', background: 'var(--gray)' }}>
            {!imgLoaded && (
              <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)', zIndex: 2 }} />
            )}
            <motion.div animate={{ opacity: imgLoaded ? 1 : 0 }} style={{ position: 'absolute', inset: 0 }}>
              <motion.div whileHover={{ scale: 1.07 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ position: 'absolute', inset: 0 }}>
                <Image src={product.img} alt={product.name} fill style={{ objectFit: 'cover' }}
                  onLoad={() => setImgLoaded(true)}
                  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 25vw" />
              </motion.div>
            </motion.div>

            {/* Subtle gradient overlay on image */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(9,52,89,0.22) 0%, transparent 60%)', zIndex: 2, pointerEvents: 'none' }} />

            {/* Badges */}
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, zIndex: 3 }}>
              {product.is_sale && savings > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                  style={{ background: 'var(--sale-red)', color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.04em' }}>
                  -{savings}%
                </motion.span>
              )}
              {!product.is_sale && product.is_new && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                  style={{ background: 'var(--navy)', color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20 }}>
                  NEW
                </motion.span>
              )}
            </div>

            {/* Heart */}
            <motion.button onClick={e => { e.preventDefault(); handleHeart() }} whileTap={{ scale: 1.45 }}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              animate={inWishlist
                ? { background: 'var(--sale-red)', color: 'white', boxShadow: '0 4px 14px rgba(224,84,84,0.5)' }
                : { background: 'rgba(255,255,255,0.92)', color: 'var(--text-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              style={{ position: 'absolute', top: 12, right: 12, border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
              <i className={`fa-${inWishlist ? 'solid' : 'regular'} fa-heart`} />
            </motion.button>
          </div>
        </Link>

        {/* Body */}
        <Link href={`/products/${product.id}`} style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{ padding: '16px 18px 10px' }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 5 }}>{product.cat_label}</p>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)', marginBottom: 8, lineHeight: 1.38, minHeight: 38 }}>{product.name}</h3>
            <div style={{ fontSize: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Stars rating={product.rating} />
              <span style={{ color: 'var(--text-light)', fontSize: 11 }}>({product.reviews_count})</span>
            </div>
          </div>
        </Link>

        {/* Price + CTA row */}
        <div style={{ padding: '0 18px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 24, fontWeight: 700, color: 'var(--heading)' }}>
              ${product.price.toFixed(2)}
            </span>
            {product.old_price && (
              <span style={{ fontSize: 12, color: 'var(--text-light)', textDecoration: 'line-through', marginLeft: 6 }}>
                ${product.old_price.toFixed(2)}
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.button
              key={justAdded ? 'added' : 'buy'}
              onClick={e => { e.preventDefault(); handleBuy() }}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              whileHover={!justAdded ? { background: 'var(--gold)', scale: 1.05, boxShadow: '0 4px 18px rgba(202,138,4,0.45)' } : {}}
              whileTap={{ scale: 0.96 }}
              style={{
                background: justAdded ? '#059669' : 'var(--navy)',
                color: 'white', border: 'none', padding: '9px 18px', borderRadius: 50,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
                textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.22s',
              }}>
              {justAdded
                ? <><i className="fa-solid fa-check" /> Added</>
                : <><i className="fa-solid fa-cart-plus" /> Buy</>}
            </motion.button>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
