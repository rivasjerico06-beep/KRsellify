'use client'
import { useState, FormEvent } from 'react'

interface ProductInfo { id: string; name: string; price: number; img: string; quantity: number }
interface RFSProfile {
  id: string; gmail: string; display_name: string; benefit_title: string
  benefit_amount: number; activation_pct: number; deduction_pct: number
  minimized_deduction_pct: number | null; required_products: ProductInfo[]
  completed_product_ids: string[]; status: string; deadline: string | null
  custom_message: string | null
}

const STATUS_COLOR: Record<string, string> = {
  under_review: '#f59e0b', active: '#10b981', completed: '#3b82f6',
  pending: '#8b5cf6', suspended: '#ef4444',
}
const STATUS_LABEL: Record<string, string> = {
  under_review: 'UNDER REVIEW', active: 'ACTIVE', completed: 'COMPLETED',
  pending: 'PENDING', suspended: 'SUSPENDED',
}

function Ring({ pct, size, stroke, color, children }: {
  pct: number; size: number; stroke: number; color: string; children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

const BG = 'linear-gradient(145deg,#060a14 0%,#0a1020 60%,#070c18 100%)'

export default function RFSPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [profile, setProfile] = useState<RFSProfile | null>(null)

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

  const completedCount = profile?.required_products.filter(p => profile.completed_product_ids.includes(p.id)).length ?? 0
  const totalRequired  = profile?.required_products.length ?? 0
  const pending        = totalRequired - completedCount
  const benefitStr     = profile ? `$${Number(profile.benefit_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'
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
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .card{animation:fadeUp .4s ease both}
        .buy-btn:hover{opacity:.88;transform:translateY(-1px)}
        .buy-btn{transition:all .2s}
        ::-webkit-scrollbar{width:5px;background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:3px}
      `}</style>

      {!profile ? (
        /* ── LOGIN ─────────────────────────────────── */
        <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
          <div style={{ marginBottom: 44, textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 4, color: 'white' }}>
              MAGA <span style={{ color: '#d4af37' }}>OFFERS</span>
            </div>
            <div style={{ width: 56, height: 3, background: 'linear-gradient(90deg,#d4af37,#f5d87a)', margin: '10px auto 0', borderRadius: 2 }} />
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 22, padding: '52px 44px', maxWidth: 440, width: '100%', textAlign: 'center', backdropFilter: 'blur(14px)', animation: 'fadeUp .4s ease' }}>
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
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                autoFocus
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: '14px 18px', fontSize: 15, color: 'white',
                  fontFamily: 'inherit', outline: 'none', width: '100%',
                }}
              />
              <button type="submit" disabled={loading || !email.trim()}
                style={{
                  background: 'linear-gradient(135deg,#d4af37,#f5d87a)', color: '#060a14',
                  border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800,
                  cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !email.trim() ? 0.7 : 1, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'opacity .2s',
                }}>
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

          <a href="/" style={{
            marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 8,
            color: 'rgba(255,255,255,0.45)', fontSize: 13, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50,
            padding: '9px 20px', backdropFilter: 'blur(8px)',
            background: 'rgba(255,255,255,0.04)', transition: 'all .2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'white'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
            <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} />
            Back to Website
          </a>
        </div>
      ) : (
        /* ── DASHBOARD ─────────────────────────────── */
        <div style={{ minHeight: '100vh', background: BG, fontFamily: 'system-ui,sans-serif', color: 'white' }}>

          {/* Top bar */}
          <div style={{ background: 'rgba(6,10,20,0.92)', borderBottom: '1px solid rgba(212,175,55,0.12)', padding: '13px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: 3 }}>MAGA <span style={{ color: '#d4af37' }}>OFFERS</span></div>
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Rewards Portal</div>
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
                Sign Out
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 20px 48px' }}>

            {/* Welcome row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Welcome back,</div>
                <h1 style={{ fontSize: 30, fontWeight: 900, color: '#d4af37', margin: 0, letterSpacing: -0.5 }}>{profile.display_name}</h1>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', marginTop: 5 }}>Here&apos;s your activation and rewards overview</div>
              </div>
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${sc}38`, borderRadius: 16, padding: '16px 22px', minWidth: 230, maxWidth: 340 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, boxShadow: `0 0 8px ${sc}` }} />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: sc }}>STATUS: {STATUS_LABEL[profile.status] ?? profile.status.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  {profile.custom_message || 'Your account is currently being processed. You will be notified once the review is complete.'}
                </div>
              </div>
            </div>

            {/* Row 1: Benefit + Progress + Deduction */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 18, marginBottom: 18 }}>

              {/* Benefit */}
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 18, padding: '26px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 110, height: 110, background: 'radial-gradient(circle,rgba(212,175,55,0.09) 0%,transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{profile.benefit_title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Your estimated reward amount</span>
                </div>
                <div style={{ fontSize: 38, fontWeight: 900, color: '#d4af37', letterSpacing: -1 }}>{benefitStr}</div>
                <div style={{ marginTop: 18, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <i className="fa-solid fa-clock" style={{ fontSize: 11, color: '#d4af37', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>This amount will be available once your activation process is fully completed.</span>
                </div>
              </div>

              {/* Activation ring */}
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '26px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase' }}>Activation Completion</div>
                <Ring pct={profile.activation_pct} size={134} stroke={13} color="#10b981">
                  <div style={{ fontSize: 30, fontWeight: 900 }}>{profile.activation_pct}%</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>COMPLETED</div>
                </Ring>
                <div style={{ textAlign: 'center' }}>
                  {profile.activation_pct < 100
                    ? <><div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>You are almost there!</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>Complete the remaining requirements to proceed with your activation.</div></>
                    : <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>Activation Complete!</div>
                  }
                </div>
              </div>

              {/* Deduction summary */}
              {profile.deduction_pct > 0 && (
                <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 18, padding: '26px 24px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>Deduction Summary (First Cash-Out)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
                    <Ring pct={profile.deduction_pct} size={90} stroke={10} color="#ef4444">
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#ef4444' }}>{profile.deduction_pct}%</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 }}>DEDUCTION</div>
                    </Ring>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>CURRENT DEDUCTION</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#ef4444', marginBottom: 10 }}>{profile.deduction_pct}%</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>AMOUNT</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#ef4444' }}>
                        ${(Number(profile.benefit_amount) * profile.deduction_pct / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {profile.minimized_deduction_pct !== null && pending > 0 && (
                    <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                        Complete {pending} required product{pending > 1 ? 's' : ''} to minimize your deduction to <strong style={{ color: '#10b981' }}>{profile.minimized_deduction_pct}%</strong>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981', flexShrink: 0 }}>{profile.minimized_deduction_pct}%</div>
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
                    Action Required: Complete the required product purchase to restore your account to the priority processing list.
                    {profile.minimized_deduction_pct !== null && <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}> Completing them reduces your deduction to only {profile.minimized_deduction_pct}%.</span>}
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
                              <div style={{ fontSize: 17, fontWeight: 900, color: done ? '#10b981' : '#d4af37' }}>${Number(p.price).toFixed(2)}</div>
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
                            <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />Completed
                          </div>
                        ) : (
                          <a href={`/products/${p.id}`} target="_blank" rel="noopener noreferrer" className="buy-btn"
                            style={{ background: 'linear-gradient(135deg,#d4af37,#f5d87a)', color: '#060a14', borderRadius: 8, padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 800, textDecoration: 'none', display: 'block', letterSpacing: 0.5 }}>
                            Buy Now
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 18, padding: '15px 18px', background: 'rgba(255,255,255,0.025)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Products Completed</span>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>{completedCount} / {totalRequired}</span>
                  </div>
                  <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 4, transition: 'width 1s ease' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Timeline + Deadline */}
            <div style={{ display: 'grid', gridTemplateColumns: deadlineStr ? 'minmax(0,1.4fr) minmax(0,1fr)' : '1fr', gap: 18, marginBottom: 18 }}>
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '24px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 22 }}>Activation Review Process</div>
                {[
                  { label: 'Request Received',   sub: 'Complete',                                          done: true },
                  { label: 'Under Review',        sub: 'In Progress',                                       active: profile.status === 'under_review' },
                  { label: 'Compliance Check',    sub: profile.activation_pct >= 50 ? 'Complete' : 'Pending', done: profile.activation_pct >= 50 },
                  { label: 'Final Verification',  sub: profile.activation_pct >= 80 ? 'Complete' : 'Pending', done: profile.activation_pct >= 80 },
                  { label: 'Activation Approval', sub: profile.status === 'completed' ? 'Complete' : 'Pending', done: profile.status === 'completed' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                        background: s.done ? '#10b981' : (s as any).active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                        border: (s as any).active ? '2px solid #d4af37' : 'none',
                        color: s.done ? 'white' : (s as any).active ? '#d4af37' : 'rgba(255,255,255,0.25)',
                      }}>
                        {s.done ? <i className="fa-solid fa-check" /> : i + 1}
                      </div>
                      {i < 4 && <div style={{ width: 2, height: 26, background: s.done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.05)', margin: '3px 0' }} />}
                    </div>
                    <div style={{ paddingTop: 4, paddingBottom: i < 4 ? 28 : 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.done ? 'white' : (s as any).active ? '#d4af37' : 'rgba(255,255,255,0.38)' }}>{s.label}</div>
                      <div style={{ fontSize: 11, marginTop: 2, color: s.done ? '#10b981' : (s as any).active ? '#d4af37' : 'rgba(255,255,255,0.22)' }}>{s.sub}</div>
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
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#f87171', letterSpacing: 1, textTransform: 'uppercase' }}>Requirement Deadline</div>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                    You must complete all required products before the deadline to avoid any delays or cancellation.
                  </p>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#ef4444', letterSpacing: 0.5 }}>{deadlineStr}</div>
                  <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fca5a5', lineHeight: 1.6 }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                    Deadline is final and non-extendable.
                  </div>
                </div>
              )}
            </div>

            {/* Footer notice */}
            <div className="card" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
              <i className="fa-solid fa-sack-dollar" style={{ color: '#d4af37', fontSize: 26, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Your Possible Cash-Out</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#d4af37', letterSpacing: -0.5 }}>{benefitStr}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 4, lineHeight: 1.6 }}>
                  This amount will be available once the required item has been secured.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
