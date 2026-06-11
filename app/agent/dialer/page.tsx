'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/context/AuthContext'
import { getBrowserSupabase } from '@/lib/supabase-browser'

interface DialerLead {
  id: string
  customer_name: string
  customer_phone: string
  product_interest: string | null
  status: string
}

const DISPOSITIONS = [
  { value: 'interested',     label: 'Interested',            icon: 'fa-star',                color: '#059669', bg: '#d1fae5' },
  { value: 'follow_up',      label: 'Follow Up / Call Back', icon: 'fa-calendar-plus',       color: '#0369a1', bg: '#e0f2fe' },
  { value: 'voicemail',      label: 'Left Voicemail',        icon: 'fa-voicemail',           color: '#7c3aed', bg: '#ede9fe' },
  { value: 'no_answer',      label: 'No Answer',             icon: 'fa-phone-slash',         color: '#d97706', bg: '#fef3c7' },
  { value: 'hung_up',        label: 'Hung Up',               icon: 'fa-phone-xmark',         color: '#ea580c', bg: '#ffedd5' },
  { value: 'not_interested', label: 'Not Interested',        icon: 'fa-thumbs-down',         color: '#64748b', bg: '#f1f5f9' },
  { value: 'wrong_number',   label: 'Wrong Number',          icon: 'fa-triangle-exclamation',color: '#b45309', bg: '#fef9c3' },
  { value: 'converted',      label: 'Converted / Ordered',   icon: 'fa-circle-check',        color: '#065f46', bg: '#a7f3d0' },
  { value: 'do_not_call',    label: 'Do Not Call',           icon: 'fa-ban',                 color: '#991b1b', bg: '#fee2e2' },
]

export default function AgentDialerPage() {
  return (
    <AuthGuard agentOnly>
      <DialerContent />
    </AuthGuard>
  )
}

