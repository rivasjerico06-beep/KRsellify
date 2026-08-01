'use client'
import { useState, useEffect, FormEvent } from 'react'

interface ProductInfo {
  id: string; name: string; price: number; img: string; quantity: number
  /** Unique per requirement — the same product can be required twice */
  key?: string
  /** What buying this unlocks, e.g. "Account activation" */
  purpose?: string
  /** Completion lives on the requirement, not the product id */
  completed?: boolean
  /** The store bundle this requirement refers to, e.g. "3PCS WLFI TOKEN (+$200.00)" */
  bundle_label?: string | null
  /** What that bundle actually costs — not price × quantity */
  bundle_total?: number
}
interface RFSProfile {
  id: string; gmail: string; display_name: string; benefit_title: string
  benefit_amount: number; activation_pct: number; deduction_pct: number
  minimized_deduction_pct: number | null; required_products: ProductInfo[]
  priority_list?: boolean
  completed_product_ids: string[]; status: string; deadline: string | null
  custom_message: string | null; portal_texts?: Record<string, string>
}

const STATUS_COLOR: Record<string, string> = {
  under_review: '#f59e0b', active: '#10b981', completed: '#3b82f6',
  pending: '#8b5cf6', suspended: '#ef4444',
}
const STATUS_LABEL: Record<string, string> = {
  under_review: 'UNDER REVIEW', active: 'ACTIVE', completed: 'COMPLETED',
  pending: 'PENDING', suspended: 'SUSPENDED',
}

function useCountUp(target: number, duration = 2000): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let id: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 4)
      setVal(target * ease)
      if (t < 1) { id = requestAnimationFrame(tick) } else { setVal(target) }
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [target, duration])
  return val
}

function Sparkline({ color = '#d4af37', w = 160, h = 42, id = 'a' }: { color?: string; w?: number; h?: number; id?: string }) {
  const pts = [12, 20, 16, 28, 22, 36, 31, 46, 41, 55, 49, 66, 60, 76, 70, 87, 80, 100]
  const max = Math.max(...pts), min = Math.min(...pts), range = max - min || 1
  const coords = pts.map((v, i) => [
    (i / (pts.length - 1)) * w,
    h - ((v - min) / range) * (h - 6) - 3,
  ])
  const lineStr = coords.map(([x, y]) => `${x},${y}`).join(' ')
  const areaStr = `0,${h} ` + lineStr + ` ${w},${h}`
  const uid = `sp${id}`
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="30%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <polygon points={areaStr} fill={`url(#${uid}g)`} />
      <polyline points={lineStr} fill="none" stroke={`url(#${uid}l)`} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 900, strokeDashoffset: 900, animation: 'drawLine 2.6s ease-out 0.4s forwards' }} />
      <circle
        cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="3.5"
        fill={color}
        style={{ animation: 'livePulse 2s ease-in-out infinite' }}
      />
    </svg>
  )
}

