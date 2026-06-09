'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/context/AuthContext'

interface Lead {
  id: string
  customer_name: string
  customer_phone: string
  product_interest: string | null
  lineitem_price: number | null
  billing_address: string | null
  billing_city: string | null
  billing_zip: string | null
  billing_province: string | null
  billing_country: string | null
  tagging: string | null
  assigned_agent_name: string | null
  disposition: string | null
  status: string
  call_count: number
  last_called_at: string | null
  notes: string | null
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

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function formatPhone(phone: string) {
  return phone.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4')
}

function DispositionModal({
  lead, agentName, onSubmit, onClose, submitting,
}: {
  lead: Lead
  agentName: string
  onSubmit: (disposition: string, notes: string) => void
  onClose: () => void
  submitting: boolean
}) {
  const [selected, setSelected] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, padding: 4 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 22 }}>
          {lead.customer_name} — {lead.customer_phone}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {DISPOSITIONS.map(d => (
            <button
              key={d.value}
              onClick={() => setSelected(d.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                transition: 'all 0.15s',
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
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
            border: '2px solid var(--gray)', outline: 'none', resize: 'vertical',
            background: 'var(--off-white)', color: 'var(--text-dark)', fontFamily: 'inherit',
            marginBottom: 18, boxSizing: 'border-box',
          }}
        />

        <button
          disabled={!selected || submitting}
          onClick={() => selected && onSubmit(selected, notes)}
          style={{
            width: '100%', padding: '14px', borderRadius: 50, border: 'none',
            background: selected ? 'var(--navy)' : '#e2e8f0',
            color: selected ? 'white' : '#94a3b8',
            fontWeight: 700, fontSize: 15, cursor: selected ? 'pointer' : 'default',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.2s',
          }}>
          {submitting
            ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</>
            : <><i className="fa-solid fa-arrow-right" /> Submit & Next Lead</>
          }
        </button>
      </motion.div>
    </div>
  )
}

function ImportModal({
  authHeaders, onClose, onImported,
}: {
  authHeaders: HeadersInit
  onClose: () => void
  onImported: (count: number) => void
}) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    if (!content.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/leads/import', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content, delimiter: '\t' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      onImported(data.imported)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'white', borderRadius: 20, padding: '32px 28px',
          width: '100%', maxWidth: 580, boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--heading)' }}>
            <i className="fa-solid fa-file-import" style={{ marginRight: 8, color: 'var(--teal)' }} />
            Import Leads
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, padding: 4 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 16, lineHeight: 1.6 }}>
          Copy your spreadsheet data (including the header row) and paste it below.
          Expected columns: <strong>Agent Name, Tagging, Billing Phone, Shipping Name, Shipping Street, Lineitem name, Lineitem price, Billing Address1, Billing City, Billing Zip, Billing Province, Billing Country</strong>
        </p>

        <textarea
          placeholder="Paste tab-separated data here (copy directly from spreadsheet)..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={10}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 13,
            border: '2px solid var(--gray)', outline: 'none', resize: 'vertical',
            background: 'var(--off-white)', color: 'var(--text-dark)', fontFamily: 'monospace',
            marginBottom: 16, boxSizing: 'border-box',
          }}
        />

        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fff0f0', border: '1.5px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />{error}
          </div>
        )}

        <button
          disabled={!content.trim() || loading}
          onClick={handleImport}
          style={{
            width: '100%', padding: '14px', borderRadius: 50, border: 'none',
            background: content.trim() ? 'var(--navy)' : '#e2e8f0',
            color: content.trim() ? 'white' : '#94a3b8',
            fontWeight: 700, fontSize: 15, cursor: content.trim() ? 'pointer' : 'default',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {loading
            ? <><i className="fa-solid fa-spinner fa-spin" /> Importing…</>
            : <><i className="fa-solid fa-upload" /> Import Leads</>
          }
        </button>
      </motion.div>
    </div>
  )
}

