'use client'

import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { SiteConfigProvider } from '@/context/SiteConfigContext'
import { FlyToCartProvider } from '@/components/FlyToCart'
import { SiteConfig } from '@/lib/site-config'

export default function Providers({
  children,
  siteConfig,
}: {
  children: React.ReactNode
  siteConfig: SiteConfig
}) {
  return (
    <SiteConfigProvider config={siteConfig}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <FlyToCartProvider>
              {children}
            </FlyToCartProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </SiteConfigProvider>
  )
}
