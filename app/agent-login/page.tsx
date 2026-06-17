'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

export default function AgentLoginPage() {
  const { user, signIn, isApprovedAgent, agentProfile, loading } = useAuth()
  const { isDark, toggleDark } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading) return
    if (user && isApprovedAgent) router.replace('/agent')
    else if (user && agentProfile && agentProfile.status !== 'approved') {
      setError(`Your agent application is ${agentProfile.status}. Contact support if you need help.`)
    } else if (user && !agentProfile) {
      setError('You have no agent application. Please sign in as a customer and apply from your account page.')
    }
  }, [user, isApprovedAgent, agentProfile, loading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email, password)
    if (error) setError(error)
    setSubmitting(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: '13px 16px',
    fontSize: 14, fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 60%, var(--teal-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Theme toggle button */}
      <motion.button
        onClick={toggleDark}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          position: 'fixed', top: 20, right: 20, zIndex: 50,
          width: 44, height: 44, borderRadius: '50%',
          border: isDark ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid rgba(9,52,89,0.18)',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(9,52,89,0.08)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDark ? '#CA8A04' : '#093459', fontSize: 16,
        }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <i className={isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} />
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ background: 'var(--white)', borderRadius: 24, padding: '48px 40px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <a href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)', display: 'block', textAlign: 'center', marginBottom: 6 }}>
          Maga <span style={{ color: 'var(--teal)' }}>Offers</span>
        </a>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ background: 'var(--teal)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Agent Portal
          </span>
          <p style={{ color: 'var(--text-light)', fontSize: 13, marginTop: 8 }}>Sign in with your approved agent account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', display: 'block', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@example.com" required style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')} onBlur={e => (e.target.style.borderColor = 'var(--gray)')} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', display: 'block', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')} onBlur={e => (e.target.style.borderColor = 'var(--gray)')} />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p key="err" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: '#fff0f0', border: '1px solid #fcc', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--sale-red)' }}>
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ background: 'var(--teal)', color: 'white', border: 'none', padding: 14, borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            {submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Signing in…</> : 'Sign In as Agent'}
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--gray)' }}>
          <a href="/" style={{ color: 'var(--text-mid)', fontSize: 13 }}>← Back to Store</a>
        </div>
      </motion.div>
    </div>
  )
}