function DispositionModal({ lead, onSubmit, onClose, submitting }: {
  lead: DialerLead
  onSubmit: (disposition: string, notes: string) => void
  onClose: () => void
  submitting: boolean
}) {
  const [selected, setSelected] = useState('')
  const [notes, setNotes] = useState('')

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
          background: 'white', borderRadius: 20, padding: '32px 28px',
          width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--heading)' }}>
            <i className="fa-solid fa-clipboard-list" style={{ marginRight: 8, color: 'var(--teal)' }} />
            Log Call Outcome
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 22 }}>
          {lead.customer_name} — {lead.customer_phone}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {DISPOSITIONS.map(d => (
            <button key={d.value} onClick={() => setSelected(d.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit', transition: 'all 0.15s',
                border: selected === d.value ? `2px solid ${d.color}` : '2px solid transparent',
                background: selected === d.value ? d.bg : '#f8fafc',
                color: selected === d.value ? d.color : '#475569',
              }}>
              <i className={`fa-solid ${d.icon}`} style={{ fontSize: 13, color: selected === d.value ? d.color : '#94a3b8' }} />
              {d.label}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Notes (optional)..."
          value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
            border: '2px solid var(--gray)', outline: 'none', resize: 'vertical',
            background: 'var(--off-white)', color: 'var(--text-dark)', fontFamily: 'inherit',
            marginBottom: 18, boxSizing: 'border-box',
          }} />
        <button
          disabled={!selected || submitting}
          onClick={() => selected && onSubmit(selected, notes)}
          style={{
            width: '100%', padding: 14, borderRadius: 50, border: 'none',
            background: selected ? 'var(--navy)' : '#e2e8f0',
            color: selected ? 'white' : '#94a3b8',
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

function DialerContent() {
  const { session } = useAuth()
  const supabase = getBrowserSupabase()
  const [queue, setQueue] = useState<DialerLead[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimedLead, setClaimedLead] = useState<DialerLead | null>(null)
  const [showDisposition, setShowDisposition] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ended'>('idle')
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [toast, setToast] = useState('')
  const [called, setCalled] = useState(0)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialerWindowRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const authHeaders = useCallback((): HeadersInit => ({
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
    'Content-Type': 'application/json',
  }), [session])

  async function loadQueue() {
    setLoading(true)
    try {
      const res = await fetch('/api/agent/dialer/queue', { headers: authHeaders() })
      const data = await res.json()
      setQueue(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQueue() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: remove leads claimed by any agent
  useEffect(() => {
    const channel = supabase
      .channel('agent-dialer-pool')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          const updated = payload.new as { id: string; claimed_by: string | null }
          if (updated.claimed_by) {
            setQueue(prev => prev.filter(l => l.id !== updated.id))
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

  const currentLead = queue[0] ?? null

  function skipLead() {
    setQueue(prev => prev.slice(1))
  }

  async function handleClaimAndCall() {
    if (!currentLead) return
    setClaiming(true)
    try {
      const res = await fetch('/api/agent/dialer/claim', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ lead_id: currentLead.id }),
      })

      if (res.status === 409) {
        showToast('Lead just taken by another agent — skipping')
        setQueue(prev => prev.slice(1))
        return
      }
      if (!res.ok) {
        showToast('Failed to claim — try again')
        return
      }

      // Claimed successfully
      const claimed = { ...currentLead }
      setClaimedLead(claimed)
      setQueue(prev => prev.slice(1))

      // Copy phone + open HelloAirDial
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

  async function handleDisposition(disposition: string, notes: string) {
    if (!claimedLead) return
    setSubmitting(true)
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
      setCalled(c => c + 1)
      showToast('Call logged — next lead ready')
    } finally {
      setSubmitting(false)
    }
  }

  const isInCall = claimedLead !== null && callStatus !== 'idle'

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.5)} }`}</style>

      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/agent" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fa-solid fa-arrow-left" /> Back
          </a>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>|</span>
          <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 900, color: 'white' }}>
            Maga <span style={{ color: 'var(--teal-light)' }}>Offers</span>
            <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--teal)', padding: '2px 10px', borderRadius: 20, marginLeft: 10, verticalAlign: 'middle' }}>
              Dialer
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-users" style={{ marginRight: 5, color: 'var(--teal-light)' }} />
            {queue.length} in pool
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-check" style={{ marginRight: 5, color: '#4ade80' }} />
            {called} called
          </span>
          <button onClick={loadQueue} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', borderRadius: 50, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            <i className="fa-solid fa-rotate" style={{ marginRight: 5 }} />Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-light)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, marginBottom: 16, display: 'block' }} />
            Loading queue…
          </div>

        ) : isInCall ? (
          // Active call card
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(9,52,89,0.15)' }}>
            <div style={{ background: 'var(--navy)', padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', background: '#4ade80', display: 'inline-block',
                  animation: callStatus === 'calling' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {callStatus === 'calling' ? 'Call in progress' : 'Call ended — log outcome'}
                </span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 900, color: 'white', marginBottom: 6 }}>{claimedLead!.customer_name}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--teal-light)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                {claimedLead!.customer_phone}
              </p>
              {claimedLead!.product_interest && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
                  <i className="fa-solid fa-tag" style={{ marginRight: 6 }} />{claimedLead!.product_interest}
                </p>
              )}
            </div>
            <div style={{ padding: '24px 32px' }}>
              {popupBlocked && (
                <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, fontSize: 13, color: '#9a3412', marginBottom: 16 }}>
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
                  width: '100%', background: 'var(--navy)', color: 'white', border: 'none',
                  padding: '14px 24px', borderRadius: 50, fontWeight: 700, fontSize: 15,
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <i className="fa-solid fa-clipboard-list" />
                Done Calling — Log Outcome
              </button>
            </div>
          </motion.div>

        ) : currentLead ? (
          // Next lead card
          <motion.div key={currentLead.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(9,52,89,0.12)' }}>
            <div style={{ background: 'var(--navy)', padding: '28px 32px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
                Next Lead
              </p>
              <p style={{ fontSize: 30, fontWeight: 900, color: 'white', marginBottom: 6 }}>{currentLead.customer_name}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--teal-light)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                {currentLead.customer_phone}
              </p>
              {currentLead.product_interest && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
                  <i className="fa-solid fa-tag" style={{ marginRight: 6 }} />{currentLead.product_interest}
                </p>
              )}
            </div>
            <div style={{ padding: '24px 32px', display: 'flex', gap: 12 }}>
              <button
                onClick={handleClaimAndCall}
                disabled={claiming}
                style={{
                  flex: 1, background: claiming ? '#94a3b8' : '#4dd9b8',
                  color: claiming ? 'white' : 'var(--navy)',
                  border: 'none', padding: '16px 24px', borderRadius: 50,
                  fontWeight: 800, fontSize: 16, cursor: claiming ? 'default' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'background 0.2s',
                }}>
                {claiming
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Claiming…</>
                  : <><i className="fa-solid fa-phone" /> Claim &amp; Call</>}
              </button>
              <button
                onClick={skipLead}
                title="Skip this lead"
                style={{
                  background: 'var(--gray)', color: 'var(--text-mid)', border: 'none',
                  padding: '16px 20px', borderRadius: 50, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <i className="fa-solid fa-forward" />
              </button>
            </div>
          </motion.div>

        ) : (
          // Empty state
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <i className="fa-solid fa-phone-slash" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 20, display: 'block' }} />
            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--heading)', marginBottom: 8 }}>No leads available</p>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 24 }}>
              All leads have been claimed or the queue is empty.
            </p>
            <button onClick={loadQueue}
              style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              <i className="fa-solid fa-rotate" style={{ marginRight: 8 }} />Refresh Queue
            </button>
          </div>
        )}

        {/* Upcoming queue preview (next 3) */}
        {!loading && !isInCall && queue.length > 1 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Up next
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queue.slice(1, 4).map(lead => (
                <div key={lead.id} style={{
                  background: 'white', borderRadius: 12, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14, opacity: 0.6,
                  boxShadow: '0 2px 8px rgba(9,52,89,0.06)',
                }}>
                  <i className="fa-solid fa-user-circle" style={{ fontSize: 22, color: '#cbd5e1' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>{lead.customer_name}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: 'monospace' }}>{lead.customer_phone}</p>
                  </div>
                  {lead.product_interest && (
                    <span style={{ fontSize: 11, color: 'var(--text-light)', fontStyle: 'italic' }}>{lead.product_interest}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disposition modal */}
      <AnimatePresence>
        {showDisposition && claimedLead && (
          <DispositionModal
            lead={claimedLead}
            onSubmit={handleDisposition}
            onClose={() => setShowDisposition(false)}
            submitting={submitting}
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
