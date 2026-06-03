'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const SHOP = [
  { label: 'All Products',    href: '/shop' },
  { label: 'Medallions',      href: '/shop?cat=medallions' },
  { label: 'Collectibles',    href: '/shop?cat=collectibles' },
  { label: 'Crypto Items',    href: '/shop?cat=crypto' },
  { label: 'Apparel',         href: '/shop?cat=apparel' },
  { label: 'Accessories',     href: '/shop?cat=accessories' },
]
const SUPPORT = [
  { label: 'Track Your Order',    href: '/account' },
  { label: 'FAQ',                 href: '/faq' },
  { label: 'Shipping Info',       href: '/shipping' },
  { label: 'Returns & Exchanges', href: '/returns' },
  { label: 'Contact Us',          href: '/contact' },
]
const COMPANY = [
  { label: 'About The Maga', href: '/about' },
  { label: 'Privacy Policy',  href: '/privacy' },
  { label: 'Terms of Service',href: '/terms' },
]
const SOCIALS = [
  { icon: 'fa-facebook-f', href: 'https://facebook.com/themagaoffers' },
  { icon: 'fa-x-twitter',  href: 'https://x.com/themagaoffers' },
  { icon: 'fa-instagram',  href: 'https://instagram.com/themagaoffers' },
  { icon: 'fa-youtube',    href: 'https://youtube.com/@themagaoffers' },
]

export default function Footer() {
  return (
    <footer style={{ background: 'var(--navy-dark)', color: 'rgba(255,255,255,0.75)', padding: '64px 28px 0' }}>
      <div className="kr-footer-grid" style={{ maxWidth: 1340, margin: '0 auto' }}>
        {/* brand */}
        <div className="kr-footer-brand">
          <Link href="/" style={{ display: 'inline-block', marginBottom: 14 }}>
            <Image src="/logo.png" alt="The Maga" width={64} height={64} style={{ objectFit: 'contain', borderRadius: 6 }} />
          </Link>
          <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280, marginBottom: 22 }}>
            Premium collectibles, rare finds, and exclusive memorabilia — authenticated and shipped to your door.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {SOCIALS.map(s => (
              <motion.a key={s.icon} href={s.href} target="_blank" rel="noopener noreferrer"
                whileHover={{ background: 'var(--teal)', color: 'white' }}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', width: 38, height: 38, borderRadius: 10, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <i className={`fa-brands ${s.icon}`} />
              </motion.a>
            ))}
          </div>
        </div>

        {/* Shop */}
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'white', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Shop</h4>
          {SHOP.map(l => (
            <motion.div key={l.label} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
              <Link href={l.href} style={{ display: 'block', color: 'rgba(255,255,255,0.65)', fontSize: 14, textDecoration: 'none', marginBottom: 9, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal-light)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>
                {l.label}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Support */}
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'white', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Support</h4>
          {SUPPORT.map(l => (
            <motion.div key={l.label} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
              <Link href={l.href} style={{ display: 'block', color: 'rgba(255,255,255,0.65)', fontSize: 14, textDecoration: 'none', marginBottom: 9 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal-light)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>
                {l.label}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Company */}
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'white', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Company</h4>
          {COMPANY.map(l => (
            <motion.div key={l.label} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
              <Link href={l.href} style={{ display: 'block', color: 'rgba(255,255,255,0.65)', fontSize: 14, textDecoration: 'none', marginBottom: 9 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal-light)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>
                {l.label}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '20px 0', maxWidth: 1340, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          © 2025 The Maga. All rights reserved. Made with{' '}
          <i className="fa-solid fa-heart" style={{ color: 'var(--teal-light)' }} />
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/privacy" style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal-light)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal-light)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>Terms</Link>
          <div style={{ display: 'flex', gap: 8 }}>
            {['VISA', 'MC', 'AMEX', 'PayPal'].map(p => (
              <span key={p} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
