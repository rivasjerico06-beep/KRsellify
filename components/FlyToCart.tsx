'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

interface FlyItem {
  id: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  img?: string
}

interface FlyToCartCtx {
  flyToCart: (el: HTMLElement, img?: string) => void
}

const Ctx = createContext<FlyToCartCtx>({ flyToCart: () => {} })

const SIZE = 44

function FlyingDot({ item }: { item: FlyItem }) {
  const sx = item.fromX - SIZE / 2
  const sy = item.fromY - SIZE / 2
  const ex = item.toX - SIZE / 2
  const ey = item.toY - SIZE / 2
  // Arc control point: rise above both endpoints, biased toward destination X
  const mx = sx + (ex - sx) * 0.55
  const my = Math.min(sy, ey) - 110

  return (
    <motion.div
      initial={{ x: sx, y: sy, scale: 1, opacity: 1 }}
      animate={{
        x: [sx, mx, ex],
        y: [sy, my, ey],
        scale: [1, 0.9, 0.2],
        opacity: [1, 1, 0],
      }}
      transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 1] }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: SIZE,
        height: SIZE,
        borderRadius: '50%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 99999,
        boxShadow: '0 4px 20px rgba(9,52,89,0.45)',
        border: '2.5px solid rgba(255,255,255,0.95)',
      }}
    >
      {item.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #CA8A04, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-cart-plus" style={{ color: 'white', fontSize: 18 }} />
        </div>
      )}
    </motion.div>
  )
}

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FlyItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const flyToCart = useCallback((el: HTMLElement, img?: string) => {
    const cartEl = document.getElementById('kr-cart-btn')
    if (!cartEl) return
    const from = el.getBoundingClientRect()
    const to = cartEl.getBoundingClientRect()
    const id = Date.now() + Math.random()
    setItems(prev => [...prev, {
      id,
      fromX: from.left + from.width / 2,
      fromY: from.top + from.height / 2,
      toX: to.left + to.width / 2,
      toY: to.top + to.height / 2,
      img,
    }])
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 750)
  }, [])

  return (
    <Ctx.Provider value={{ flyToCart }}>
      {children}
      {mounted && items.length > 0 && createPortal(
        items.map(item => <FlyingDot key={item.id} item={item} />),
        document.body
      )}
    </Ctx.Provider>
  )
}

export function useFlyToCart() {
  return useContext(Ctx)
}
