'use client'

import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { FlyToCartProvider } from '@/components/FlyToCart'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <FlyToCartProvider>
            {children}
          </FlyToCartProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
