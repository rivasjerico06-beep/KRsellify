'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
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

const DISPOSITIONS = [
  { value: 'interested',     label: 'Interested',            icon: 'fa-star',                 color: '#059669', bg: '#d1fae5' },
  { value: 'follow_up',      label: 'Follow Up / Call Back', icon: 'fa-calendar-plus',        color: '#0369a1', bg: '#e0f2fe' },
  { value: 'voicemail',      label: 'Left Voicemail',        icon: 'fa-voicemail',            color: '#7c3aed', bg: '#ede9fe' },
  { value: 'no_answer',      label: 'No Answer',             icon: 'fa-phone-slash',          color: '#d97706', bg: '#fef3c7' },
  { value: 'hung_up',        label: 'Hung Up',                icon: 'fa-phone-xmark',          color: '#ea580c', bg: '#ffedd5' },
  { value: 'not_interested', label: 'Not Interested',        icon: 'fa-thumbs-down',          color: '#64748b', bg: '#f1f5f9' },
  { value: 'wrong_number',   label: 'Wrong Number',          icon: 'fa-triangle-exclamation', color: '#b45309', bg: '#fef9c3' },
  { value: 'converted',      label: 'Converted / Ordered',   icon: 'fa-circle-check',         color: '#065f46', bg: '#a7f3d0' },
  { value: 'do_not_call',    label: 'Do Not Call',           icon: 'fa-ban',                  color: '#991b1b', bg: '#fee2e2' },
]

interface PoolLead {
  id: string
  customer_name: string
  customer_phone: string
  product_interest: string | null
  status: string
}

