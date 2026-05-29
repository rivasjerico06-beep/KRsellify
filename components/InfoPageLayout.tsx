import Link from 'next/link'
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
        <div style={{ background: 'var(--navy)', padding: '48px 28px 40px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13 }}>
              <Link href="/" style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Home</Link>
              <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{breadcrumb}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, color: 'white', lineHeight: 1.12, marginBottom: subtitle ? 12 : 0 }}>
              {title}
            </h1>
            {subtitle && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 560 }}>{subtitle}</p>}
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 28px 80px' }}>
          {children}
        </div>
      </main>
      <Footer />
      <Cart />
      <Toast />
    </>
  )
}
