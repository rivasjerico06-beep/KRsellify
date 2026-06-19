'use client'
import { useState, useEffect, FormEvent } from 'react'

interface ProductInfo { id: string; name: string; price: number; img: string; quantity: number }
interface RFSProfile {
  id: string; gmail: string; display_name: string; benefit_title: string
  benefit_amount: number; activation_pct: number; deduction_pct: number
  minimized_deduction_pct: number | null; required_products: ProductInfo[]
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

export default function RFSPage() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [profile, setProfile]   = useState<RFSProfile | null>(null)
  const [animated, setAnimated] = useState(false)

  const benefitRaw    = useCountUp(profile ? Number(profile.benefit_amount) : 0, 2400)
  const activationRaw = useCountUp(profile ? profile.activation_pct : 0, 1800)
  const deductionRaw  = useCountUp(profile ? profile.deduction_pct : 0, 1600)

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

  function signOut() { setProfile(null); setEmail('') }

  const tx = (profile?.portal_texts ?? {}) as Record<string, string>
  const t = (key: string, def: string) => tx[key] || def

  const completedCount = profile?.required_products.filter(p => profile.completed_product_ids.includes(p.id)).length ?? 0
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
          </div>

          <div style={{ position: 'relative', zIndex: 1, marginBottom: 44, textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 4, color: 'white' }}>
              MAGA <span style={{ color: '#d4af37' }}>OFFERS</span>
            </div>
            <div style={{ width: 56, height: 3, background: 'linear-gradient(90deg,#d4af37,#f5d87a)', margin: '10px auto 0', borderRadius: 2 }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 22, padding: '52px 44px', maxWidth: 440, width: '100%', textAlign: 'center', backdropFilter: 'blur(14px)', animation: 'fadeUp .4s ease' }}>
            <div style={{ width: 68, height: 68, background: 'linear-gradient(135deg,#d4af37,#f5d87a)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', animation: 'glow 2.5s infinite' }}>
              <i className="fa-solid fa-shield-halved" style={{ fontSize: 26, color: '#060a14' }} />
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
        <div style={{ minHeight: '100vh', background: BG, fontFamily: 'system-ui,sans-serif', color: 'white', position: 'relative' }}>

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
          </div>

          {/* Top bar */}
          <div style={{ zIndex: 20, background: 'rgba(6,10,20,0.94)', borderBottom: '1px solid rgba(212,175,55,0.12)', padding: '13px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, backdropFilter: 'blur(16px)' }}>
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

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto', padding: '24px 20px 48px' }}>

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

            {/* Welcome row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{t('welcome_label', 'Welcome back,')}</div>
                <h1 style={{ fontSize: 30, fontWeight: 900, color: '#d4af37', margin: 0, letterSpacing: -0.5, animation: 'techGlow 3s ease-in-out infinite' }}>{profile.display_name}</h1>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', marginTop: 5 }}>{t('welcome_sub', "Here's your activation and rewards overview")}</div>
              </div>
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${sc}38`, borderRadius: 16, padding: '16px 22px', minWidth: 230, maxWidth: 340 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 10px ${sc}`, animation: 'livePulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: sc }}>STATUS: {STATUS_LABEL[profile.status] ?? profile.status.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  {profile.custom_message || t('status_fallback', 'Your account is currently being processed. You will be notified once the review is complete.')}
                </div>
              </div>
            </div>

            {/* Row 1: Benefit + Activation Ring + Deduction */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 18, marginBottom: 18 }}>

              {/* Benefit card */}
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 18, padding: '26px 24px', position: 'relative', overflow: 'hidden' }}>
                {/* scan line animation */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)', animation: 'scanH 4s linear 1s infinite', pointerEvents: 'none' }}/>
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
              </div>

              {/* Activation ring */}
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '26px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('activation_title', 'Activation Completion')}</div>
                <Ring pct={animated ? profile.activation_pct : 0} size={138} stroke={13} color="#10b981">
                  <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'monospace' }}>{Math.round(activationRaw)}%</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>COMPLETED</div>
                </Ring>
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
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                          {t('deduction_minimize_prefix', 'Complete')} {pending} item{pending !== 1 ? 's' : ''} {t('deduction_minimize_suffix', 'to minimize deduction to')} <strong style={{ color: '#10b981' }}>{profile.minimized_deduction_pct}%</strong>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          +${(benefitNum * (profile.deduction_pct - profile.minimized_deduction_pct!) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} saved
                        </div>
                      </div>
                    </div>
                  ) : pending > 0 && (
                    <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                        {t('deduction_minimize_prefix', 'Complete')} {pending} required product{pending > 1 ? 's' : ''} {t('deduction_minimize_suffix', 'to minimize your deduction')}
                      </div>
                    </div>
                  )}
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
                    const done = profile.completed_product_ids.includes(p.id)
                    return (
                      <div key={p.id} style={{ background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 17, fontWeight: 900, color: done ? '#10b981' : '#d4af37', fontFamily: 'monospace' }}>${Number(p.price).toFixed(2)}</div>
                              {(p.quantity ?? 1) > 1 && (
                                <div style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800, color: '#d4af37', letterSpacing: 0.5 }}>
                                  ×{p.quantity} pcs
                                </div>
                              )}
                            </div>
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
                    <div style={{ height: '100%', width: `${animated && totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 4, transition: 'width 1.4s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 0 10px rgba(16,185,129,0.5)' }} />
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
                {[
                  { label: t('step1_label', 'Request Received'),   sub: t('step1_sub', 'Complete'),      done: true },
                  { label: t('step2_label', 'Under Review'),        sub: t('step2_sub', 'In Progress'),    active: profile.status === 'under_review' },
                  { label: t('step3_label', 'Compliance Check'),    sub: profile.activation_pct >= 50 ? t('step_done', 'Complete') : t('step_pending', 'Pending'), done: profile.activation_pct >= 50 },
                  { label: t('step4_label', 'Final Verification'),  sub: profile.activation_pct >= 80 ? t('step_done', 'Complete') : t('step_pending', 'Pending'), done: profile.activation_pct >= 80 },
                  { label: t('step5_label', 'Activation Approval'), sub: profile.status === 'completed' ? t('step_done', 'Complete') : t('step_pending', 'Pending'), done: profile.status === 'completed' },
                ].map((s, i) => (
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
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.6),transparent)', animation: 'scanH 5s linear infinite', pointerEvents: 'none' }}/>
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
        </div>
      )}
    </>
  )
}
