'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { getBrowserSupabase } from '@/lib/supabase-browser'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function BuyNowModal({ open, onClose, onSuccess }: Props) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<'signin' | 'new'>('signin')

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')

  const [fullName, setFullName]       = useState('')
  const [newEmail, setNewEmail]       = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [phone, setPhone]             = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [info, setInfo]       = useState('')

  function reset() {
    setEmail(''); setPassword(''); setFullName(''); setNewEmail('')
    setNewPassword(''); setPhone(''); setError(''); setInfo(''); setLoading(false)
  }

  function handleClose() { reset(); onClose() }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    const { error: err } = await signIn(email.trim(), password)
    setLoading(false)
    if (err) { setError(err); return }
    reset(); onSuccess()
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !newEmail.trim() || !newPassword) {
      setError('Please fill in your name, email, and password.')
      return
    }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')

    const { error: signUpErr } = await signUp(newEmail.trim(), newPassword, fullName.trim())
    if (signUpErr) { setError(signUpErr); setLoading(false); return }

    const { error: signInErr } = await signIn(newEmail.trim(), newPassword)
    if (signInErr) {
      setLoading(false)
      setInfo('Account created! Please check your email to confirm it, then sign in.')
      setTab('signin')
      setEmail(newEmail.trim())
      return
    }

    if (phone.trim()) {
      try {
        const supabase = getBrowserSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').upsert({ id: user.id, full_name: fullName.trim(), phone: phone.trim() })
        }
      } catch {}
    }

    reset(); onSuccess()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 54, border: '2px solid var(--gray)', borderRadius: 12,
    padding: '0 16px', fontSize: 17, fontFamily: 'inherit', color: 'var(--heading)',
    background: 'var(--white)', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 15, fontWeight: 700,
    color: 'var(--text-mid)', marginBottom: 7,
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bno-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(9,52,89,0.6)', zIndex: 9000 }} />

          {/* Modal */}
          <motion.div
            key="bno-wrap"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9001, padding: '16px', pointerEvents: 'none' }}>
            <motion.div
              initial={{ scale: 0.93, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ pointerEvents: 'all', background: 'var(--bg)', borderRadius: 24, padding: '36px 32px', width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(9,52,89,0.22)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>

              {/* Close */}
              <button onClick={handleClose}
                style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-light)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                <i className="fa-solid fa-xmark" />
              </button>

              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal) 0%, var(--navy) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <i className="fa-solid fa-bag-shopping" style={{ color: 'white', fontSize: 26 }} />
                </div>
                <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 800, color: 'var(--heading)', marginBottom: 6 }}>
                  Complete Your Order
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.55 }}>
                  Sign in or create a free account to proceed
                </p>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--gray)', borderRadius: 12, padding: 4 }}>
                {(['signin', 'new'] as const).map(t => (
                  <button key={t}
                    onClick={() => { setTab(t); setError(''); setInfo('') }}
                    style={{
                      flex: 1, height: 46, border: 'none', borderRadius: 9,
                      fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      background: tab === t ? 'var(--white)' : 'transparent',
                      color: tab === t ? 'var(--navy)' : 'var(--text-light)',
                      boxShadow: tab === t ? '0 2px 8px rgba(9,52,89,0.1)' : 'none',
                    }}>
                    {t === 'signin' ? 'I have an account' : "I'm new here"}
                  </button>
                ))}
              </div>

              {/* Alert */}
              <AnimatePresence>
                {(error || info) && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      padding: '13px 16px', borderRadius: 10, marginBottom: 20,
                      fontSize: 14, fontWeight: 600, lineHeight: 1.5,
                      background: error ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)',
                      color: error ? '#dc2626' : '#059669',
                      border: `1px solid ${error ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)'}`,
                    }}>
                    <i className={`fa-solid ${error ? 'fa-circle-exclamation' : 'fa-circle-check'}`} style={{ marginRight: 8 }} />
                    {error || info}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign In Form */}
              {tab === 'signin' && (
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com" style={inputStyle} autoComplete="email" />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Your password" style={inputStyle} autoComplete="current-password" />
                  </div>
                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.01, boxShadow: '0 8px 28px rgba(9,52,89,0.28)' } : {}}
                    whileTap={{ scale: 0.98 }}
                    style={{ height: 56, background: loading ? 'var(--gray)' : 'linear-gradient(135deg, var(--navy) 0%, var(--teal) 100%)', color: loading ? 'var(--text-light)' : 'white', border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    {loading
                      ? <><i className="fa-solid fa-spinner fa-spin" /> Signing in…</>
                      : <><i className="fa-solid fa-arrow-right-to-bracket" /> Sign In &amp; Order</>}
                  </motion.button>
                </form>
              )}

              {/* New Customer Form */}
              {tab === 'new' && (
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={labelStyle}>
                      Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Your full name" style={inputStyle} autoComplete="name" />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Email Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="your@email.com" style={inputStyle} autoComplete="email" />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Password <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Create a password (min. 6 characters)" style={inputStyle} autoComplete="new-password" />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Phone Number{' '}
                      <span style={{ fontSize: 13, color: 'var(--text-light)', fontWeight: 500 }}>(optional)</span>
                    </label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000" style={inputStyle} autoComplete="tel" />
                  </div>
                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.01, boxShadow: '0 8px 28px rgba(202,138,4,0.38)' } : {}}
                    whileTap={{ scale: 0.98 }}
                    style={{ height: 56, background: loading ? 'var(--gray)' : 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)', color: loading ? 'var(--text-light)' : 'white', border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    {loading
                      ? <><i className="fa-solid fa-spinner fa-spin" /> Creating account…</>
                      : <><i className="fa-solid fa-bolt" /> Create Account &amp; Order</>}
                  </motion.button>
                </form>
              )}

              {/* Security note */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, fontSize: 12, color: 'var(--text-light)' }}>
                <i className="fa-solid fa-shield-halved" style={{ color: 'var(--teal)', fontSize: 13 }} />
                Your information is safe and encrypted
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
