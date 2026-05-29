'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Header from './Header'
import Footer from './Footer'
import Cart from './Cart'
import Toast from './Toast'

export default function InfoPageLayout({
  title,
  subtitle,
  breadcrumb,
  children,
}: {
  title: string
  subtitle?: string
  breadcrumb: string
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main style={{ minHeight: '80vh', background: 'var(--off-white)' }}>
        {/* Page hero */}
        <div style={{ background: 'var(--navy)', padding: '52px 28px 44px', overflow: 'hidden', position: 'relative' }}>
          {/* Decorative blobs */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(88,148,143,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: '30%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(202,138,4,0.06)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13 }}>
              <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Home</Link>
              <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{breadcrumb}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, color: 'white', lineHeight: 1.12, marginBottom: subtitle ? 14 : 0 }}>
              {title}
            </motion.h1>

            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 }}
                style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 560 }}>
                {subtitle}
              </motion.p>
            )}
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          style={{ maxWidth: 860, margin: '0 auto', padding: '48px 28px 80px' }}>
          {children}
        </motion.div>
      </main>
      <Footer />
      <Cart />
      <Toast />
    </>
  )
}
