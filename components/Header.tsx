'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

const NAV_LINKS = [
  { label: 'Best Sellers', cat: 'all' },
  { label: 'Medallions', cat: 'medallions' },
  { label: 'Collectibles', cat: 'collectibles' },
  { label: 'Apparel', cat: 'apparel' },
  { label: 'Accessories', cat: 'accessories' },
  { label: 'Crypto', cat: 'crypto' },
]

export default function Header() {
  const { cartCount, cartTotal, setCartOpen } = useCart()
  const { user, profile, isAdmin, isApprovedAgent, signOut } = useAuth()
  const { isDark, toggleDark } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [searchVal, setSearchVal] = useState('')
  const [searchCat, setSearchCat] = useState('all')
  const [activeNav, setActiveNav] = useState('all')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  function handleSearch() {
    const q = searchVal.trim()
    if (!q) return
    const catParam = searchCat !== 'all' ? `&cat=${searchCat}` : ''
    router.push(`/search?q=${encodeURIComponent(q)}${catParam}`)
    setMobileSearchOpen(false)
  }

  function handleCatClick(cat: string) {
    setActiveNav(cat)
    setMobileMenuOpen(false)
    if (pathname === '/') {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
      window.dispatchEvent(new CustomEvent('krsellify:filter', { detail: cat }))
    } else {
      router.push(cat === 'all' ? '/shop' : `/shop?cat=${cat}`)
    }
  }

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{ background: 'var(--white)', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 20px rgba(9,52,89,0.08)' }}
    >
      {/* top row */}
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, height: 64, borderBottom: pathname === '/' ? '1px solid var(--gray)' : '2px solid var(--gray)' }}>
        <a href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 900, color: 'var(--heading)', letterSpacing: '-0.02em', flexShrink: 0 }}>
          KR<span style={{ color: 'var(--teal)' }}>SELLIFY</span>
        </a>

        {/* desktop search */}
        <div className="kr-header-search" style={{ flex: 1, display: 'flex', maxWidth: 560, border: '2px solid var(--gray)', borderRadius: 50, overflow: 'hidden' }}>
          <select
            value={searchCat}
            onChange={e => setSearchCat(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'var(--gray)', padding: '0 14px', fontSize: 13, color: 'var(--text-mid)', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="all">All</option>
            <option value="medallions">Medallions</option>
            <option value="collectibles">Collectibles</option>
            <option value="crypto">Crypto</option>
          </select>
          <input
            type="text"
            placeholder="Search for products…"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ border: 'none', outline: 'none', flex: 1, padding: '0 16px', fontSize: 14, fontFamily: 'inherit', background: 'var(--white)' }}
          />
          <button onClick={handleSearch}
            style={{ background: 'var(--teal)', border: 'none', padding: '0 20px', cursor: 'pointer', color: 'white', fontSize: 16 }}>
            <i className="fa-solid fa-magnifying-glass" />
          </button>
        </div>

        {/* right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', flexShrink: 0 }}>

          {/* mobile search toggle */}
          <motion.button className="kr-mobile-menu-btn"
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileSearchOpen(o => !o)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-mid)', padding: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-magnifying-glass" />
          </motion.button>

          {/* user menu */}
          <div style={{ position: 'relative' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setUserMenuOpen(o => !o)}
              style={{ background: user ? 'var(--navy)' : 'none', border: 'none', cursor: 'pointer', fontSize: user ? 13 : 18, color: user ? 'white' : 'var(--text-mid)', padding: user ? '7px 14px' : '6px', borderRadius: user ? 50 : 8, display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontFamily: 'inherit' }}
            >
              {user ? (
                <>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {(profile?.full_name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                  </span>
                  <span className="kr-header-cart-label">{profile?.full_name?.split(' ')[0] ?? 'Account'}</span>
                  <i className="fa-solid fa-chevron-down" style={{ fontSize: 10, opacity: 0.7 }} />
                </>
              ) : (
                <i className="fa-regular fa-user" />
              )}
            </motion.button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--white)', border: '1px solid var(--gray)', borderRadius: 16, boxShadow: '0 8px 32px rgba(9,52,89,0.12)', minWidth: 200, overflow: 'hidden', zIndex: 100 }}
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  {user ? (
                    <>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gray)', background: 'var(--off-white)', transition: 'background 0.2s' }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--heading)' }}>{profile?.full_name || user.email}</p>
                        <p style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{profile?.role ?? 'customer'}</p>
                      </div>
                      {[
                        { href: '/account', icon: 'fa-user', label: 'My Account' },
                        { href: '/wishlist', icon: 'fa-heart', label: 'My Wishlist' },
                        ...(isAdmin ? [{ href: '/admin', icon: 'fa-shield-halved', label: 'Admin Dashboard' }] : []),
                        ...(isApprovedAgent ? [{ href: '/agent', icon: 'fa-headset', label: 'Agent Dashboard' }] : []),
                      ].map(item => (
                        <a key={item.label} href={item.href} onClick={() => setUserMenuOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', fontSize: 14, color: 'var(--text-dark)', borderBottom: '1px solid var(--gray)', fontWeight: 500 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--off-white)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <i className={`fa-solid ${item.icon}`} style={{ color: 'var(--teal)', width: 16 }} /> {item.label}
                        </a>
                      ))}
                      <button onClick={() => { signOut(); setUserMenuOpen(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', fontSize: 14, color: 'var(--sale-red)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <i className="fa-solid fa-arrow-right-from-bracket" style={{ width: 16 }} /> Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <a href="/login" onClick={() => setUserMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', fontSize: 14, color: 'var(--heading)', fontWeight: 700 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--off-white)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <i className="fa-solid fa-user" style={{ color: 'var(--teal)', width: 16 }} /> Sign In / Sign Up
                      </a>
                      <a href="/agent-login" onClick={() => setUserMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', fontSize: 14, color: 'var(--text-mid)', fontWeight: 500, borderTop: '1px solid var(--gray)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--off-white)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <i className="fa-solid fa-headset" style={{ color: 'var(--teal)', width: 16 }} /> Agent Login
                      </a>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* dark mode toggle */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            whileHover={{ background: 'var(--gray)' }}
            onClick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, padding: '7px 9px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            <motion.i
              key={isDark ? 'sun' : 'moon'}
              className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`}
              initial={{ rotate: -60, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              style={{ color: isDark ? 'var(--gold)' : 'var(--text-mid)', display: 'block' }}
            />
          </motion.button>

          {/* cart */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCartOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mid)', padding: '6px 8px', borderRadius: 8, position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ position: 'relative', fontSize: 18 }}>
              <i className="fa-solid fa-cart-shopping" />
              {cartCount > 0 && (
                <motion.span key={cartCount} initial={{ scale: 0 }} animate={{ scale: 1 }}
                  style={{ background: 'var(--teal)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: -4, right: -6 }}>
                  {cartCount}
                </motion.span>
              )}
            </span>
            <span className="kr-header-cart-label" style={{ fontWeight: 700, fontSize: 14, color: 'var(--heading)' }}>${cartTotal.toFixed(2)}</span>
          </motion.button>

          {/* hamburger */}
          <motion.button className="kr-mobile-menu-btn" whileTap={{ scale: 0.9 }}
            onClick={() => setMobileMenuOpen(o => !o)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--heading)', padding: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
            <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`} />
          </motion.button>
        </div>
      </div>

      {/* mobile search bar */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--gray)', background: 'var(--white)', padding: '0 16px' }}>
            <div style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
              <input type="text" placeholder="Search products…" value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                autoFocus
                style={{ flex: 1, border: '2px solid var(--gray)', borderRadius: 50, padding: '10px 18px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={handleSearch}
                style={{ background: 'var(--teal)', border: 'none', borderRadius: 50, padding: '0 20px', color: 'white', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                <i className="fa-solid fa-magnifying-glass" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* desktop nav — homepage only */}
      {pathname === '/' && (
        <nav style={{ background: 'var(--navy)' }} className="kr-desktop-nav">
          <div style={{ maxWidth: 1340, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {NAV_LINKS.map(link => (
              <button key={link.cat} onClick={() => handleCatClick(link.cat)}
                style={{ color: activeNav === link.cat ? 'var(--white)' : 'rgba(255,255,255,0.8)', background: activeNav === link.cat ? 'rgba(88,148,143,0.12)' : 'transparent', border: 'none', borderBottom: activeNav === link.cat ? '3px solid var(--teal)' : '3px solid transparent', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 14px', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                {link.label}
              </button>
            ))}
            {isAdmin && (
              <a href="/admin" style={{ color: 'rgba(255,255,255,0.8)', border: 'none', borderBottom: '3px solid transparent', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 14px', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fa-solid fa-shield-halved" style={{ fontSize: 11 }} /> Admin
              </a>
            )}
            {isApprovedAgent && (
              <a href="/agent" style={{ color: 'rgba(255,255,255,0.8)', border: 'none', borderBottom: '3px solid transparent', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 14px', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fa-solid fa-headset" style={{ fontSize: 11 }} /> Agent
              </a>
            )}
          </div>
        </nav>
      )}

      {/* mobile nav drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', background: 'var(--navy)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {pathname === '/' && NAV_LINKS.map(link => (
              <button key={link.cat} onClick={() => handleCatClick(link.cat)}
                style={{ width: '100%', textAlign: 'left', color: activeNav === link.cat ? 'var(--teal-light)' : 'rgba(255,255,255,0.85)', background: activeNav === link.cat ? 'rgba(88,148,143,0.1)' : 'transparent', border: 'none', borderLeft: activeNav === link.cat ? '3px solid var(--teal)' : '3px solid transparent', fontSize: 14, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 24px', cursor: 'pointer', fontFamily: 'inherit', display: 'block' }}>
                {link.label}
              </button>
            ))}
            {isAdmin && (
              <a href="/admin" style={{ display: 'block', color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '14px 24px', borderLeft: '3px solid transparent' }}>
                <i className="fa-solid fa-shield-halved" style={{ marginRight: 8 }} /> Admin
              </a>
            )}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              {user ? (
                <button onClick={() => { signOut(); setMobileMenuOpen(false) }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, color: 'white', padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <i className="fa-solid fa-arrow-right-from-bracket" /> Sign Out
                </button>
              ) : (
                <a href="/login" style={{ display: 'block', textAlign: 'center', background: 'var(--teal)', color: 'white', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700 }}>
                  Sign In / Sign Up
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
