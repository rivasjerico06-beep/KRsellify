'use client'

import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <PayPalScriptProvider options={{
            clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
            currency: 'USD',
            intent: 'capture',
          }}>
            {children}
          </PayPalScriptProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
