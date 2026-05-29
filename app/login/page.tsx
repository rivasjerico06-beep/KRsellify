'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { user, signIn, signUp, isAdmin, isApprovedAgent } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const next = params?.get('next')
      if (isAdmin) router.replace('/admin')
      else if (isApprovedAgent) router.replace('/agent')
      else if (next === 'checkout') {
        router.replace('/')
        // small delay so Cart context is ready before triggering open
        setTimeout(() => window.dispatchEvent(new CustomEvent('krsellify:opencart')), 300)
      } else {
        router.replace('/')
      }
    }
  }, [user, isAdmin, isApprovedAgent, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    } else {
      if (!fullName.trim()) { setError('Full name is required'); setLoading(false); return }
      const { error } = await signUp(email, password, fullName)
      if (error) setError(error)
      else setSuccess('Account created! You can now sign in.')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: '13px 16px',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--white)',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: 'var(--white)', borderRadius: 24, padding: '48px 40px', width: '100%', maxWidth: 440, boxShadow: '0 8px 48px rgba(9,52,89,0.12)' }}
      >
        {/* logo */}
        <a href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--navy)', display: 'block', textAlign: 'center', marginBottom: 8 }}>
          KR<span style={{ color: 'var(--teal)' }}>SELLIFY</span>
        </a>
        <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 14, marginBottom: 32 }}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>

        {/* tab switcher */}
        <div style={{ display: 'flex', background: 'var(--gray)', borderRadius: 50, padding: 4, marginBottom: 28 }}>
          {(['login', 'signup'] as const).map(m => (
            <motion.button
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess('') }}
              animate={{ background: mode === m ? 'var(--white)' : 'transparent', color: mode === m ? 'var(--navy)' : 'var(--text-mid)', boxShadow: mode === m ? '0 2px 8px rgba(9,52,89,0.1)' : 'none' }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, border: 'none', borderRadius: 50, padding: '10px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </motion.button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                key="fullname"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', display: 'block', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--gray)')}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', display: 'block', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.target.style.borderColor = 'var(--gray)')}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', display: 'block', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.target.style.borderColor = 'var(--gray)')}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p key="err" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: '#fff0f0', border: '1px solid #fcc', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--sale-red)' }}>
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </motion.p>
            )}
            {success && (
              <motion.p key="ok" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: '#f0fff8', border: '1px solid #9de', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--teal-dark)' }}>
                <i className="fa-solid fa-circle-check" /> {success}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ background: loading ? 'var(--text-light)' : 'var(--navy)', color: 'white', border: 'none', padding: '14px', borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}
          >
            {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Processing…</> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--gray)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>Are you an approved agent?</p>
          <a href="/agent-login" style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 13 }}>Agent Sign In →</a>
        </div>
      </motion.div>
    </div>
  )
}