function DispositionModal({ lead, onSubmit, onClose, submitting }: {
  lead: PoolLead
  onSubmit: (disposition: string, notes: string) => void
  onClose: () => void
  submitting: boolean
}) {
  const [selected, setSelected] = useState('')
  const [notes, setNotes] = useState('')
  const { isDark } = useTheme()
  const M = {
    card:    isDark ? '#1a2e42' : '#ffffff',
    text:    isDark ? '#ecf5fc' : '#0d1f2d',
    muted:   isDark ? '#5e8faa' : '#64748b',
    inputBg: isDark ? '#0b1622' : '#f8fafc',
    btnBg:   isDark ? '#273d52' : '#f8fafc',
    btnText: isDark ? '#94c0d8' : '#475569',
    iconMut: isDark ? '#5e8faa' : '#94a3b8',
    border:  isDark ? '#273d52' : '#e2e8f0',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: M.card, borderRadius: 20, padding: '32px 28px',
          width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: M.text }}>
            <i className="fa-solid fa-clipboard-list" style={{ marginRight: 8, color: 'var(--teal)' }} />
            Log Call Outcome
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.muted, fontSize: 18 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: M.muted, marginBottom: 22 }}>
          {lead.customer_name} — {lead.customer_phone}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {DISPOSITIONS.map(d => (
            <button key={d.value} onClick={() => setSelected(d.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit', transition: 'all 0.15s',
                border: selected === d.value ? `2px solid ${d.color}` : `2px solid ${M.border}`,
                background: selected === d.value ? d.bg : M.btnBg,
                color: selected === d.value ? d.color : M.btnText,
              }}>
              <i className={`fa-solid ${d.icon}`} style={{ fontSize: 13, color: selected === d.value ? d.color : M.iconMut }} />
              {d.label}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Notes (optional)..."
          value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
            border: `2px solid ${M.border}`, outline: 'none', resize: 'vertical',
            background: M.inputBg, color: M.text, fontFamily: 'inherit',
            marginBottom: 18, boxSizing: 'border-box',
          }} />
        <button
          disabled={!selected || submitting}
          onClick={() => selected && onSubmit(selected, notes)}
          style={{
            width: '100%', padding: 14, borderRadius: 50, border: 'none',
            background: selected ? 'var(--navy)' : M.border,
            color: selected ? 'white' : M.muted,
            fontWeight: 700, fontSize: 15, cursor: selected ? 'pointer' : 'default',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {submitting
            ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</>
            : <><i className="fa-solid fa-arrow-right" /> Submit & Next Lead</>}
        </button>
      </motion.div>
    </div>
  )
}

function AgentContent() {
  const { user, profile, agentProfile, session, signOut } = useAuth()
  const { isDark } = useTheme()
  const D = {
    drawerBg: isDark ? '#0f1e2e' : '#f1f5f9',
    card:     isDark ? '#1a2e42' : '#ffffff',
    text:     isDark ? '#ecf5fc' : '#0d1f2d',
    muted:    isDark ? '#5e8faa' : '#64748b',
    border:   isDark ? '#273d52' : '#e2e8f0',
    inputBg:  isDark ? '#0b1622' : '#f8fafc',
    btnBg:    isDark ? '#273d52' : '#e8eff0',
  }
  const supabase = getBrowserSupabase()
  const [leads, setLeads]         = useState<Lead[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected]   = useState<Lead | null>(null)
  const [noteText, setNoteText]   = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [updating, setUpdating]   = useState(false)

  // ── Call-pool / dialer state ──
  const [poolQueue, setPoolQueue] = useState<PoolLead[]>([])
  const [poolLoading, setPoolLoading] = useState(true)
  const [poolPhoneCopied, setPoolPhoneCopied] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimedLead, setClaimedLead] = useState<PoolLead | null>(null)
  const [showDisposition, setShowDisposition] = useState(false)
  const [dispSubmitting, setDispSubmitting] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ended'>('idle')
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [toast, setToast] = useState('')
  const [calledCount, setCalledCount] = useState(0)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialerWindowRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const authHeaders = useCallback((): HeadersInit => ({
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
    'Content-Type': 'application/json',
  }), [session])

  const fetchLeads = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    const res = await fetch('/api/agent/leads', {
      headers: { 'Authorization': `Bearer ${s?.access_token}` },
    })
    const data = await res.json()
    setLeads(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  async function loadPoolQueue() {
    setPoolLoading(true)
    try {
      const res = await fetch('/api/agent/dialer/queue', { headers: authHeaders() })
      const data = await res.json()
      setPoolQueue(Array.isArray(data) ? data : [])
    } finally {
      setPoolLoading(false)
    }
  }

  useEffect(() => { loadPoolQueue() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: remove leads claimed by any agent from the pool view
  useEffect(() => {
    const channel = supabase
      .channel('agent-dialer-pool')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          const updated = payload.new as { id: string; claimed_by: string | null }
          if (updated.claimed_by) {
            setPoolQueue(prev => prev.filter(l => l.id !== updated.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  function showToast(msg: string) {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 3000)
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [claimedLead])

  const currentPoolLead = poolQueue[0] ?? null
  const isInCall = claimedLead !== null && callStatus !== 'idle'

  function skipPoolLead() {
    setPoolQueue(prev => prev.slice(1))
  }

  function copyPoolPhone(phone: string) {
    navigator.clipboard.writeText(phone).catch(() => {})
    setPoolPhoneCopied(true)
    setTimeout(() => setPoolPhoneCopied(false), 1800)
  }

  async function handleClaimAndCall() {
    if (!currentPoolLead) return
    setClaiming(true)
    try {
      const res = await fetch('/api/agent/dialer/claim', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ lead_id: currentPoolLead.id }),
      })

      if (res.status === 409) {
        showToast('Lead just taken by another agent — skipping')
        setPoolQueue(prev => prev.slice(1))
        return
      }
      if (!res.ok) {
        showToast('Failed to claim — try again')
        return
      }

      const claimed = { ...currentPoolLead }
      setClaimedLead(claimed)
      setPoolQueue(prev => prev.slice(1))
      fetchLeads() // claimed lead now belongs to this agent — refresh My Leads immediately

      navigator.clipboard.writeText(claimed.customer_phone).catch(() => {})
      const popup = window.open(
        'https://www.helloairdial.com/',
        'helloairdial',
        'width=500,height=700,left=100,top=100,resizable=yes,scrollbars=yes'
      )
      if (!popup || popup.closed) {
        setPopupBlocked(true)
        setCallStatus('calling')
      } else {
        setPopupBlocked(false)
        dialerWindowRef.current = popup
        setCallStatus('calling')
        pollRef.current = setInterval(() => {
          if (dialerWindowRef.current?.closed) {
            stopPolling()
            setCallStatus('ended')
            setShowDisposition(true)
          }
        }, 1000)
      }
    } finally {
      setClaiming(false)
    }
  }

  async function handlePoolDisposition(disposition: string, notes: string) {
    if (!claimedLead) return
    setDispSubmitting(true)
    try {
      await fetch('/api/agent/dialer/disposition', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ lead_id: claimedLead.id, disposition, notes }),
      })
      setShowDisposition(false)
      setCallStatus('idle')
      setPopupBlocked(false)
      setClaimedLead(null)
      setCalledCount(c => c + 1)
      showToast('Call logged — added to My Leads')
      fetchLeads() // refresh assigned list with the new disposition/status
    } finally {
      setDispSubmitting(false)
    }
  }

  const filtered = leads.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchSearch = !search ||
      l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      l.customer_phone.includes(search)
    return matchStatus && matchSearch
  })

  async function updateLead(id: string, updates: Partial<Lead>) {
    setUpdating(true)
    const { data: { session: s } } = await supabase.auth.getSession()
    await fetch('/api/agent/leads', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${s?.access_token}`,
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
  const [showRules, setShowRules] = useState(false)

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
      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.5)} }`}</style>

      {/* header */}
      <div style={{ background: 'var(--navy)', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 900, color: 'white' }}>
          Maga <span style={{ color: 'var(--teal-light)' }}>Offers</span>
          <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--teal)', padding: '2px 10px', borderRadius: 20, marginLeft: 10, verticalAlign: 'middle' }}>Agent</span>
        </a>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{profile?.full_name ?? user?.email}</span>
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

        {/* ── Call Next Lead (merged dialer) ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--heading)' }}>
              <i className="fa-solid fa-phone" style={{ marginRight: 8, color: 'var(--teal)' }} />
              Call Next Lead
            </h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>
                <i className="fa-solid fa-users" style={{ marginRight: 5, color: 'var(--teal)' }} />
                {poolQueue.length} in shared pool
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>
                <i className="fa-solid fa-check" style={{ marginRight: 5, color: '#059669' }} />
                {calledCount} called this session
              </span>
              <button onClick={loadPoolQueue} style={{ background: 'var(--gray)', border: 'none', color: 'var(--text-mid)', padding: '6px 14px', borderRadius: 50, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <i className="fa-solid fa-rotate" style={{ marginRight: 5 }} />Refresh
              </button>
              <button
                onClick={() => setShowRules(v => !v)}
                style={{
                  background: showRules ? 'var(--navy)' : '#fef9c3',
                  color: showRules ? 'white' : '#854d0e',
                  border: showRules ? 'none' : '2px solid #fde68a',
                  padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <i className={`fa-solid ${showRules ? 'fa-xmark' : 'fa-circle-info'}`} />
                {showRules ? 'Close Rules' : 'View Rules'}
              </button>
            </div>
          </div>

          {/* ── Rules & How-to Panel ── */}
          <AnimatePresence>
            {showRules && (
              <motion.div
                key="rules-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ background: D.card, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(9,52,89,0.10)' }}>

                  {/* Header */}
                  <div style={{ background: 'var(--navy)', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fa-solid fa-book-open" style={{ color: '#1a1200', fontSize: 18 }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 900, fontSize: 17, color: 'white' }}>Agent Rules & Dialer Guide</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Read this before making any calls. Every call must be logged — no exceptions.</p>
                    </div>
                  </div>

                  <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 32 }}>

                    {/* ── SECTION 1: Steps ── */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="fa-solid fa-list-ol" style={{ color: 'white', fontSize: 14 }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 900, color: D.text }}>HOW TO MAKE A CALL</p>
                          <p style={{ fontSize: 12, color: D.muted }}>Follow these steps every single time you call</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                        {[
                          { n: 1, text: 'Look at the "Call Next Lead" box at the top — it shows the next customer' },
                          { n: 2, text: 'Click "Claim & Call" — this locks the lead to YOU so no other agent can take it', bold: true },
                          { n: 3, text: 'The dialer (HelloAirDial) opens automatically. The phone number is already copied to your clipboard' },
                          { n: 4, text: 'Paste the number into HelloAirDial and make the call on your phone' },
                          { n: 5, text: 'When done, come back here and click "Done Calling — Log Outcome"', bold: true },
                          { n: 6, text: 'Pick the correct outcome from the list (see the guide below)' },
                          { n: 7, text: 'Add notes if the customer said something important — especially a new phone number or email', bold: true },
                          { n: 8, text: 'Click "Submit & Next Lead" — the lead is saved and you move to the next one' },
                          { n: 9, text: 'Repeat steps 1–8 for every call during your session' },
                        ].map(s => (
                          <div key={s.n} style={{
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                            padding: '12px 14px', borderRadius: 12,
                            background: isDark ? '#0b1622' : '#f0f9ff',
                            border: `1.5px solid ${isDark ? '#1e3a52' : '#bae6fd'}`,
                          }}>
                            <span style={{
                              minWidth: 28, height: 28, borderRadius: '50%',
                              background: 'var(--navy)', color: 'white',
                              fontSize: 13, fontWeight: 900,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>{s.n}</span>
                            <p style={{ fontSize: 13, color: D.text, lineHeight: 1.55, fontWeight: s.bold ? 700 : 400 }}>{s.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── SECTION 2: Disposition Guide ── */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="fa-solid fa-clipboard-list" style={{ color: 'white', fontSize: 14 }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 900, color: D.text }}>WHAT TO LOG AFTER EACH CALL</p>
                          <p style={{ fontSize: 12, color: D.muted }}>Match your situation to the correct outcome below</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                        {[
                          { icon: 'fa-phone-slash',          situation: 'Nobody picked up',                        pick: 'No Answer',           color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
                          { icon: 'fa-voicemail',            situation: 'You left a voicemail',                    pick: 'Left Voicemail',      color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
                          { icon: 'fa-phone-xmark',          situation: 'They answered but hung up',               pick: 'Hung Up',             color: '#ea580c', bg: '#ffedd5', border: '#fdba74' },
                          { icon: 'fa-thumbs-down',          situation: 'They said no / not interested',           pick: 'Not Interested',      color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
                          { icon: 'fa-calendar-plus',        situation: 'They want a callback later',              pick: 'Follow Up / Call Back', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
                          { icon: 'fa-star',                 situation: 'They\'re thinking about it / curious',   pick: 'Interested',          color: '#059669', bg: '#d1fae5', border: '#6ee7b7' },
                          { icon: 'fa-triangle-exclamation', situation: 'Wrong number / wrong person',             pick: 'Wrong Number',        color: '#b45309', bg: '#fef9c3', border: '#fde68a' },
                          { icon: 'fa-circle-check',         situation: 'They bought OR agreed to buy',            pick: 'Converted / Ordered', color: '#065f46', bg: '#a7f3d0', border: '#059669', star: true },
                          { icon: 'fa-ban',                  situation: 'They said never call again',              pick: 'Do Not Call',         color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
                        ].map(d => (
                          <div key={d.pick} style={{
                            padding: '14px 16px', borderRadius: 12,
                            background: d.bg,
                            border: `2px solid ${d.star ? d.border : (isDark ? 'transparent' : d.border)}`,
                            position: 'relative',
                          }}>
                            {d.star && (
                              <span style={{ position: 'absolute', top: -8, right: 10, background: '#059669', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>
                                MOST IMPORTANT
                              </span>
                            )}
                            <i className={`fa-solid ${d.icon}`} style={{ color: d.color, fontSize: 16, marginBottom: 8, display: 'block' }} />
                            <p style={{ fontSize: 12, color: '#475569', marginBottom: 6, lineHeight: 1.4 }}>{d.situation}</p>
                            <p style={{ fontSize: 13, fontWeight: 800, color: d.color }}>→ Log as: {d.pick}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── SECTION 3: Rules ── */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="fa-solid fa-triangle-exclamation" style={{ color: 'white', fontSize: 14 }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 900, color: D.text }}>RULES — YOU MUST FOLLOW THESE</p>
                          <p style={{ fontSize: 12, color: D.muted }}>Breaking these rules means your calls and sales will NOT be counted</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                        {[
                          {
                            title: 'Always click "Claim & Call" first',
                            desc: 'Never dial a number without claiming the lead first. If you call without claiming, the system has no record of it and the call will not count toward your stats.',
                          },
                          {
                            title: 'Log every single call — no exceptions',
                            desc: 'Even if no one answered, even if it was a wrong number — you must log the outcome every time. A call with no log is a wasted call.',
                          },
                          {
                            title: 'Mark "Converted" the moment a customer buys',
                            desc: 'If a customer says they\'re buying or you know they already purchased — mark them "Converted / Ordered" immediately. This is how the system credits the sale to you.',
                          },
                          {
                            title: 'Write new contact info in the Notes',
                            desc: 'If a customer gives you a different phone number or email from what\'s in the system, type it in the Notes field. Sales are matched by email and phone — wrong info = lost credit.',
                          },
                          {
                            title: 'Don\'t skip leads without logging',
                            desc: 'If you skip, the lead stays uncalled and another agent might pick it up. If a number is invalid, log "Wrong Number." Only use the skip button if the lead info is completely unidentifiable.',
                          },
                          {
                            title: 'Accurate contact info = your sale gets counted',
                            desc: 'The system automatically links purchases to you by matching the customer\'s email or phone to your leads. Keep lead info correct and up to date.',
                          },
                        ].map((r, i) => (
                          <div key={i} style={{
                            display: 'flex', gap: 14, alignItems: 'flex-start',
                            padding: '16px 18px', borderRadius: 12,
                            background: isDark ? '#1a0f0f' : '#fff5f5',
                            border: `1.5px solid ${isDark ? '#3b1616' : '#fecaca'}`,
                          }}>
                            <span style={{
                              minWidth: 28, height: 28, borderRadius: '50%',
                              background: '#dc2626', color: 'white',
                              fontSize: 13, fontWeight: 900, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{i + 1}</span>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>{r.title}</p>
                              <p style={{ fontSize: 12, color: D.text, lineHeight: 1.6 }}>{r.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {poolLoading ? (
            <div style={{ background: 'var(--white)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--text-light)', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 22 }} />
            </div>
          ) : isInCall ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'var(--navy)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(9,52,89,0.15)' }}>
              <div style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', background: '#4ade80', display: 'inline-block',
                    animation: callStatus === 'calling' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {callStatus === 'calling' ? 'Call in progress' : 'Call ended — log outcome'}
                  </span>
                </div>
                <p style={{ fontSize: 24, fontWeight: 900, color: 'white', marginBottom: 4 }}>{claimedLead!.customer_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--teal-light)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                    {claimedLead!.customer_phone}
                  </p>
                  <button
                    onClick={() => copyPoolPhone(claimedLead!.customer_phone)}
                    style={{
                      background: poolPhoneCopied ? '#059669' : 'rgba(255,255,255,0.12)', color: 'white', border: 'none',
                      padding: '6px 12px', borderRadius: 50, fontWeight: 700, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                    <i className={`fa-solid ${poolPhoneCopied ? 'fa-check' : 'fa-copy'}`} />
                    {poolPhoneCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {popupBlocked && (
                  <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, fontSize: 13, color: '#9a3412', marginBottom: 14 }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                    Popup blocked.{' '}
                    <a href="https://www.helloairdial.com/" target="_blank" rel="noreferrer" style={{ color: '#9a3412', fontWeight: 700 }}>
                      Open HelloAirDial manually
                    </a>
                  </div>
                )}
                <button
                  onClick={() => { stopPolling(); setCallStatus('ended'); setShowDisposition(true) }}
                  style={{
                    width: '100%', background: '#4dd9b8', color: 'var(--navy)', border: 'none',
                    padding: '13px 24px', borderRadius: 50, fontWeight: 800, fontSize: 15,
                    cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  <i className="fa-solid fa-clipboard-list" />
                  Done Calling — Log Outcome
                </button>
              </div>
            </motion.div>
          ) : currentPoolLead ? (
            <motion.div key={currentPoolLead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'var(--navy)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(9,52,89,0.12)' }}>
              <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Next available lead
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 4 }}>{currentPoolLead.customer_name}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--teal-light)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                    {currentPoolLead.customer_phone}
                  </p>
                  {currentPoolLead.product_interest && (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
                      <i className="fa-solid fa-tag" style={{ marginRight: 6 }} />{currentPoolLead.product_interest}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button
                    onClick={() => copyPoolPhone(currentPoolLead.customer_phone)}
                    style={{
                      background: poolPhoneCopied ? '#059669' : 'rgba(255,255,255,0.12)', color: 'white', border: 'none',
                      padding: '14px 18px', borderRadius: 50, fontWeight: 700, fontSize: 14,
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    <i className={`fa-solid ${poolPhoneCopied ? 'fa-check' : 'fa-copy'}`} />
                    {poolPhoneCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleClaimAndCall}
                    disabled={claiming}
                    style={{
                      background: claiming ? '#94a3b8' : '#4dd9b8',
                      color: claiming ? 'white' : 'var(--navy)',
                      border: 'none', padding: '14px 24px', borderRadius: 50,
                      fontWeight: 800, fontSize: 15, cursor: claiming ? 'default' : 'pointer',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      whiteSpace: 'nowrap',
                    }}>
                    {claiming
                      ? <><i className="fa-solid fa-spinner fa-spin" /> Claiming…</>
                      : <><i className="fa-solid fa-phone" /> Claim &amp; Call</>}
                  </button>
                  <button
                    onClick={skipPoolLead}
                    title="Skip this lead"
                    style={{
                      background: 'rgba(255,255,255,0.12)', color: 'white', border: 'none',
                      padding: '14px 18px', borderRadius: 50, fontWeight: 700, fontSize: 14,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <i className="fa-solid fa-forward" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div style={{ background: 'var(--white)', borderRadius: 16, padding: '32px 28px', textAlign: 'center', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
              <i className="fa-solid fa-phone-slash" style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 10, display: 'block' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)', marginBottom: 4 }}>No leads available in the pool</p>
              <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>All leads have been claimed. Check back soon or refresh.</p>
            </div>
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
            style={{ flex: 1, minWidth: 200, border: '2px solid var(--gray)', borderRadius: 50, padding: '10px 18px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: D.inputBg, color: D.text }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ border: '2px solid var(--gray)', borderRadius: 50, padding: '10px 18px', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', background: D.inputBg, color: D.text }}>
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
              No leads found yet — claim one above to get started
            </div>
          ) : filtered.map(lead => (
            <motion.div key={lead.id} layout whileHover={{ background: 'var(--off-white)' }}
              onClick={() => { setSelected(lead); setNoteText(lead.notes ?? ''); setFollowUpDate(lead.follow_up_date ?? ''); setEditEmail(lead.customer_email ?? ''); setEditPhone(lead.customer_phone ?? '') }}
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
              style={{ position: 'fixed', top: 0, right: 0, width: 420, maxWidth: '100vw', height: '100%', background: D.card, zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)' }}>
              <div style={{ padding: '20px 24px 20px', borderBottom: `1px solid ${D.border}`, background: 'var(--navy)', color: 'white' }}>
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

              <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: D.drawerBg }}>

                {/* Status */}
                <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    <i className="fa-solid fa-circle-dot" style={{ marginRight: 6, color: 'var(--teal)' }} />
                    Update Status
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(STATUS_COLORS).map(([k, v]) => (
                      <button key={k} disabled={updating}
                        onClick={() => updateLead(selected.id, { status: k as Lead['status'] })}
                        style={{
                          padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          border: selected.status === k ? `2px solid ${v.text}` : `2px solid ${D.border}`,
                          background: selected.status === k ? v.bg : D.btnBg,
                          color: selected.status === k ? v.text : D.text,
                        }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Info — editable so attribution stays accurate */}
                <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1.5px solid #fde68a' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    <i className="fa-solid fa-address-card" style={{ marginRight: 6, color: '#d97706' }} />
                    Contact Info
                  </p>
                  <p style={{ fontSize: 11, color: '#b45309', marginBottom: 10 }}>
                    Update if customer gives you a different phone or email — this is how your sale gets credited to you.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: D.muted, marginBottom: 4 }}>Phone</p>
                      <input
                        value={editPhone} onChange={e => setEditPhone(e.target.value)}
                        placeholder="Customer phone number"
                        style={{ width: '100%', border: `2px solid ${D.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: D.inputBg, color: D.text, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: D.muted, marginBottom: 4 }}>Email</p>
                      <input
                        value={editEmail} onChange={e => setEditEmail(e.target.value)}
                        placeholder="Customer email address"
                        style={{ width: '100%', border: `2px solid ${D.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: D.inputBg, color: D.text, boxSizing: 'border-box' }}
                      />
                    </div>
                    <button
                      onClick={() => updateLead(selected.id, { customer_phone: editPhone || selected.customer_phone, customer_email: editEmail || undefined })}
                      disabled={updating}
                      style={{ background: '#d97706', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
                      <i className="fa-solid fa-floppy-disk" />
                      {updating ? 'Saving…' : 'Save Contact Info'}
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    <i className="fa-solid fa-note-sticky" style={{ marginRight: 6, color: 'var(--teal)' }} />
                    Notes
                  </p>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                    placeholder="Add call notes here…"
                    style={{
                      width: '100%', border: `2px solid ${D.border}`, borderRadius: 10, padding: '10px 12px',
                      fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical',
                      minHeight: 100, color: D.text, background: D.inputBg, lineHeight: 1.5,
                      boxSizing: 'border-box',
                    }} />
                  <button onClick={() => updateLead(selected.id, { notes: noteText })} disabled={updating}
                    style={{
                      marginTop: 10, background: 'var(--navy)', color: 'white', border: 'none',
                      padding: '10px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    <i className="fa-solid fa-floppy-disk" />
                    {updating ? 'Saving…' : 'Save Notes'}
                  </button>
                </div>

                {/* Follow-up date */}
                <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    <i className="fa-solid fa-calendar-days" style={{ marginRight: 6, color: '#7c3aed' }} />
                    Follow-up Date
                  </p>
                  <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                    style={{
                      width: '100%', border: `2px solid ${D.border}`, borderRadius: 10,
                      padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      color: D.text, background: D.inputBg, boxSizing: 'border-box',
                    }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => updateLead(selected.id, { follow_up_date: followUpDate || null })} disabled={updating}
                      style={{
                        background: '#7c3aed', color: 'white', border: 'none',
                        padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                      <i className="fa-solid fa-calendar-check" />
                      Save Date
                    </button>
                    {followUpDate && (
                      <button disabled={updating}
                        onClick={() => { setFollowUpDate(''); updateLead(selected.id, { follow_up_date: null }) }}
                        style={{
                          background: D.btnBg, color: D.text, border: `2px solid ${D.border}`,
                          padding: '10px 16px', borderRadius: 50, fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Product interest */}
                {selected.product_interest && (
                  <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      <i className="fa-solid fa-tag" style={{ marginRight: 6, color: 'var(--gold)' }} />
                      Product Interest
                    </p>
                    <p style={{ fontSize: 14, color: D.text, fontWeight: 600 }}>{selected.product_interest}</p>
                  </div>
                )}

                <p style={{ fontSize: 12, color: D.muted, padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-clock" />
                  Added {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Disposition modal (from Call Next Lead flow) */}
      <AnimatePresence>
        {showDisposition && claimedLead && (
          <DispositionModal
            lead={claimedLead}
            onSubmit={handlePoolDisposition}
            onClose={() => setShowDisposition(false)}
            submitting={dispSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--navy)', color: 'white', padding: '12px 24px', borderRadius: 50,
              fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
            }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