function DialerContent() {
  const { session } = useAuth()
  const [queue, setQueue] = useState<Lead[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showDisposition, setShowDisposition] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [agentName, setAgentName] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('dialer_agent_name') ?? '' : ''
  )
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const authHeaders = useCallback((): HeadersInit => ({
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
    'Content-Type': 'application/json',
  }), [session])

  async function loadQueue() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dialer/queue', { headers: authHeaders() })
      const data = await res.json()
      setQueue(Array.isArray(data) ? data : [])
      setCurrentIdx(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQueue() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string) {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 2500)
  }

  function handleCopyPhone(phone: string) {
    copyToClipboard(phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function handleDisposition(disposition: string, notes: string) {
    if (!currentLead) return
    setSubmitting(true)
    try {
      await fetch('/api/admin/dialer/disposition', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          lead_id: currentLead.id,
          disposition,
          agent_name: agentName || null,
          notes: notes || null,
        }),
      })
      setShowDisposition(false)
      setCurrentIdx(i => i + 1)
      showToast('Disposition saved — next lead loaded')
    } finally {
      setSubmitting(false)
    }
  }

  function handleAgentNameChange(name: string) {
    setAgentName(name)
    localStorage.setItem('dialer_agent_name', name)
  }

  const currentLead = queue[currentIdx] ?? null
  const remaining = Math.max(0, queue.length - currentIdx)
  const completed = currentIdx

  const fullAddress = currentLead ? [
    currentLead.billing_address,
    currentLead.billing_city,
    currentLead.billing_province,
    currentLead.billing_zip,
    currentLead.billing_country,
  ].filter(Boolean).join(', ') : ''

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '0' }}>

      {/* Header */}
      <div style={{
        background: 'var(--navy)', color: 'white',
        padding: '16px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <i className="fa-solid fa-headset" style={{ fontSize: 22, opacity: 0.8 }} />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Agent Dialer</h1>
            <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
              {loading ? 'Loading queue…' : `${remaining} leads remaining · ${completed} called`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            value={agentName}
            onChange={e => handleAgentNameChange(e.target.value)}
            placeholder="Your name (agent)"
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: 13,
              fontFamily: 'inherit', outline: 'none', width: 180,
            }}
          />
          <button
            onClick={() => setShowImport(true)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <i className="fa-solid fa-file-import" /> Import
          </button>
          <button
            onClick={loadQueue}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <i className="fa-solid fa-rotate-right" />
          </button>
          <a
            href="/admin"
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <i className="fa-solid fa-arrow-left" /> Admin
          </a>
        </div>
      </div>

      {/* Progress bar */}
      {queue.length > 0 && (
        <div style={{ height: 4, background: '#dde3ec' }}>
          <div style={{
            height: '100%', background: 'var(--teal)',
            width: `${Math.min(100, (completed / queue.length) * 100)}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 36, color: 'var(--teal)' }} />
            <p style={{ marginTop: 16, color: 'var(--text-mid)', fontWeight: 600 }}>Loading lead queue…</p>
          </div>
        ) : queue.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16, display: 'block' }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--heading)', marginBottom: 8 }}>No leads in queue</h2>
            <p style={{ color: 'var(--text-mid)', marginBottom: 24 }}>Import leads to get started.</p>
            <button
              onClick={() => setShowImport(true)}
              style={{
                padding: '14px 28px', borderRadius: 50, background: 'var(--navy)', color: 'white',
                border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <i className="fa-solid fa-file-import" style={{ marginRight: 8 }} />
              Import Leads
            </button>
          </div>
        ) : currentLead === null ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: 64, color: '#059669', marginBottom: 16, display: 'block' }} />
            </motion.div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--heading)', marginBottom: 8 }}>All leads called!</h2>
            <p style={{ color: 'var(--text-mid)', marginBottom: 24 }}>{completed} calls logged in this session.</p>
            <button
              onClick={loadQueue}
              style={{
                padding: '14px 28px', borderRadius: 50, background: 'var(--teal)', color: 'white',
                border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <i className="fa-solid fa-rotate-right" style={{ marginRight: 8 }} />
              Refresh Queue
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentLead.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>

              {/* Lead card */}
              <div style={{
                background: 'white', borderRadius: 20, overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(9,52,89,0.10)',
              }}>

                {/* Card top stripe */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--navy) 0%, #0e6499 100%)',
                  padding: '20px 28px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12,
                }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Lead {currentIdx + 1} of {queue.length}
                    </p>
                    <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0 }}>
                      {currentLead.customer_name || '(No name)'}
                    </h2>
                    {currentLead.assigned_agent_name && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                        Assigned to: {currentLead.assigned_agent_name}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {currentLead.call_count > 0 && (
                      <span style={{
                        background: 'rgba(255,255,255,0.15)', color: 'white',
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      }}>
                        <i className="fa-solid fa-phone" style={{ marginRight: 5 }} />
                        Called {currentLead.call_count}×
                      </span>
                    )}
                    {currentLead.disposition && (
                      <span style={{
                        background: 'rgba(255,255,255,0.15)', color: 'white',
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      }}>
                        Last: {currentLead.disposition.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '24px 28px' }}>

                  {/* Phone number — the most important element */}
                  <div style={{
                    background: '#f0f9ff', borderRadius: 14, padding: '16px 20px',
                    marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: '2px solid #bae6fd', flexWrap: 'wrap', gap: 10,
                  }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                        Phone Number
                      </p>
                      <p style={{ fontSize: 28, fontWeight: 900, color: '#0c4a6e', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        {currentLead.customer_phone}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleCopyPhone(currentLead.customer_phone)}
                        style={{
                          padding: '10px 18px', borderRadius: 10, border: 'none',
                          background: copied ? '#059669' : '#0369a1', color: 'white',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s',
                        }}>
                        <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <a
                        href="https://www.helloairdial.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '10px 18px', borderRadius: 10, border: 'none',
                          background: 'var(--teal)', color: 'white',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
                        }}>
                        <i className="fa-solid fa-phone" />
                        Open HelloAirDial
                      </a>
                    </div>
                  </div>

                  {/* Lead details grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

                    {currentLead.product_interest && (
                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', gridColumn: '1 / -1' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Product</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)' }}>
                          {currentLead.product_interest}
                          {currentLead.lineitem_price != null && (
                            <span style={{ marginLeft: 10, fontSize: 16, color: '#059669', fontFamily: 'var(--font-playfair)' }}>
                              ${Number(currentLead.lineitem_price).toFixed(2)}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {fullAddress && (
                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', gridColumn: '1 / -1' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Address</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>{fullAddress}</p>
                      </div>
                    )}

                    {currentLead.tagging && (
                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Tag</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>{currentLead.tagging}</p>
                      </div>
                    )}

                    {currentLead.notes && (
                      <div style={{ background: '#fffbeb', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #fde68a' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Notes</p>
                        <p style={{ fontSize: 14, color: '#78350f' }}>{currentLead.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setShowDisposition(true)}
                      style={{
                        flex: 1, padding: '16px', borderRadius: 50, border: 'none',
                        background: 'var(--navy)', color: 'white',
                        fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}>
                      <i className="fa-solid fa-clipboard-list" />
                      Log This Call
                    </button>
                    <button
                      onClick={() => setCurrentIdx(i => i + 1)}
                      title="Skip to next lead"
                      style={{
                        padding: '16px 20px', borderRadius: 50, border: '2px solid var(--gray)',
                        background: 'white', color: 'var(--text-mid)',
                        fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                      <i className="fa-solid fa-forward-step" /> Skip
                    </button>
                  </div>

                </div>
              </div>

              {/* Upcoming leads preview */}
              {queue.slice(currentIdx + 1, currentIdx + 4).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    Up Next
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {queue.slice(currentIdx + 1, currentIdx + 4).map((lead, i) => (
                      <div key={lead.id} style={{
                        background: 'white', borderRadius: 12, padding: '12px 16px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        opacity: 0.7, boxShadow: '0 2px 8px rgba(9,52,89,0.06)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: 'var(--text-mid)',
                          }}>{i + 2}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--heading)' }}>{lead.customer_name || '(No name)'}</span>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: 'monospace' }}>{lead.customer_phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: '#1e293b', color: 'white', padding: '12px 24px',
              borderRadius: 50, fontSize: 14, fontWeight: 700, zIndex: 999,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
            }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: 8, color: '#4ade80' }} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showDisposition && currentLead && (
          <DispositionModal
            lead={currentLead}
            agentName={agentName}
            onSubmit={handleDisposition}
            onClose={() => setShowDisposition(false)}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImport && (
          <ImportModal
            authHeaders={authHeaders()}
            onClose={() => setShowImport(false)}
            onImported={(count) => {
              setShowImport(false)
              showToast(`${count} leads imported successfully`)
              loadQueue()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DialerPage() {
  return (
    <AuthGuard adminOnly>
      <DialerContent />
    </AuthGuard>
  )
}
