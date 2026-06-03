'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { Order, Coupon } from '@/lib/types'

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountContent />
    </AuthGuard>
  )
}

const TIERS = [
  { key: 'platinum', min: 2000, label: 'Platinum', color: '#3b82f6', bg: '#dbeafe' },
  { key: 'gold',     min: 1000, label: 'Gold',     color: '#f59e0b', bg: '#fef9c3' },
  { key: 'silver',   min: 500,  label: 'Silver',   color: '#6b7280', bg: '#f3f4f6' },
  { key: 'bronze',   min: 0,    label: 'Bronze',   color: '#b45309', bg: '#fef3c7' },
]

function getTier(spent: number) {
  return TIERS.find(t => spent >= t.min) ?? TIERS[TIERS.length - 1]
}

function AccountContent() {
  const { user, profile, agentProfile, isAdmin, isApprovedAgent, refreshProfile, signOut } = useAuth()
  const supabase = getBrowserSupabase()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone]       = useState('')
  const [address, setAddress]   = useState('')
  const [city, setCity]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')

  const [applyName, setApplyName]   = useState('')
  const [applyPhone, setApplyPhone] = useState('')
  const [applyNotes, setApplyNotes] = useState('')
  const [applying, setApplying]     = useState(false)
  const [applyMsg, setApplyMsg]     = useState('')

  const [orders, setOrders]   = useState<Order[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
      setAddress(profile.address ?? '')
      setCity(profile.city ?? '')
    }
  }, [profile])

  useEffect(() => {
    async function fetchData() {
      if (!user) return
      setLoadingOrders(true)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }

      const [ordersRes, couponsRes] = await Promise.all([
        fetch('/api/orders', { headers }),
        fetch('/api/coupons', { headers }),
      ])

      if (ordersRes.ok) setOrders(await ordersRes.json())
      if (couponsRes.ok) setCoupons(await couponsRes.json())
      setLoadingOrders(false)
    }
    fetchData()
  }, [user, supabase])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone, address, city }).eq('id', user!.id)
    setSaveMsg(error ? error.message : '✓ Profile saved!')
    if (!error) refreshProfile()
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function applyAsAgent(e: React.FormEvent) {
    e.preventDefault()
    setApplying(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/agent/application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ display_name: applyName, phone: applyPhone, notes: applyNotes }),
    })
    const data = await res.json()
    setApplyMsg(res.ok ? "✓ Application submitted! We'll review it shortly." : data.error ?? 'Something went wrong.')
    if (res.ok) refreshProfile()
    setApplying(false)
  }

  const totalSpent = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0)
  const currentTier = getTier(totalSpent)
  const nextTierIdx = TIERS.indexOf(currentTier) - 1
  const nextTier    = nextTierIdx >= 0 ? TIERS[nextTierIdx] : null
  const tierPct     = nextTier
    ? Math.min(100, ((totalSpent - currentTier.min) / (nextTier.min - currentTier.min)) * 100)
    : 100

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: '12px 16px',
    fontSize: 14, fontFamily: 'inherit', outline: 'none',
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    paid:      { bg: '#dcfce7', text: '#15803d' },
    pending:   { bg: '#fef9c3', text: '#854d0e' },
    confirmed: { bg: '#dbeafe', text: '#1e40af' },
    packed:    { bg: '#ede9fe', text: '#5b21b6' },
    shipped:   { bg: '#e0f2fe', text: '#0369a1' },
    delivered: { bg: '#d1fae5', text: '#065f46' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      {/* top bar */}
      <div style={{ background: 'var(--navy)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'white' }}>
          Maga <span style={{ color: 'var(--teal-light)' }}>Offers</span>
        </a>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {isAdmin && <a href="/admin" style={{ color: 'var(--teal-light)', fontSize: 13, fontWeight: 700 }}>Admin Dashboard →</a>}
          {isApprovedAgent && <a href="/agent" style={{ color: 'var(--teal-light)', fontSize: 13, fontWeight: 700 }}>Agent Dashboard →</a>}
          <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 16px', borderRadius: 50, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* Profile card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--white)', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(9,52,89,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
                {(profile?.full_name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: 'var(--heading)' }}>
                  {profile?.full_name || 'Your Account'}
                </h2>
                <span style={{ fontSize: 12, fontWeight: 700, background: profile?.role === 'admin' ? 'var(--navy)' : profile?.role === 'agent' ? 'var(--teal)' : 'var(--gray)', color: profile?.role === 'customer' ? 'var(--text-mid)' : 'white', padding: '2px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {profile?.role ?? 'customer'}
                </span>
              </div>
            </div>

            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Profile Details</p>
              <input style={inputStyle} placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
              <input style={{ ...inputStyle, background: 'var(--gray)' }} value={user?.email ?? ''} readOnly />
              <input style={inputStyle} placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
              <input style={inputStyle} placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
              <input style={inputStyle} placeholder="City" value={city} onChange={e => setCity(e.target.value)} />

              <AnimatePresence>
                {saveMsg && (
                  <motion.p key="msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ fontSize: 13, color: saveMsg.startsWith('✓') ? 'var(--teal-dark)' : 'var(--sale-red)', fontWeight: 600 }}>
                    {saveMsg}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '12px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving…' : 'Save Profile'}
              </motion.button>
            </form>
          </motion.div>

          {/* Right column */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Loyalty tier */}
            <div style={{ background: 'var(--white)', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(9,52,89,0.08)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                <i className="fa-solid fa-trophy" style={{ marginRight: 6, color: currentTier.color }} />
                Loyalty Status
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 700, padding: '4px 14px', borderRadius: 20, background: currentTier.bg, color: currentTier.color }}>
                  {currentTier.label}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>Total spent: <strong style={{ color: 'var(--heading)' }}>${totalSpent.toFixed(2)}</strong></span>
              </div>
              <div style={{ background: 'var(--gray)', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: 8 }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${tierPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ background: currentTier.color, height: '100%', borderRadius: 8 }} />
              </div>
              {nextTier ? (
                <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>
                  Spend <strong>${(nextTier.min - totalSpent).toFixed(2)}</strong> more to reach <strong style={{ color: nextTier.color }}>{nextTier.label}</strong>
                </p>
              ) : (
                <p style={{ fontSize: 12, color: currentTier.color, fontWeight: 700 }}>🏆 You&apos;ve reached the highest tier!</p>
              )}
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--off-white)', borderRadius: 12, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--heading)' }}>Discount Tiers</p>
                <p>Silver ($500+) → 30% off coupon</p>
                <p>Gold ($1,000+) → 50% off coupon</p>
                <p>Platinum ($2,000+) → VIP status + 50% off coupon</p>
              </div>
            </div>

            {/* Available coupons */}
            {coupons.length > 0 && (
              <div style={{ background: 'var(--white)', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(9,52,89,0.08)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  <i className="fa-solid fa-tag" style={{ marginRight: 6, color: 'var(--teal)' }} />
                  Your Coupons
                </p>
                {coupons.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray)' }}>
                    <div>
                      <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: 'var(--heading)' }}>{c.code}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>{c.discount_pct}% off — {c.tier ?? 'loyalty'} reward</p>
                    </div>
                    <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Active</span>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 10 }}>Use these codes at checkout in the cart</p>
              </div>
            )}

            {/* Agent status */}
            {agentProfile && (
              <div style={{ background: 'var(--white)', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(9,52,89,0.08)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Agent Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: agentProfile.status === 'approved' ? '#d1fae5' : agentProfile.status === 'pending' ? '#fef9c3' : '#fee2e2', color: agentProfile.status === 'approved' ? '#065f46' : agentProfile.status === 'pending' ? '#92400e' : '#991b1b' }}>
                    {agentProfile.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{agentProfile.display_name}</span>
                </div>
                {agentProfile.status === 'approved' && (
                  <a href="/agent" style={{ display: 'inline-block', marginTop: 14, color: 'var(--teal)', fontWeight: 700, fontSize: 13 }}>
                    Go to Agent Dashboard →
                  </a>
                )}
              </div>
            )}

            {/* Apply to become agent */}
            {!agentProfile && profile?.role !== 'admin' && (
              <div style={{ background: 'var(--white)', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(9,52,89,0.08)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Become an Agent</p>
                <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 20, lineHeight: 1.6 }}>
                  Apply to join our agent program, guide customers, and earn commissions on conversions.
                </p>
                <form onSubmit={applyAsAgent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input style={inputStyle} placeholder="Display Name" value={applyName} onChange={e => setApplyName(e.target.value)} required />
                  <input style={inputStyle} placeholder="Phone Number" value={applyPhone} onChange={e => setApplyPhone(e.target.value)} required />
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="Why do you want to become an agent? (optional)" value={applyNotes} onChange={e => setApplyNotes(e.target.value)} />
                  {applyMsg && <p style={{ fontSize: 13, color: applyMsg.startsWith('✓') ? 'var(--teal-dark)' : 'var(--sale-red)', fontWeight: 600 }}>{applyMsg}</p>}
                  <motion.button type="submit" disabled={applying} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    style={{ background: 'var(--teal)', color: 'white', border: 'none', padding: '12px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {applying ? 'Submitting…' : 'Submit Application'}
                  </motion.button>
                </form>
              </div>
            )}

            {/* Quick links */}
            <div style={{ background: 'var(--white)', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(9,52,89,0.08)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Quick Links</p>
              <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray)', color: 'var(--text-dark)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                <i className="fa-solid fa-store" style={{ color: 'var(--teal)', width: 20 }} /> Back to Shop
              </a>
              <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', color: 'var(--sale-red)', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%', marginTop: 4 }}>
                <i className="fa-solid fa-arrow-right-from-bracket" style={{ width: 20 }} /> Sign Out
              </button>
            </div>
          </motion.div>
        </div>

        {/* Order history */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: 'var(--white)', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(9,52,89,0.08)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
            <i className="fa-solid fa-box" style={{ marginRight: 8, color: 'var(--teal)' }} />
            Order History
          </p>

          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24 }} />
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
              <i className="fa-solid fa-inbox" style={{ fontSize: 36, opacity: 0.3, display: 'block', marginBottom: 12 }} />
              <p>No orders yet. Start shopping!</p>
              <a href="/" style={{ display: 'inline-block', marginTop: 12, color: 'var(--teal)', fontWeight: 700, fontSize: 13 }}>Browse Products →</a>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: 'var(--gray)' }}>
                    {['Order ID', 'Date', 'Items', 'Discount', 'Total', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const sc = statusColors[o.status ?? 'pending'] ?? statusColors.pending
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--gray)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-mid)' }}>{o.id?.slice(0, 8)}…</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{Array.isArray(o.items) ? o.items.length : 0} item{Array.isArray(o.items) && o.items.length !== 1 ? 's' : ''}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#059669' }}>{o.discount_amount ? `-$${Number(o.discount_amount).toFixed(2)}` : '—'}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--heading)' }}>${Number(o.total).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.text, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                            {o.status ?? 'pending'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
