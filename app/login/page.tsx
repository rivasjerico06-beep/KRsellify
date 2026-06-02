'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

const ORBS = [
  { size: 520, color: 'rgba(88,148,143,0.28)', x: 8,  y: 12, dur: 22, delay: 0 },
  { size: 420, color: 'rgba(202,138,4,0.18)',  x: 88, y: 68, dur: 26, delay: 3 },
  { size: 360, color: 'rgba(14,74,128,0.38)',  x: 62, y: 8,  dur: 18, delay: 6 },
  { size: 300, color: 'rgba(88,148,143,0.22)', x: 18, y: 88, dur: 24, delay: 9 },
  { size: 240, color: 'rgba(202,138,4,0.14)',  x: 94, y: 22, dur: 30, delay: 2 },
]

const PARTICLES = [
  { x: 12, y: 28, d: 3.8, delay: 0   }, { x: 23, y: 63, d: 4.2, delay: 1.2 },
  { x: 37, y: 17, d: 3.5, delay: 0.5 }, { x: 51, y: 79, d: 4.8, delay: 2.1 },
  { x: 67, y: 41, d: 3.9, delay: 0.8 }, { x: 79, y: 21, d: 4.1, delay: 1.7 },
  { x: 86, y: 57, d: 3.6, delay: 0.3 }, { x: 93, y: 87, d: 4.5, delay: 2.5 },
  { x: 44, y: 93, d: 3.7, delay: 1.0 }, { x: 14, y: 51, d: 4.3, delay: 1.5 },
  { x: 58, y: 34, d: 3.4, delay: 2.8 }, { x: 71, y: 73, d: 4.0, delay: 0.7 },
]

function FieldWrapper({ icon, label, isDark, children }: { icon: string; label: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#7ab5b0' : '#4a6170', display: 'block', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <i className={`fa-solid ${icon}`} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#58948f' : '#8ba0aa', fontSize: 13, zIndex: 1, pointerEvents: 'none' }} />
        {children}
      </div>
    </div>
  )
}

function TrustBadge({ icon, text, isDark }: { icon: string; text: string; isDark: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: isDark ? '#7ab5b0' : '#8ba0aa', fontSize: 13, fontWeight: 600 }}>
      <i className={`fa-solid ${icon}`} style={{ color: '#58948f', fontSize: 11 }} />
      {text}
    </div>
  )
}