function Ring({ pct, size, stroke, color, children }: {
  pct: number; size: number; stroke: number; color: string; children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* glow layer */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke + 4}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round"
          strokeOpacity="0.15"
          style={{ transition: 'stroke-dashoffset 1.7s cubic-bezier(0.22,1,0.36,1)', filter: 'blur(6px)' }} />
        {/* main ring */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.7s cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

const BG = 'linear-gradient(145deg,#060a14 0%,#0a1020 60%,#070c18 100%)'

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 11 + 3) % 96}%`,
  duration: `${5 + ((i * 97) % 700) / 100}s`,
  delay: `-${((i * 61) % 500) / 100}s`,
  size: i % 5 === 0 ? 8 : i % 3 === 0 ? 6 : 4,
  color: i % 6 === 0 ? '#10b981' : i % 4 === 0 ? '#3b82f6' : '#d4af37',
}))

/**
 * Both screens of the customer-facing portal. Which one renders is decided by
 * the server component in page.tsx, from the admin toggle in site_config — so
 * the portal never briefly flashes into view before the switch is read.
 */
export function RFSUnavailable() {
  useEffect(() => {
    document.body.classList.add('rfs-active')
    return () => { document.body.classList.remove('rfs-active') }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#05070d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle,rgba(212,175,55,0.06) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 4, color: 'white', marginBottom: 10 }}>
          MAGA <span style={{ color: '#d4af37' }}>OFFERS</span>
        </div>
        <div style={{ width: 56, height: 3, background: 'linear-gradient(90deg,#d4af37,#f5d87a)', margin: '0 auto 44px', borderRadius: 2 }} />

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 22, padding: '52px 40px', backdropFilter: 'blur(14px)' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg,#d4af37,#f5d87a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <i className="fa-solid fa-screwdriver-wrench" style={{ fontSize: 26, color: '#05070d' }} />
          </div>

          <h1 style={{ fontSize: 23, fontWeight: 800, color: 'white', marginBottom: 12, letterSpacing: 0.5 }}>
            Temporarily Unavailable
          </h1>
          <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75, margin: 0 }}>
            The RFS portal is down for maintenance right now. Your profile and
            benefits are unaffected — please check back shortly.
          </p>

          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(212,175,55,0.15)' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.7 }}>
              Need help in the meantime? Contact your representative, or reach us at{' '}
              <a href="/contact" style={{ color: '#d4af37', textDecoration: 'none', fontWeight: 600 }}>themagaoffers.net/contact</a>.
            </p>
          </div>
        </div>

        <a href="/" style={{ display: 'inline-block', marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          ← Back to store
        </a>
      </div>
    </div>
  )
}

export function RFSPortal() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [profile, setProfile]   = useState<RFSProfile | null>(null)
  const [animated, setAnimated] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard'|'cashout'|'wallets'|'transactions'|'history'>('dashboard')

  const benefitRaw    = useCountUp(profile ? Number(profile.benefit_amount) : 0, 2400)
  const activationRaw = useCountUp(profile ? profile.activation_pct : 0, 1800)
  const deductionRaw  = useCountUp(profile ? profile.deduction_pct : 0, 1600)

  useEffect(() => {
    document.body.classList.add('rfs-active')
    return () => { document.body.classList.remove('rfs-active') }
  }, [])

  useEffect(() => {
    if (profile) {
      const t = setTimeout(() => setAnimated(true), 180)
      return () => clearTimeout(t)
    }
    setAnimated(false)
  }, [profile])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/rfs/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setProfile(data.profile)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function signOut() { setProfile(null); setEmail(''); setActiveTab('dashboard') }

  const tx = (profile?.portal_texts ?? {}) as Record<string, string>
  const t = (key: string, def: string) => tx[key] || def

  function resolveStep(n: number): { label: string; sub: string; done: boolean; active: boolean } {
    const stateKey = `step${n}_state`
    const override = tx[stateKey] ?? ''
    let done = false, active = false
    if (override === 'done')    { done = true }
    else if (override === 'active')  { active = true }
    else if (override === 'pending') { /* pending */ }
    else {
      if (n === 1) done = true
      else if (n === 2) active = profile?.status === 'under_review'
      else if (n === 3) done = (profile?.activation_pct ?? 0) >= 50
      else if (n === 4) done = (profile?.activation_pct ?? 0) >= 80
      else if (n === 5) done = profile?.status === 'completed'
    }
    const defaultLabels = ['Request Received','Under Review','Compliance Check','Final Verification','Activation Approval']
    const label = t(`step${n}_label`, defaultLabels[n - 1])
    let sub: string
    if (n === 1 && !override) sub = t('step1_sub', 'Complete')
    else if (n === 2 && !override) sub = t('step2_sub', 'In Progress')
    else if (done)   sub = t('step_done', 'Complete')
    else if (active) sub = t('step2_sub', 'In Progress')
    else             sub = t('step_pending', 'Pending')
    return { label, sub, done, active }
  }

  // Completion is per requirement. Keying it by product id broke as soon as
  // the same product was required twice — marking one done marked both.
  const completedCount = profile?.required_products.filter(p =>
    p.completed ?? profile.completed_product_ids.includes(p.id)
  ).length ?? 0
  const totalRequired  = profile?.required_products.length ?? 0
  const pending        = totalRequired - completedCount
  const benefitNum     = profile ? Number(profile.benefit_amount) : 0
  const benefitStr     = `$${benefitRaw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const deadlineDate   = profile?.deadline ? new Date(profile.deadline) : null
  const deadlineStr    = deadlineDate
    ? deadlineDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      + '  ' + deadlineDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null
  const sc = STATUS_COLOR[profile?.status ?? ''] ?? '#f59e0b'

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{background:#060a14}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 12px #d4af3740}50%{box-shadow:0 0 28px #d4af3780}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes drawLine{from{stroke-dashoffset:900}to{stroke-dashoffset:0}}
        @keyframes livePulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(2);opacity:0.3}}
        @keyframes blinkDot{0%,100%{opacity:1}48%{opacity:1}50%{opacity:0}52%{opacity:0}}
        @keyframes scanH{from{transform:translateX(-100%)}to{transform:translateX(400%)}}
        @keyframes techGlow{0%,100%{text-shadow:0 0 14px rgba(212,175,55,0.35)}50%{text-shadow:0 0 32px rgba(212,175,55,0.75)}}
        @keyframes barIn{from{width:0}to{width:var(--bw)}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulseRing{0%{transform:scale(1);opacity:0.7}100%{transform:scale(3.5);opacity:0}}
        @keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:0}8%{opacity:1}70%{opacity:0.9}100%{transform:translateY(-100vh) scale(0.4);opacity:0}}
        @keyframes rotateBorder{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes shimmer{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
        @media(max-width:600px){.rfs-nav-lbl{display:none!important}.rfs-sidebar{width:62px!important}}
        .card{animation:fadeUp .45s ease both}
        .buy-btn:hover{opacity:.85;transform:translateY(-1px)}
        .buy-btn{transition:all .2s}
        ::-webkit-scrollbar{width:5px;background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:3px}
      `}</style>

      {!profile ? (
        /* ── LOGIN ─────────────────────────────────── */
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif', position: 'relative', overflow: 'hidden' }}>
          {/* Login background grid */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <pattern id="lg0" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M50 0L0 0 0 50" fill="none" stroke="rgba(212,175,55,0.04)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#lg0)"/>
            </svg>
            <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle,rgba(212,175,55,0.06) 0%,transparent 65%)', borderRadius: '50%' }}/>
            {PARTICLES.map((p, i) => (
              <div key={i} style={{ position: 'absolute', bottom: 0, left: p.left, width: p.size, height: p.size, borderRadius: '50%', background: p.color, animation: `floatUp ${p.duration} ${p.delay} linear infinite` }} />
            ))}
          </div>

          <div style={{ position: 'relative', zIndex: 1, marginBottom: 44, textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 4, color: 'white' }}>
              MAGA <span style={{ color: '#d4af37' }}>OFFERS</span>
            </div>
            <div style={{ width: 56, height: 3, background: 'linear-gradient(90deg,#d4af37,#f5d87a)', margin: '10px auto 0', borderRadius: 2 }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 22, padding: '52px 44px', maxWidth: 440, width: '100%', textAlign: 'center', backdropFilter: 'blur(14px)', animation: 'fadeUp .4s ease', overflow: 'hidden' }}>
            {/* scan line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg,transparent,#d4af37,#f5d87a,#d4af37,transparent)', boxShadow: '0 0 16px #d4af37', animation: 'scanH 2.5s linear infinite', pointerEvents: 'none', zIndex: 2 }} />
            {/* shield with orbit rings */}
            <div style={{ position: 'relative', width: 68, height: 68, margin: '0 auto 40px' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -56, marginTop: -56, width: 112, height: 112, borderRadius: '50%', border: '2px solid rgba(212,175,55,0.6)', boxShadow: '0 0 12px rgba(212,175,55,0.4)', animation: 'orbit 7s linear infinite', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#d4af37', boxShadow: '0 0 14px #d4af37, 0 0 28px #d4af37' }} />
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -44, marginTop: -44, width: 88, height: 88, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.55)', boxShadow: '0 0 10px rgba(16,185,129,0.3)', animation: 'orbit 4.5s linear infinite reverse', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981, 0 0 24px #10b981' }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, width: 68, height: 68, background: 'linear-gradient(135deg,#d4af37,#f5d87a)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'glow 2.5s infinite', zIndex: 1 }}>
                <i className="fa-solid fa-shield-halved" style={{ fontSize: 26, color: '#060a14' }} />
              </div>
            </div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: 'white', marginBottom: 10 }}>Rewards Portal</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 32 }}>
              Enter the email you used when purchasing to access your personalized rewards dashboard.
            </p>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#fca5a5', fontSize: 13, lineHeight: 1.6, textAlign: 'left' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }} />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address" required autoFocus
                style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 18px', fontSize: 15, color: 'white', fontFamily: 'inherit', outline: 'none', width: '100%' }}
              />
              <button type="submit" disabled={loading || !email.trim()}
                style={{ background: 'linear-gradient(135deg,#d4af37,#f5d87a)', color: '#060a14', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: loading || !email.trim() ? 'not-allowed' : 'pointer', opacity: loading || !email.trim() ? 0.7 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'opacity .2s' }}>
                {loading
                  ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,.2)', borderTopColor: '#060a14', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />Checking…</>
                  : <><i className="fa-solid fa-arrow-right-to-bracket" />Access My Dashboard</>
                }
              </button>
            </form>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 24, lineHeight: 1.7 }}>
              Only authorized accounts can access this portal.<br />Contact your representative if you need access.
            </p>
          </div>

          <a href="/" style={{ position: 'relative', zIndex: 1, marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.45)', fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '9px 20px', backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.04)', transition: 'all .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'white'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
            <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} />
            Back to Website
          </a>
        </div>
      ) : (
        /* ── DASHBOARD ─────────────────────────────── */
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: BG, fontFamily: 'system-ui,sans-serif', color: 'white', position: 'relative' }}>

          {/* Technical grid background */}
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <pattern id="sg" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0L0 0 0 40" fill="none" stroke="rgba(212,175,55,0.032)" strokeWidth="0.5"/>
                </pattern>
                <pattern id="lg" width="200" height="200" patternUnits="userSpaceOnUse">
                  <rect width="200" height="200" fill="url(#sg)"/>
                  <path d="M200 0L0 0 0 200" fill="none" stroke="rgba(212,175,55,0.055)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#lg)"/>
            </svg>
            <div style={{ position: 'absolute', top: -200, right: -150, width: 700, height: 700, background: 'radial-gradient(circle,rgba(212,175,55,0.065) 0%,transparent 65%)', borderRadius: '50%' }}/>
            <div style={{ position: 'absolute', bottom: -300, left: -200, width: 600, height: 600, background: 'radial-gradient(circle,rgba(16,185,129,0.04) 0%,transparent 65%)', borderRadius: '50%' }}/>
            {/* Floating particles */}
            {PARTICLES.map((p, i) => (
              <div key={i} style={{ position: 'absolute', bottom: 0, left: p.left, width: p.size, height: p.size, borderRadius: '50%', background: p.color, animation: `floatUp ${p.duration} ${p.delay} linear infinite`, pointerEvents: 'none' }} />
            ))}
          </div>

          {/* Top bar */}
          <div style={{ zIndex: 20, background: 'rgba(6,10,20,0.94)', borderBottom: '1px solid rgba(212,175,55,0.12)', padding: '13px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, backdropFilter: 'blur(16px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: 3 }}>MAGA <span style={{ color: '#d4af37' }}>OFFERS</span></div>
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('topbar_label', 'Rewards Portal')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{profile.display_name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{profile.gmail}</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#d4af37,#f5d87a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#060a14', flexShrink: 0 }}>
                {profile.display_name[0]?.toUpperCase()}
              </div>
              <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)', padding: '7px 16px', borderRadius: 50, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('signout_btn', 'Sign Out')}
              </button>
            </div>
          </div>

          {/* Body: sidebar + main */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

            {/* Sidebar nav */}
            <div className="rfs-sidebar" style={{ width: 200, flexShrink: 0, borderRight: '1px solid rgba(212,175,55,0.12)', background: 'rgba(5,9,18,0.96)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', paddingTop: 16, overflowY: 'auto' }}>
              {([
                { id: 'dashboard',    label: 'Dashboard',    icon: 'fa-house' },
                { id: 'cashout',      label: 'Cash Out',     icon: 'fa-sack-dollar' },
                { id: 'wallets',      label: 'Wallets',      icon: 'fa-wallet' },
                { id: 'transactions', label: 'Transactions', icon: 'fa-right-left' },
                { id: 'history',      label: 'History',      icon: 'fa-clock-rotate-left' },
              ] as const).map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 22px', border: 'none', background: activeTab === item.id ? 'rgba(212,175,55,0.1)' : 'none', cursor: 'pointer', color: activeTab === item.id ? '#d4af37' : 'rgba(255,255,255,0.38)', fontFamily: 'inherit', fontSize: 14, fontWeight: activeTab === item.id ? 700 : 400, borderLeft: `3px solid ${activeTab === item.id ? '#d4af37' : 'transparent'}`, transition: 'all 0.18s', textAlign: 'left', width: '100%', whiteSpace: 'nowrap' }}>
                  <i className={`fa-solid ${item.icon}`} style={{ width: 18, textAlign: 'center', fontSize: 15, flexShrink: 0 }} />
                  <span className="rfs-nav-lbl">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Main content area */}
            <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>

              {/* Dashboard tab */}
              {activeTab === 'dashboard' && (
                <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 20px 48px' }}>

            {/* Terminal metrics bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 22, padding: '9px 18px', background: 'rgba(0,0,0,0.45)', borderRadius: 10, border: '1px solid rgba(212,175,55,0.08)', flexWrap: 'wrap', fontFamily: 'monospace', fontSize: 11, letterSpacing: 0.5, backdropFilter: 'blur(8px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'livePulse 2s ease-in-out infinite' }}/>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>SYS://</span>
                <span style={{ color: '#10b981' }}>ONLINE</span>
              </div>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }}/>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.28)' }}>ACCT: </span>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>#{profile.id.slice(-8).toUpperCase()}</span>
              </div>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }}/>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.28)' }}>ACT: </span>
                <span style={{ color: '#d4af37' }}>{profile.activation_pct}%</span>
              </div>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }}/>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.28)' }}>DED: </span>
                <span style={{ color: '#ef4444' }}>{profile.deduction_pct}%</span>
              </div>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }}/>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.28)' }}>STATUS: </span>
                <span style={{ color: sc }}>{STATUS_LABEL[profile.status] ?? profile.status.toUpperCase()}</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.3)' }}>
                <i className="fa-solid fa-circle" style={{ fontSize: 7, color: '#d4af37', animation: 'blinkDot 1.4s step-end infinite' }}/>
                LIVE DATA
              </div>
            </div>

            {/* Scrolling data ticker */}
            <div style={{ overflow: 'hidden', marginBottom: 18, borderRadius: 8, border: '1px solid rgba(212,175,55,0.08)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}>
              <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: 'ticker 24s linear infinite' }}>
                {[0, 1].map(rep => (
                  <span key={rep} style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'monospace', fontSize: 11, padding: '7px 0', color: 'rgba(255,255,255,0.28)', letterSpacing: 0.5 }}>
                    <span style={{ color: '#d4af37', margin: '0 20px' }}>◈</span>
                    <span>BENEFIT <span style={{ color: '#d4af37' }}>${Number(profile.benefit_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                    <span style={{ color: '#d4af37', margin: '0 20px' }}>◈</span>
                    <span>ACTIVATION <span style={{ color: '#10b981' }}>{profile.activation_pct}%</span></span>
                    <span style={{ color: '#d4af37', margin: '0 20px' }}>◈</span>
                    <span>STATUS <span style={{ color: sc }}>{STATUS_LABEL[profile.status] ?? 'PROCESSING'}</span></span>
                    <span style={{ color: '#d4af37', margin: '0 20px' }}>◈</span>
                    <span>DEDUCTION <span style={{ color: '#ef4444' }}>{profile.deduction_pct}%</span></span>
                    <span style={{ color: '#d4af37', margin: '0 20px' }}>◈</span>
                    <span>CASHOUT <span style={{ color: '#d4af37' }}>${(Number(profile.benefit_amount) * (1 - profile.deduction_pct / 100)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                    <span style={{ color: '#d4af37', margin: '0 20px' }}>◈</span>
                    <span>ACCT <span style={{ color: 'rgba(255,255,255,0.45)' }}>#{profile.id.slice(-8).toUpperCase()}</span></span>
                    <span style={{ color: '#d4af37', margin: '0 20px' }}>◈</span>
                    <span>PORTAL <span style={{ color: '#10b981' }}>SECURE</span></span>
                    <span style={{ color: '#d4af37', margin: '0 20px' }}>◈</span>
                    <span>ENCRYPTION <span style={{ color: '#3b82f6' }}>AES-256</span></span>
                  </span>
                ))}
              </div>
            </div>

            {/* Welcome row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{t('welcome_label', 'Welcome back,')}</div>
                <h1 style={{ fontSize: 30, fontWeight: 900, color: '#d4af37', margin: 0, letterSpacing: -0.5, animation: 'techGlow 3s ease-in-out infinite' }}>{profile.display_name}</h1>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', marginTop: 5 }}>{t('welcome_sub', "Here's your activation and rewards overview")}</div>
              </div>
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${sc}38`, borderRadius: 16, padding: '16px 22px', minWidth: 230, maxWidth: 340 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${sc}`, animation: 'pulseRing 2s ease-out infinite' }} />
                    <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${sc}`, animation: 'pulseRing 2s ease-out 0.7s infinite' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 10px ${sc}`, flexShrink: 0 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: sc }}>STATUS: {STATUS_LABEL[profile.status] ?? profile.status.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  {profile.custom_message || t('status_fallback', 'Your account is currently being processed. You will be notified once the review is complete.')}
                </div>
              </div>
            </div>

            {/* Row 1: Benefit + Activation Ring + Deduction */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 18, marginBottom: 18 }}>

              {/* Benefit card — rotating gradient border */}
              <div className="card" style={{ position: 'relative', borderRadius: 19, overflow: 'hidden', padding: 1.5 }}>
                <div style={{ position: 'absolute', inset: -80, background: 'conic-gradient(from 0deg, transparent 55%, rgba(212,175,55,0.55) 72%, rgba(245,216,122,0.25) 82%, transparent 96%)', animation: 'rotateBorder 4s linear infinite', pointerEvents: 'none', zIndex: 0 }} />
                <div style={{ position: 'relative', zIndex: 1, background: 'rgba(5,9,18,0.97)', borderRadius: 17, padding: '26px 24px', overflow: 'hidden' }}>
                {/* scan line animation */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg,transparent,#d4af37,#f5d87a,#d4af37,transparent)', boxShadow: '0 0 14px #d4af37', animation: 'scanH 2.5s linear infinite', pointerEvents: 'none' }}/>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 130, height: 130, background: 'radial-gradient(circle,rgba(212,175,55,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{profile.benefit_title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{t('benefit_sub', 'Your estimated reward amount')}</span>
                </div>
                {/* Animated counter */}
                <div style={{ fontSize: 36, fontWeight: 900, color: '#d4af37', letterSpacing: -1, fontFamily: 'monospace', lineHeight: 1 }}>{benefitStr}</div>
                {/* Sparkline chart */}
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <Sparkline color="#d4af37" w={160} h={42} id="benefit" />
                </div>
                <div style={{ marginTop: 14, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <i className="fa-solid fa-clock" style={{ fontSize: 11, color: '#d4af37', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>{t('benefit_note', 'This amount will be available once your activation process is fully completed.')}</span>
                </div>
                </div>{/* end inner card */}
              </div>{/* end rotating border wrapper */}

              {/* Activation ring */}
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '26px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('activation_title', 'Activation Completion')}</div>
                <div style={{ position: 'relative', width: 178, height: 178, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* outer orbit ring — explicitly centered */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 178, height: 178, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.7)', boxShadow: '0 0 14px rgba(16,185,129,0.4)', animation: 'orbit 8s linear infinite', pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 16px #10b981, 0 0 32px #10b981' }} />
                  </div>
                  {/* inner counter-clockwise ring — explicitly centered */}
                  <div style={{ position: 'absolute', top: 9, left: 9, width: 160, height: 160, borderRadius: '50%', border: '2px solid rgba(212,175,55,0.6)', boxShadow: '0 0 12px rgba(212,175,55,0.3)', animation: 'orbit 5s linear infinite reverse', pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: '#d4af37', boxShadow: '0 0 14px #d4af37, 0 0 28px #d4af37' }} />
                  </div>
                  <Ring pct={animated ? profile.activation_pct : 0} size={138} stroke={13} color="#10b981">
                    <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'monospace' }}>{Math.round(activationRaw)}%</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>COMPLETED</div>
                  </Ring>
                </div>
                {/* Mini tick marks around ring area */}
                <div style={{ textAlign: 'center' }}>
                  {profile.activation_pct < 100
                    ? <><div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>{t('activation_msg', 'You are almost there!')}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{t('activation_sub', 'Complete the remaining requirements to proceed with your activation.')}</div></>
                    : <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{t('activation_complete', 'Activation Complete!')}</div>
                  }
                </div>
                {/* Progress segment bar */}
                <div style={{ width: '100%', display: 'flex', gap: 3 }}>
                  {[20, 40, 60, 80, 100].map(milestone => (
                    <div key={milestone} style={{ flex: 1, height: 5, borderRadius: 3, background: profile.activation_pct >= milestone ? '#10b981' : 'rgba(255,255,255,0.07)', transition: 'background 0.4s ease', boxShadow: profile.activation_pct >= milestone ? '0 0 6px rgba(16,185,129,0.5)' : 'none' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                  {[20, 40, 60, 80, 100].map(m => <span key={m}>{m}%</span>)}
                </div>
              </div>

              {/* Deduction summary */}
              {profile.deduction_pct > 0 && (
                <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 18, padding: '26px 24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: 'radial-gradient(circle,rgba(239,68,68,0.08) 0%,transparent 70%)', pointerEvents: 'none' }}/>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>{t('deduction_title', 'Deduction Summary (First Cash-Out)')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
                    <Ring pct={animated ? profile.deduction_pct : 0} size={94} stroke={10} color="#ef4444">
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#ef4444', fontFamily: 'monospace' }}>{Math.round(deductionRaw)}%</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 }}>DEDUCT</div>
                    </Ring>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{t('deduction_cur_label', 'CURRENT DEDUCTION')}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#ef4444', marginBottom: 10, fontFamily: 'monospace' }}>{profile.deduction_pct}%</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{t('deduction_amt_label', 'AMOUNT')}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
                        -${(benefitNum * profile.deduction_pct / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Bar chart comparison */}
                  {profile.minimized_deduction_pct !== null ? (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 12 }}>DEDUCTION ANALYSIS</div>
                      {/* Current bar */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>Current Rate</span>
                          <span style={{ fontSize: 11, fontWeight: 900, color: '#ef4444', fontFamily: 'monospace' }}>{profile.deduction_pct}%</span>
                        </div>
                        <div style={{ height: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(239,68,68,0.1)' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#7f1d1d,#ef4444)', width: animated ? `${profile.deduction_pct}%` : '0%', transition: 'width 1.5s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 0 8px rgba(239,68,68,0.4)' }} />
                        </div>
                      </div>
                      {/* Minimized bar */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>After Requirements</span>
                          <span style={{ fontSize: 11, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>{profile.minimized_deduction_pct}%</span>
                        </div>
                        <div style={{ height: 8, background: 'rgba(16,185,129,0.1)', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.1)' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#064e3b,#10b981)', width: animated ? `${profile.minimized_deduction_pct}%` : '0%', transition: 'width 2s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 0 8px rgba(16,185,129,0.3)' }} />
                        </div>
                      </div>
                      {/* Savings callout */}
                      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '9px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        {(tx['deduction_minimize_prefix'] || tx['deduction_minimize_suffix']) && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                            {tx['deduction_minimize_prefix']} {tx['deduction_minimize_suffix']}
                          </div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', fontFamily: 'monospace', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                          +${(benefitNum * (profile.deduction_pct - profile.minimized_deduction_pct!) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} saved
                        </div>
                      </div>
                    </div>
                  ) : (tx['deduction_minimize_prefix'] || tx['deduction_minimize_suffix']) && (
                    <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                        {tx['deduction_minimize_prefix']} {tx['deduction_minimize_suffix']}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Priority list — fourth card, shown only when an admin has
                  switched it on for this customer. The row is auto-fit, so it
                  simply flows in beside the other three. */}
              {profile.priority_list && (
                <div className="card" style={{ position: 'relative', borderRadius: 19, overflow: 'hidden', padding: 1.5 }}>
                  <div style={{ position: 'absolute', inset: -80, background: 'conic-gradient(from 0deg, transparent 55%, rgba(16,185,129,0.55) 72%, rgba(52,211,153,0.25) 82%, transparent 96%)', animation: 'rotateBorder 4s linear infinite', pointerEvents: 'none', zIndex: 0 }} />
                  <div style={{ position: 'relative', zIndex: 1, background: 'rgba(5,9,18,0.97)', borderRadius: 17, padding: '26px 24px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg,transparent,#10b981,#34d399,#10b981,transparent)', boxShadow: '0 0 14px #10b981', animation: 'scanH 2.5s linear infinite', pointerEvents: 'none' }}/>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 130, height: 130, background: 'radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

                    <div style={{ position: 'relative', width: 62, height: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(16,185,129,0.55)', animation: 'pulseRing 2s ease-out infinite' }} />
                      <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 26px rgba(16,185,129,0.45)' }}>
                        <i className="fa-solid fa-bolt" style={{ fontSize: 25, color: '#052e20' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#10b981', lineHeight: 1.35, letterSpacing: 0.2 }}>
                        {t('priority_title', 'You are now in priority list!')}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginTop: 8 }}>
                        {t('priority_sub', 'Your account has been moved to priority processing. Your activation and cash-out are handled ahead of the standard queue.')}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '6px 16px', fontSize: 10, fontWeight: 800, letterSpacing: 1.4, color: '#10b981', textTransform: 'uppercase' }}>
                      {t('priority_badge', 'Priority')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Required Products */}
            {profile.required_products.length > 0 && (
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.14)', borderRadius: 18, padding: '26px 24px', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 22 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: '#d4af37', marginTop: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#d4af37', lineHeight: 1.5 }}>
                    {t('required_header', 'Action Required: Complete the required product purchase to restore your account to the priority processing list.')}
                    {profile.minimized_deduction_pct !== null && <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}> {t('required_deduction_note', 'Completing them reduces your deduction to only')} {profile.minimized_deduction_pct}%.</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                  {profile.required_products.map(p => {
                    const done = p.completed ?? profile.completed_product_ids.includes(p.id)
                    return (
                      /* Keyed on the requirement, not the product — the same
                         product can legitimately appear twice */
                      <div key={p.key ?? p.id} style={{ background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* What buying this one unlocks */}
                        {p.purpose && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            background: done ? 'rgba(16,185,129,0.12)' : 'rgba(212,175,55,0.12)',
                            border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : 'rgba(212,175,55,0.28)'}`,
                            borderRadius: 8, padding: '7px 11px',
                          }}>
                            <i className={`fa-solid ${done ? 'fa-circle-check' : 'fa-unlock'}`}
                               style={{ fontSize: 11, color: done ? '#10b981' : '#d4af37', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 800, color: done ? '#10b981' : '#d4af37', letterSpacing: 0.3, lineHeight: 1.4 }}>
                              {done
                                ? p.purpose
                                : `${t('purpose_prefix', 'When purchased')} — ${p.purpose}`}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'rgba(255,255,255,0.05)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {done && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-check" style={{ color: 'white', fontSize: 20 }} />
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'white', lineHeight: 1.35, marginBottom: 4 }}>{p.name}</div>
                            {/* The price shown is the bundle's own price. A
                                bundle is not the unit price times the count —
                                three WLFI is $499, not 3 × $299 — so quoting
                                the multiplication would overstate what the
                                customer has to spend. */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 17, fontWeight: 900, color: done ? '#10b981' : '#d4af37', fontFamily: 'monospace' }}>
                                ${Number(p.bundle_total ?? p.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                              {/* Always shown, including a quantity of one — the
                                  customer has to know exactly what to buy, and a
                                  missing badge read as "unspecified". */}
                              <div style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800, color: '#d4af37', letterSpacing: 0.5 }}>
                                ×{p.quantity ?? 1} pc{(p.quantity ?? 1) > 1 ? 's' : ''}
                              </div>
                            </div>
                            {/* Name the exact bundle to pick on the product page */}
                            {p.bundle_label && (
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6, lineHeight: 1.5 }}>
                                <i className="fa-solid fa-box" style={{ marginRight: 6, fontSize: 10, color: '#d4af37' }} />
                                {p.bundle_label}
                              </div>
                            )}
                          </div>
                        </div>
                        {done ? (
                          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '9px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                            <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />{t('product_completed_btn', 'Completed')}
                          </div>
                        ) : (
                          <a href={`/products/${p.id}`} target="_blank" rel="noopener noreferrer" className="buy-btn"
                            style={{ background: 'linear-gradient(135deg,#d4af37,#f5d87a)', color: '#060a14', borderRadius: 8, padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 800, textDecoration: 'none', display: 'block', letterSpacing: 0.5 }}>
                            {t('product_buy_btn', 'Buy Now')}
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Enhanced progress bar */}
                <div style={{ marginTop: 18, padding: '15px 18px', background: 'rgba(255,255,255,0.025)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{t('progress_label', 'Products Completed')}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace' }}>{completedCount} / {totalRequired}</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${animated && totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 4, transition: 'width 1.4s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 0 10px rgba(16,185,129,0.5)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%)', animation: 'shimmer 2.2s ease-in-out infinite' }} />
                    </div>
                  </div>
                  {/* Segment markers */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                    {Array.from({ length: totalRequired }, (_, i) => (
                      <div key={i} style={{ fontSize: 9, color: i < completedCount ? '#10b981' : 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                        {i < completedCount ? '●' : '○'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline + Deadline */}
            <div style={{ display: 'grid', gridTemplateColumns: deadlineStr ? 'minmax(0,1.4fr) minmax(0,1fr)' : '1fr', gap: 18, marginBottom: 18 }}>
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '24px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 22 }}>{t('timeline_title', 'Activation Review Process')}</div>
                {[1, 2, 3, 4, 5].map(resolveStep).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                        background: s.done ? '#10b981' : (s as any).active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                        border: (s as any).active ? '2px solid #d4af37' : 'none',
                        color: s.done ? 'white' : (s as any).active ? '#d4af37' : 'rgba(255,255,255,0.25)',
                        boxShadow: s.done ? '0 0 10px rgba(16,185,129,0.4)' : (s as any).active ? '0 0 10px rgba(212,175,55,0.3)' : 'none',
                      }}>
                        {s.done ? <i className="fa-solid fa-check" /> : i + 1}
                      </div>
                      {i < 4 && <div style={{ width: 2, height: 26, background: s.done ? 'linear-gradient(to bottom,rgba(16,185,129,0.6),rgba(16,185,129,0.15))' : 'rgba(255,255,255,0.05)', margin: '3px 0', transition: 'background 0.5s ease' }} />}
                    </div>
                    <div style={{ paddingTop: 4, paddingBottom: i < 4 ? 28 : 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.done ? 'white' : (s as any).active ? '#d4af37' : 'rgba(255,255,255,0.38)' }}>{s.label}</div>
                      <div style={{ fontSize: 11, marginTop: 2, color: s.done ? '#10b981' : (s as any).active ? '#d4af37' : 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {(s as any).active && <i className="fa-solid fa-circle" style={{ fontSize: 6, animation: 'blinkDot 1.2s step-end infinite' }}/>}
                        {s.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {deadlineStr && (
                <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 18, padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fa-solid fa-calendar-xmark" style={{ color: '#ef4444', fontSize: 16 }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#f87171', letterSpacing: 1, textTransform: 'uppercase' }}>{t('deadline_title', 'Requirement Deadline')}</div>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                    {t('deadline_sub', 'You must complete all required products before the deadline to avoid any delays or cancellation.')}
                  </p>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#ef4444', letterSpacing: 0.5, fontFamily: 'monospace' }}>{deadlineStr}</div>
                  {/* Countdown-style visual */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['DAYS', 'HRS', 'MIN'].map((label, i) => {
                      const now = new Date()
                      const diff = deadlineDate ? deadlineDate.getTime() - now.getTime() : 0
                      const days = Math.max(0, Math.floor(diff / 86400000))
                      const hrs  = Math.max(0, Math.floor((diff % 86400000) / 3600000))
                      const mins = Math.max(0, Math.floor((diff % 3600000) / 60000))
                      const val  = [days, hrs, mins][i]
                      return (
                        <div key={label} style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444', fontFamily: 'monospace', lineHeight: 1 }}>{String(val).padStart(2, '0')}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, letterSpacing: 1 }}>{label}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fca5a5', lineHeight: 1.6 }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                    {t('deadline_note', 'Deadline is final and non-extendable.')}
                  </div>
                </div>
              )}
            </div>

            {/* Footer — cashout amount */}
            <div className="card" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 14, padding: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg,transparent,#d4af37,#f5d87a,#d4af37,transparent)', boxShadow: '0 0 16px #d4af37', animation: 'scanH 2.5s linear infinite', pointerEvents: 'none' }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <i className="fa-solid fa-sack-dollar" style={{ color: '#d4af37', fontSize: 28, flexShrink: 0, animation: 'floatY 3s ease-in-out infinite' }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{t('cashout_label', 'Possible Cash-Out Amount')}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                    PROJECTED · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <Sparkline color="#d4af37" w={120} h={34} id="footer" />
                <div style={{ fontSize: 36, fontWeight: 900, color: '#d4af37', letterSpacing: -1, fontFamily: 'monospace', animation: 'techGlow 3s ease-in-out infinite' }}>{benefitStr}</div>
              </div>
            </div>
                </div>
              )}

              {/* Cash Out — locked */}
              {activeTab === 'cashout' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 32 }}>
                  <div style={{ textAlign: 'center', maxWidth: 360 }}>
                    <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(212,175,55,0.08)', border: '1.5px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(212,175,55,0.1)', animation: 'glow 2.5s infinite' }}>
                      <i className="fa-solid fa-lock" style={{ fontSize: 26, color: '#d4af37' }} />
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: '0 0 10px' }}>Cash Out</h2>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, margin: '0 0 24px' }}>This feature will be available once your activation process is fully completed.</p>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 20px', marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        <span>Activation Progress</span><span style={{ color: '#10b981', fontWeight: 700 }}>{profile.activation_pct}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${profile.activation_pct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 3 }} />
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('dashboard')} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#d4af37', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back to Dashboard</button>
                  </div>
                </div>
              )}

              {/* Wallets — locked */}
              {activeTab === 'wallets' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 32 }}>
                  <div style={{ textAlign: 'center', maxWidth: 360 }}>
                    <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(212,175,55,0.08)', border: '1.5px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(212,175,55,0.1)', animation: 'glow 2.5s infinite' }}>
                      <i className="fa-solid fa-lock" style={{ fontSize: 26, color: '#d4af37' }} />
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: '0 0 10px' }}>Wallets</h2>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, margin: '0 0 24px' }}>This feature will be available once your activation process is fully completed.</p>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 20px', marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        <span>Activation Progress</span><span style={{ color: '#10b981', fontWeight: 700 }}>{profile.activation_pct}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${profile.activation_pct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 3 }} />
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('dashboard')} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#d4af37', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back to Dashboard</button>
                  </div>
                </div>
              )}

              {/* Transactions — empty state */}
              {activeTab === 'transactions' && (
                <div style={{ padding: '28px 24px', maxWidth: 900 }}>
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: '0 0 4px' }}>Transactions</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0 }}>Your cashout and reward transaction history</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 120px 100px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase' }}>
                      <span>Date</span><span>Type</span><span>Amount</span><span>Status</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '72px 24px', gap: 14, textAlign: 'center' }}>
                      <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-receipt" style={{ fontSize: 22, color: 'rgba(255,255,255,0.18)' }} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>No cashout history yet</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>Your completed cashouts and rewards will appear here once processed.</div>
                    </div>
                  </div>
                </div>
              )}

              {/* History — locked */}
              {activeTab === 'history' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 32 }}>
                  <div style={{ textAlign: 'center', maxWidth: 360 }}>
                    <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(212,175,55,0.08)', border: '1.5px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(212,175,55,0.1)', animation: 'glow 2.5s infinite' }}>
                      <i className="fa-solid fa-lock" style={{ fontSize: 26, color: '#d4af37' }} />
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: '0 0 10px' }}>History</h2>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, margin: '0 0 24px' }}>This feature will be available once your activation process is fully completed.</p>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 20px', marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        <span>Activation Progress</span><span style={{ color: '#10b981', fontWeight: 700 }}>{profile.activation_pct}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${profile.activation_pct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 3 }} />
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('dashboard')} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#d4af37', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back to Dashboard</button>
                  </div>
                </div>
              )}

            </div>{/* end main content */}
          </div>{/* end body row */}
        </div>
      )}
    </>
  )
}
