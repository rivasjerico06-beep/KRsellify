'use client'

import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { FlyToCartProvider } from '@/components/FlyToCart'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <FlyToCartProvider>
            <PayPalScriptProvider options={{
              clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
              merchantId: 'FZADET62SVJG4',
              currency: 'USD',
              intent: 'capture',
              'enable-funding': 'card',
            }}>
              {children}
            </PayPalScriptProvider>
          </FlyToCartProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