export default function LoginPage() {
  const { user, signIn, signUp, isAdmin, isApprovedAgent } = useAuth()
  const { isDark, toggleDark } = useTheme()
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [focused, setFocused] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const next = params?.get('next')
      if (isAdmin) router.replace('/admin')
      else if (isApprovedAgent) router.replace('/agent')
      else if (next === 'checkout') {
        router.replace('/')
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

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    border: `2px solid ${focused === field ? '#58948f' : isDark ? 'rgba(255,255,255,0.22)' : '#e8eff0'}`,
    borderRadius: 12,
    padding: '15px 18px 15px 48px',
    fontSize: 16,
    fontFamily: 'inherit',
    outline: 'none',
    background: focused === field
      ? isDark ? 'rgba(88,148,143,0.22)' : 'rgba(88,148,143,0.04)'
      : isDark ? 'rgba(255,255,255,0.1)' : '#f9fafb',
    transition: 'all 0.2s ease',
    color: isDark ? '#e2f0ef' : '#0d1f2d',
    colorScheme: isDark ? 'dark' : 'light',
  })

  const cardVariants = {
    hidden: { opacity: 0, y: 48, scale: 0.94 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
  }

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#061f37' : 'linear-gradient(135deg, #dff0ec 0%, #eaf4f8 50%, #daeee9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>

      {/* Animated gradient orbs */}
      {ORBS.map((orb, i) => (
        <motion.div key={i}
          style={{ position: 'absolute', width: orb.size, height: orb.size, borderRadius: '50%', background: orb.color, filter: `blur(${Math.round(orb.size * 0.36)}px)`, left: `${orb.x}%`, top: `${orb.y}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
          animate={{ x: [0, 45, -30, 20, 0], y: [0, -40, 28, -18, 0], scale: [1, 1.18, 0.92, 1.12, 1] }}
          transition={{ duration: orb.dur, delay: orb.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Gold sparkle particles */}
      {PARTICLES.map((p, i) => (
        <motion.div key={`sp-${i}`}
          style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: '#CA8A04', boxShadow: '0 0 8px 3px rgba(202,138,4,0.55)', left: `${p.x}%`, top: `${p.y}%`, pointerEvents: 'none' }}
          animate={{ y: [0, -70, 0], opacity: [0, 1, 0], scale: [0, 2.2, 0] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Dot grid overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(9,52,89,0.06)'} 1px, transparent 1px)`, backgroundSize: '36px 36px', pointerEvents: 'none' }} />

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: isDark ? 'radial-gradient(ellipse at center, transparent 40%, rgba(6,31,55,0.6) 100%)' : 'radial-gradient(ellipse at center, transparent 40%, rgba(180,215,210,0.5) 100%)', pointerEvents: 'none' }} />

      {/* Back button */}
      <motion.button onClick={() => router.back()} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        style={{ position: 'fixed', top: 20, left: 20, zIndex: 50, width: 44, height: 44, borderRadius: '50%', border: isDark ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid rgba(9,52,89,0.18)', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(9,52,89,0.08)', backdropFilter: 'blur(12px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#CA8A04' : '#093459', fontSize: 16 }}
        title="Go back">
        <i className="fa-solid fa-arrow-left" />
      </motion.button>

      {/* Theme toggle */}
      <motion.button onClick={toggleDark} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        style={{ position: 'fixed', top: 20, right: 20, zIndex: 50, width: 44, height: 44, borderRadius: '50%', border: isDark ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid rgba(9,52,89,0.18)', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(9,52,89,0.08)', backdropFilter: 'blur(12px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#CA8A04' : '#093459', fontSize: 16 }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        <i className={isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} />
      </motion.button>

      {/* Card */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" layout
        style={{ background: isDark ? 'rgba(9,28,50,0.88)' : 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', borderRadius: 28, padding: '48px 40px', width: '100%', maxWidth: 460, boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)' : '0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(88,148,143,0.12)', position: 'relative', zIndex: 10 }}>

        {/* Shimmer top edge */}
        <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 0.5, duration: 0.7 }}
          style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 2, background: 'linear-gradient(90deg, transparent, #CA8A04, #58948f, #CA8A04, transparent)', borderRadius: 2 }} />

        {/* Logo */}
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ textAlign: 'center', marginBottom: 30 }}>
          <motion.a href="/" variants={fadeUp}
            style={{ fontFamily: 'var(--font-playfair)', fontSize: 34, fontWeight: 900, color: isDark ? '#e2f0ef' : '#093459', display: 'block', marginBottom: 6, letterSpacing: '-0.02em', textDecoration: 'none' }}>
            KR<span style={{ color: '#58948f', textShadow: '0 0 28px rgba(88,148,143,0.5)' }}>SELLIFY</span>
          </motion.a>
          <motion.p variants={fadeUp} style={{ color: isDark ? '#7ab5b0' : '#8ba0aa', fontSize: 16 }}>
            {mode === 'login' ? 'Welcome back, Patriot' : 'Join the movement today'}
          </motion.p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.35 }}
          style={{ display: 'flex', background: isDark ? 'rgba(255,255,255,0.06)' : '#f4f8f8', borderRadius: 50, padding: 4, marginBottom: 28, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e8eff0'}` }}>
          {(['login', 'signup'] as const).map(m => (
            <motion.button key={m}
              onClick={() => { setMode(m); setError(''); setSuccess('') }}
              animate={{
                background: mode === m ? (isDark ? 'rgba(88,148,143,0.25)' : '#093459') : 'transparent',
                color: mode === m ? (isDark ? '#7ab5b0' : 'white') : (isDark ? '#7ab5b0' : '#4a6170'),
                boxShadow: mode === m ? (isDark ? '0 4px 14px rgba(88,148,143,0.2)' : '0 4px 14px rgba(9,52,89,0.28)') : 'none',
              }}
              transition={{ duration: 0.25 }}
              style={{ flex: 1, border: 'none', borderRadius: 50, padding: '13px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em' }}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </motion.button>
          ))}
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AnimatePresence initial={false}>
            {mode === 'signup' && (
              <motion.div key="name-field"
                initial={{ opacity: 0, maxHeight: 0 }}
                animate={{ opacity: 1, maxHeight: 150 }}
                exit={{ opacity: 0, maxHeight: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}>
                <FieldWrapper icon="fa-user" label="Full Name" isDark={isDark}>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                    style={inputStyle('name')} />
                </FieldWrapper>
              </motion.div>
            )}
          </AnimatePresence>

          <FieldWrapper icon="fa-envelope" label="Email" isDark={isDark}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
              style={inputStyle('email')} />
          </FieldWrapper>

          <FieldWrapper icon="fa-lock" label="Password" isDark={isDark}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6}
              onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
              style={inputStyle('password')} />
          </FieldWrapper>

          <AnimatePresence>
            {error && (
              <motion.div key="err" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
                style={{ background: isDark ? 'rgba(224,84,84,0.12)' : '#fff0f0', border: `1px solid ${isDark ? 'rgba(224,84,84,0.3)' : '#ffcccc'}`, borderRadius: 12, padding: '11px 14px', fontSize: 13, color: '#e05454', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-circle-exclamation" />{error}
              </motion.div>
            )}
            {success && (
              <motion.div key="ok" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                style={{ background: isDark ? 'rgba(88,148,143,0.15)' : '#f0fff8', border: `1px solid ${isDark ? 'rgba(88,148,143,0.3)' : '#9de'}`, borderRadius: 12, padding: '11px 14px', fontSize: 13, color: isDark ? '#7ab5b0' : '#3d6f6a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-circle-check" />{success}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={loading}
            whileHover={!loading ? { scale: 1.02, boxShadow: isDark ? '0 10px 28px rgba(88,148,143,0.3)' : '0 10px 28px rgba(9,52,89,0.38)' } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{ background: loading ? (isDark ? 'rgba(255,255,255,0.15)' : '#8ba0aa') : isDark ? 'linear-gradient(135deg, #0e4a80 0%, #58948f 100%)' : 'linear-gradient(135deg, #093459 0%, #0e4a80 100%)', color: 'white', border: 'none', padding: '18px', borderRadius: 50, fontSize: 17, fontWeight: 700, letterSpacing: '0.06em', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4, boxShadow: isDark ? '0 4px 18px rgba(88,148,143,0.2)' : '0 4px 18px rgba(9,52,89,0.28)', transition: 'background 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading
              ? <><i className="fa-solid fa-spinner fa-spin" />Processing…</>
              : mode === 'login'
                ? <><i className="fa-solid fa-arrow-right-to-bracket" />Sign In</>
                : <><i className="fa-solid fa-user-plus" />Create Account</>
            }
          </motion.button>
        </form>

        {/* Trust badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e8eff0'}` }}>
          <TrustBadge icon="fa-shield-halved" text="Secure" isDark={isDark} />
          <TrustBadge icon="fa-lock" text="Encrypted" isDark={isDark} />
          <TrustBadge icon="fa-certificate" text="Verified" isDark={isDark} />
        </div>

        {/* Agent link */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <p style={{ fontSize: 14, color: isDark ? '#7ab5b0' : '#8ba0aa', marginBottom: 6 }}>Are you an approved agent?</p>
          <a href="/agent-login" style={{ color: '#58948f', fontWeight: 700, fontSize: 15, letterSpacing: '0.02em' }}>
            Agent Sign In <i className="fa-solid fa-arrow-right" />
          </a>
        </div>
      </motion.div>
    </div>
  )
}
