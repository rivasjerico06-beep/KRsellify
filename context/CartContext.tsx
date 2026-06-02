'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import { CartItem, Product } from '@/lib/types'
import { getBrowserSupabase } from '@/lib/supabase-browser'

const LS_KEY = 'krsellify_cart'

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (product: Product, via: 'heart' | 'btn') => void
  addBundle: (product: Product, label: string, qty: number, total: number) => void
  heartToggle: (product: Product) => void
  removeFromCart: (id: string) => void
  updateQty: (id: string, delta: number) => void
  clearCart: () => void
  isInCart: (id: string) => boolean
  cartCount: number
  cartTotal: number
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  toast: string
  showToast: (msg: string) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCartRaw]   = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast]       = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate from localStorage once on mount
  useEffect(() => {
    setCartRaw(loadFromStorage())
    setHydrated(true)
  }, [])

  // Persist cart to localStorage on every change (after hydration)
  const setCart = useCallback((updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      }
      return next
    })
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(''), 2800)
  }, [])

  const addToCart = useCallback((product: Product, via: 'heart' | 'btn') => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1, via }]
    })
  }, [setCart])

  const addBundle = useCallback((product: Product, label: string, qty: number, total: number) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(i => i.id === product.id)
      const item: CartItem = { ...product, qty: 1, via: 'btn', bundle_price: total, bundle_label: label, bundle_qty: qty }
      if (existingIdx >= 0) return prev.map((i, idx) => idx === existingIdx ? item : i)
      return [...prev, item]
    })
  }, [setCart])

  const heartToggle = useCallback((product: Product) => {
    setCart(prev => {
      const wishlistItem = prev.find(i => i.id === product.id && i.via === 'heart')
      if (wishlistItem) return prev.filter(i => !(i.id === product.id && i.via === 'heart'))
      return [...prev, { ...product, qty: 1, via: 'heart' }]
    })
  }, [setCart])

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.id !== id))
  }, [setCart])

  const updateQty = useCallback((id: string, delta: number) => {
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
    )
  }, [setCart])

  const clearCart = useCallback(() => {
    setCart([])
  }, [setCart])

  const isInCart = useCallback((id: string) => cart.some(i => i.id === id), [cart])

  // Clear cart when user signs out
  useEffect(() => {
    const supabase = getBrowserSupabase()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setCart([])
    })
    return () => subscription.unsubscribe()
  }, [setCart])

  useEffect(() => {
    function handleOpenCart() { setCartOpen(true) }
    window.addEventListener('krsellify:opencart', handleOpenCart)
    return () => window.removeEventListener('krsellify:opencart', handleOpenCart)
  }, [])

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + (i.bundle_price != null ? i.bundle_price : i.price) * i.qty, 0)

  // Avoid hydration mismatch: render empty cart until localStorage is loaded
  if (!hydrated) {
    return (
      <CartContext.Provider value={{
        cart: [], addToCart, addBundle, heartToggle, removeFromCart, updateQty, clearCart,
        isInCart: () => false, cartCount: 0, cartTotal: 0, cartOpen, setCartOpen, toast, showToast,
      }}>
        {children}
      </CartContext.Provider>
    )
  }

  return (
    <CartContext.Provider value={{
      cart, addToCart, addBundle, heartToggle, removeFromCart, updateQty, clearCart,
      isInCart, cartCount, cartTotal, cartOpen, setCartOpen, toast, showToast,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
