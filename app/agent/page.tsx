'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { Lead } from '@/lib/types'

export default function AgentPage() {
  return (
    <AuthGuard agentOnly>
      <AgentContent />
    </AuthGuard>
  )
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  new:             { bg: '#dbeafe', text: '#1e40af', label: 'New' },
  assigned:        { bg: '#e0f2fe', text: '#0369a1', label: 'Assigned' },
  attempted:       { bg: '#fef9c3', text: '#854d0e', label: 'Attempted' },
  interested:      { bg: '#dcfce7', text: '#166534', label: 'Interested' },
  follow_up:       { bg: '#ede9fe', text: '#5b21b6', label: 'Follow Up' },
  converted:       { bg: '#d1fae5', text: '#065f46', label: 'Converted' },
  not_interested:  { bg: '#f3f4f6', text: '#374151', label: 'Not Interested' },
  do_not_contact:  { bg: '#fee2e2', text: '#991b1b', label: 'Do Not Contact' },
}

function AgentContent() {
  const { user, profile, agentProfile, signOut } = useAuth()
  const supabase = getBrowserSupabase()
  const [leads, setLeads]         = useState<Lead[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected]   = useState<Lead | null>(null)
  const [noteText, setNoteText]   = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [updating, setUpdating]   = useState(false)

  const fetchLeads = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/agent/leads', {
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    })
    const data = await res.json()
    setLeads(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [supabase, user])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const filtered = leads.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchSearch = !search ||
      l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      l.customer_phone.includes(search)
    return matchStatus && matchSearch
  })

  async function updateLead(id: string, updates: Partial<Lead>) {
    setUpdating(true)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/agent/leads', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ id, ...updates }),
    })
    fetchLeads()
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...updates } : null)
    setUpdating(false)
  }

  const converted = leads.filter(l => l.status === 'converted').length
  const stats = {
    total:          leads.length,
    ready:          leads.filter(l => ['new', 'assigned'].includes(l.status)).length,
    followUp:       leads.filter(l => l.status === 'follow_up').length,
    converted,
    conversionRate: leads.length > 0 ? Math.round(converted / leads.length * 100) : 0,
  }

  const [copied, setCopied] = useState(false)
  const [phoneCopied, setPhoneCopied] = useState(false)

  function copyCode() {
    if (!agentProfile?.referral_code) return
    navigator.clipboard.writeText(agentProfile.referral_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openDialer(phone: string) {
    navigator.clipboard.writeText(phone).catch(() => {})
    setPhoneCopied(true)
    setTimeout(() => setPhoneCopied(false), 3000)
    window.open(
      'https://www.helloairdial.com/',
      'helloairdial',
      'width=500,height=700,left=100,top=100,resizable=yes,scrollbars=yes'
    )
  }

  function formatDate(d: string | null | undefined) {
    if (!d) return null
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      {/* header */}
      <div style={{ background: 'var(--navy)', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 900, color: 'white' }}>
          Maga <span style={{ color: 'var(--teal-light)' }}>Offers</span>
          <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--teal)', padding: '2px 10px', borderRadius: 20, marginLeft: 10, verticalAlign: 'middle' }}>Agent</span>
        </a>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{profile?.full_name ?? user?.email}</span>
          <a href="/agent/dialer" style={{ background: 'var(--teal)', color: 'var(--navy)', padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fa-solid fa-phone" />Dialer
          </a>
          <a href="/account" style={{ color: 'var(--teal-light)', fontSize: 13, fontWeight: 600 }}>Account</a>
          <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', borderRadius: 50, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 32, fontWeight: 900, color: 'var(--heading)', marginBottom: 4 }}>Agent Dashboard</h1>
            <p style={{ color: 'var(--text-mid)' }}>Welcome back, {agentProfile?.display_name}</p>
          </div>

          {/* Referral code card */}
          {agentProfile?.referral_code && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              style={{ background: 'var(--white)', borderRadius: 16, padding: '16px 24px', boxShadow: '0 4px 20px rgba(9,52,89,0.10)', border: '2px solid var(--teal)', minWidth: 240 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                <i className="fa-solid fa-share-nodes" style={{ marginRight: 6, color: 'var(--teal)' }} />
                Your Referral Code
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: 'var(--heading)', letterSpacing: '0.1em' }}>
                  {agentProfile.referral_code}
                </span>
                <button onClick={copyCode}
                  style={{ background: copied ? '#d1fae5' : 'var(--gray)', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: copied ? '#065f46' : 'var(--text-mid)', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 6 }}>Share this code with customers you guide to the store</p>
            </motion.div>
          )}
        </div>

        {/* stats — 5 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Leads',      value: stats.total,          icon: 'fa-users',        color: 'var(--heading)' },
            { label: 'Ready to Call',    value: stats.ready,          icon: 'fa-phone',        color: 'var(--teal)' },
            { label: 'Follow Ups',       value: stats.followUp,       icon: 'fa-clock',        color: '#7c3aed' },
            { label: 'Converted',        value: stats.converted,      icon: 'fa-check-circle', color: '#059669' },
            { label: 'Conversion Rate',  value: `${stats.conversionRate}%`, icon: 'fa-percent',color: '#d97706' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              style={{ background: 'var(--white)', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                  <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 30, fontWeight: 900, color: 'var(--heading)' }}>{s.value}</p>
                </div>
                <i className={`fa-solid ${s.icon}`} style={{ fontSize: 20, color: s.color, opacity: 0.7 }} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads…"
            style={{ flex: 1, minWidth: 200, border: '2px solid var(--gray)', borderRadius: 50, padding: '10px 18px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ border: '2px solid var(--gray)', borderRadius: 50, padding: '10px 18px', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* leads list */}
        <div style={{ background: 'var(--white)', borderRadius: 16, boxShadow: '0 2px 12px rgba(9,52,89,0.06)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-light)' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24 }} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-light)' }}>
              <i className="fa-solid fa-inbox" style={{ fontSize: 40, marginBottom: 12, display: 'block', opacity: 0.4 }} />
              No leads found
            </div>
          ) : filtered.map(lead => (
            <motion.div key={lead.id} layout whileHover={{ background: 'var(--off-white)' }}
              onClick={() => { setSelected(lead); setNoteText(lead.notes ?? ''); setFollowUpDate(lead.follow_up_date ?? '') }}
              style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>{lead.customer_name}</p>
                <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>
                  {lead.customer_phone}
                  {lead.product_interest && ` · ${lead.product_interest}`}
                </p>
              </div>
              {lead.follow_up_date && (
                <p style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>
                  <i className="fa-solid fa-clock" style={{ marginRight: 4 }} />
                  {formatDate(lead.follow_up_date)}
                </p>
              )}
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: STATUS_COLORS[lead.status]?.bg, color: STATUS_COLORS[lead.status]?.text }}>
                {STATUS_COLORS[lead.status]?.label}
              </span>
              <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-light)', fontSize: 12 }} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* lead detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
            <motion.div key="drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              style={{ position: 'fixed', top: 0, right: 0, width: 420, maxWidth: '100vw', height: '100%', background: 'white', zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)' }}>
              <div style={{ padding: '20px 24px 20px', borderBottom: '1px solid var(--gray)', background: 'var(--navy)', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700 }}>{selected.customer_name}</h3>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}><i className="fa-solid fa-xmark" /></button>
                </div>

                {/* Phone + call button */}
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Phone</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: 'white', fontFamily: 'monospace', letterSpacing: '0.04em' }}>{selected.customer_phone}</p>
                  </div>
                  <button
                    onClick={() => openDialer(selected.customer_phone)}
                    style={{
                      background: phoneCopied ? '#059669' : '#4dd9b8',
                      color: phoneCopied ? 'white' : '#0f2441',
                      border: 'none', borderRadius: 10, padding: '10px 18px',
                      fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 7,
                      transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                    <i className={`fa-solid ${phoneCopied ? 'fa-check' : 'fa-phone'}`} />
                    {phoneCopied ? 'Number copied!' : 'Call with HelloAirDial'}
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Status */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Update Status</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(STATUS_COLORS).map(([k, v]) => (
                      <button key={k} disabled={updating}
                        onClick={() => updateLead(selected.id, { status: k as Lead['status'] })}
                        style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                          background: selected.status === k ? v.bg : 'var(--gray)',
                          color: selected.status === k ? v.text : 'var(--text-mid)' }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Notes</p>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                    style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 100 }} />
                  <button onClick={() => updateLead(selected.id, { notes: noteText })} disabled={updating}
                    style={{ marginTop: 8, background: 'var(--navy)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {updating ? 'Saving…' : 'Save Notes'}
                  </button>
                </div>

                {/* Follow-up date */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Follow-up Date</p>
                  <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                    style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => updateLead(selected.id, { follow_up_date: followUpDate || null })} disabled={updating}
                      style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Save Date
                    </button>
                    {followUpDate && (
                      <button disabled={updating}
                        onClick={() => { setFollowUpDate(''); updateLead(selected.id, { follow_up_date: null }) }}
                        style={{ background: 'var(--gray)', color: 'var(--text-mid)', border: 'none', padding: '10px 16px', borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Product interest */}
                {selected.product_interest && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Product Interest</p>
                    <p style={{ fontSize: 14, color: 'var(--text-dark)' }}>{selected.product_interest}</p>
                  </div>
                )}

                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  <i className="fa-solid fa-clock" style={{ marginRight: 6 }} />
                  Added {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
