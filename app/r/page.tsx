'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { Product } from '@/lib/types'

// Persisted agent referral (read again at checkout to attribute the order).
const REF_KEY = 'themaga_agent_ref'

function ReferralHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const { addToCart, addBundle, updateQty, setCartOpen } = useCart()
  const [msg, setMsg] = useState('Preparing your order…')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const ref  = params.get('ref')
    const add  = params.get('add')
    const tier = params.get('tier')
    const qtyParam = params.get('qty')

    // Store the agent's ID so the eventual order is credited to them.
    if (ref && /^\d{4,6}$/.test(ref)) {
      try { localStorage.setItem(REF_KEY, JSON.stringify({ code: ref, ts: Date.now() })) } catch {}
    }

    function finish(delay = 900) {
      setTimeout(() => { setCartOpen(true); router.replace('/shop') }, delay)
    }

    async function run() {
      if (!add) { finish(300); return }
      try {
        const res = await fetch('/api/products')
        const products: Product[] = await res.json()
        const product = Array.isArray(products)
          ? products.find(p => String(p.id) === String(add))
          : undefined
        if (product) {
          const tierIdx = tier != null ? Number(tier) : NaN
          if (!Number.isNaN(tierIdx) && product.quantity_options && product.quantity_options[tierIdx]) {
            const opt = product.quantity_options[tierIdx]
            addBundle(product, opt.label, opt.qty, opt.bundle_total)
          } else {
            const n = Math.max(1, Math.min(99, parseInt(qtyParam || '1', 10) || 1))
            addToCart(product, 'btn')
            if (n > 1) updateQty(product.id, n - 1)
          }
          setMsg('Added to your cart — taking you to the store…')
        }
      } catch { /* fall through to redirect */ }
      finish()
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, textAlign: 'center' }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 34, color: 'var(--teal)' }} />
      <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--heading)', fontFamily: 'var(--font-playfair)' }}>{msg}</p>
    </div>
  )
}

export default function ReferralPage() {
  return (
    <Suspense fallback={null}>
      <ReferralHandler />
    </Suspense>
  )
}
