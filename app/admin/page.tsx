
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import AuthGuard from '@/components/AuthGuard'
import { Product, Order, Profile, AgentProfile, AnalyticsData, CustomerTierRow, Lead } from '@/lib/types'
import { SiteConfig, DEFAULT_CONFIG } from '@/lib/site-config'
import { SiteWireConfig, DEFAULT_WIRE_CONFIG, normalizeWireConfig } from '@/lib/wire-config'
import { SitePayLinkConfig, DEFAULT_PAY_LINK_CONFIG, normalizePayLinkConfig, isSafePayLinkUrl } from '@/lib/pay-link'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { SupportConversationRow, SupportMessage } from '@/lib/support'

// Support-tab unlock token. sessionStorage, so closing the browser re-locks it.
const SUPPORT_TOKEN_KEY = 'krsellify_support_token'
function readSupportToken(): string | null {
  try { return sessionStorage.getItem(SUPPORT_TOKEN_KEY) } catch { return null }
}

const AdminCharts   = dynamic(() => import('@/components/AdminCharts'),  { ssr: false })
const LandingEditor = dynamic(() => import('@/components/LandingEditor'), { ssr: false })
const RFSTab        = dynamic(() => import('./rfs-tab'),                  { ssr: false })

export default function AdminPage() {
  return (
    <AuthGuard adminOnly>
      <AdminContent />
    </AuthGuard>
  )
} 

type Tab = 'overview' | 'products' | 'orders' | 'customers' | 'agents' | 'sales' | 'agent-performance' | 'landing' | 'leads' | 'coupons' | 'settings' | 'rfs' | 'support'

const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  bronze:   { bg: '#fef3c7', text: '#92400e' },
  silver:   { bg: '#f3f4f6', text: '#374151' },
  gold:     { bg: '#fef9c3', text: '#854d0e' },
  platinum: { bg: '#dbeafe', text: '#1e40af' },
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

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-mid)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8,
}

function StatCard({ label, value, icon, color, delay = 0 }: { label: string; value: string | number; icon: string; color: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      style={{ background: 'var(--white)', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--heading)', marginTop: 4 }}>{value}</p>
        </div>
        <i className={`fa-solid ${icon}`} style={{ fontSize: 22, color, opacity: 0.6 }} />
      </div>
    </motion.div>
  )
}

// ── Dialer (merged into Leads tab) ──

const DIALER_STATUSES = ['new', 'assigned', 'attempted', 'follow_up', 'interested']

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
  { value: 'status_updated', label: 'Status Updated',        icon: 'fa-pen-to-square',        color: '#64748b', bg: '#f1f5f9' },
]

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
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.muted, fontSize: 18, padding: 4 }}>
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
            width: '100%', padding: '14px', borderRadius: 50, border: 'none',
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

function ImportModal({
  authHeaders, onClose, onImported,
}: {
  authHeaders: HeadersInit
  onClose: () => void
  onImported: (count: number) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ rows: number; delimiter: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { isDark } = useTheme()
  const M = {
    card:    isDark ? '#1a2e42' : '#ffffff',
    text:    isDark ? '#ecf5fc' : '#0d1f2d',
    muted:   isDark ? '#5e8faa' : '#64748b',
    inputBg: isDark ? '#0b1622' : '#f8fafc',
    border:  isDark ? '#273d52' : '#e2e8f0',
  }

  function isXlsxFile(f: File) { return /\.(xlsx|xls)$/i.test(f.name) }

  function detectDelimiter(text: string) {
    const firstLine = text.split('\n')[0] ?? ''
    return firstLine.includes('\t') ? '\t' : ','
  }

  async function handleFileChange(selected: File | null) {
    if (!selected) return
    setFile(selected)
    setError('')
    if (isXlsxFile(selected)) {
      try {
        const XLSX = await import('xlsx')
        const buffer = await selected.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = (XLSX.utils.sheet_to_json(ws) as unknown[]).length
        setPreview({ rows, delimiter: 'xlsx' })
      } catch { setPreview(null) }
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const delimiter = detectDelimiter(text)
        const rows = text.trim().split('\n').filter(l => l.trim()).length - 1
        setPreview({ rows: Math.max(0, rows), delimiter })
      }
      reader.readAsText(selected)
    }
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      let bodyStr: string
      if (isXlsxFile(file)) {
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        bodyStr = JSON.stringify({ rows })
      } else {
        const text = await file.text()
        const delimiter = detectDelimiter(text)
        bodyStr = JSON.stringify({ content: text, delimiter })
      }
      const res = await fetch('/api/admin/leads/import', {
        method: 'POST',
        headers: authHeaders,
        body: bodyStr,
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
          background: M.card, borderRadius: 20, padding: '32px 28px',
          width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: M.text }}>
            <i className="fa-solid fa-file-import" style={{ marginRight: 8, color: 'var(--teal)' }} />
            Import Leads
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.muted, fontSize: 18, padding: 4 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: M.muted, marginBottom: 20, lineHeight: 1.6 }}>
          Upload an <strong>.xlsx</strong>, <strong>.csv</strong>, or <strong>.tsv</strong> file. Existing leads (matched by phone) get their address updated without losing status or notes.
        </p>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            handleFileChange(e.dataTransfer.files[0] ?? null)
          }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--teal)' : file ? '#059669' : M.border}`,
            borderRadius: 14, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
            background: dragging ? '#f0fdf4' : file ? '#f0fdf4' : M.inputBg,
            transition: 'all 0.2s', marginBottom: 16,
          }}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            style={{ display: 'none' }}
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <i className={`fa-solid ${isXlsxFile(file) ? 'fa-file-excel' : 'fa-file-csv'}`} style={{ fontSize: 36, color: '#059669', marginBottom: 10, display: 'block' }} />
              <p style={{ fontWeight: 700, fontSize: 15, color: '#065f46', marginBottom: 4 }}>{file.name}</p>
              {preview && (
                <p style={{ fontSize: 13, color: '#059669' }}>
                  {preview.rows} lead{preview.rows !== 1 ? 's' : ''} detected · {preview.delimiter === 'xlsx' ? 'Excel file' : preview.delimiter === '\t' ? 'Tab-separated' : 'Comma-separated'}
                </p>
              )}
              <p style={{ fontSize: 12, color: M.muted, marginTop: 8 }}>Click to choose a different file</p>
            </>
          ) : (
            <>
              <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 36, color: M.muted, marginBottom: 10, display: 'block' }} />
              <p style={{ fontWeight: 700, fontSize: 15, color: M.text, marginBottom: 4 }}>
                Drop your file here or click to browse
              </p>
              <p style={{ fontSize: 13, color: M.muted }}>Supports .xlsx, .csv, and .tsv files</p>
            </>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fff0f0', border: '1.5px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />{error}
          </div>
        )}

        <button
          disabled={!file || loading}
          onClick={handleImport}
          style={{
            width: '100%', padding: '14px', borderRadius: 50, border: 'none',
            background: file ? 'var(--navy)' : M.border,
            color: file ? 'white' : M.muted,
            fontWeight: 700, fontSize: 15, cursor: file ? 'pointer' : 'default',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {loading
            ? <><i className="fa-solid fa-spinner fa-spin" /> Importing…</>
            : <><i className="fa-solid fa-upload" /> Import {preview && preview.rows > 0 ? `${preview.rows} Leads` : 'Leads'}</>
          }
        </button>
      </motion.div>
    </div>
  )
}

function AdminContent() {
  const { user, profile, session, signOut } = useAuth()
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
  const [tab, setTab]                 = useState<Tab>('overview')
  const [products, setProducts]       = useState<Product[]>([])
  const [orders, setOrders]           = useState<Order[]>([])
  const [customers, setCustomers]     = useState<{ email: string; order_count: number; total_spent: number; first_order: string; last_order: string }[]>([])
  const [agents, setAgents]           = useState<AgentProfile[]>([])
  const [analytics, setAnalytics]     = useState<AnalyticsData | null>(null)
  const [siteConfig, setSiteConfig]   = useState<SiteConfig>(DEFAULT_CONFIG)
  const [leads, setLeads]             = useState<(Lead & { agent_profiles?: { display_name: string } | null })[]>([])
  const [approvedAgents, setApprovedAgents] = useState<AgentProfile[]>([])
  const [loading, setLoading]         = useState(false)
  const [msg, setMsg]                 = useState('')
  const [realtimeAlert, setRealtimeAlert] = useState('')
  const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [vipPrice, setVipPrice]       = useState<number>(20)
  const [vipPriceInput, setVipPriceInput] = useState<string>('20')
  const [savingVipPrice, setSavingVipPrice] = useState(false)
  const [wireForm, setWireForm] = useState<SiteWireConfig>(DEFAULT_WIRE_CONFIG)
  const [savingWire, setSavingWire] = useState(false)
  const [payLinkForm, setPayLinkForm] = useState<SitePayLinkConfig>(DEFAULT_PAY_LINK_CONFIG)
  const [savingPayLink, setSavingPayLink] = useState(false)
  const [payLinkProducts, setPayLinkProducts] = useState<{ id: string; name: string; price: number }[]>([])

  // Support chat — locked behind its own sign-in on top of the admin session.
  // The token lives in sessionStorage so it's re-entered when the browser is
  // reopened, but survives moving between tabs in the dashboard.
  const [supportToken, setSupportToken]         = useState<string | null>(null)
  const [supportConfigured, setSupportConfigured] = useState(true)
  const [gateEmail, setGateEmail]               = useState('')
  const [gatePassword, setGatePassword]         = useState('')
  const [gateBusy, setGateBusy]                 = useState(false)
  const [testingNotify, setTestingNotify]       = useState(false)

  // Change password
  const [curPw, setCurPw]         = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwBusy, setPwBusy]       = useState(false)
  const [pwMsg, setPwMsg]         = useState<{ ok: boolean; text: string } | null>(null)
  const [gateError, setGateError]               = useState('')
  const [conversations, setConversations]       = useState<SupportConversationRow[]>([])
  const [activeChat, setActiveChat]             = useState<SupportConversationRow | null>(null)
  const [chatMessages, setChatMessages]         = useState<SupportMessage[]>([])
  const [replyDraft, setReplyDraft]             = useState('')
  const [sendingReply, setSendingReply]         = useState(false)

  // New lead form
  const [showNewLead, setShowNewLead]       = useState(false)
  const [newLeadName, setNewLeadName]       = useState('')
  const [newLeadPhone, setNewLeadPhone]     = useState('')
  const [newLeadProduct, setNewLeadProduct] = useState('')
  const [newLeadAgent, setNewLeadAgent]     = useState('')
  const [newLeadNotes, setNewLeadNotes]     = useState('')
  const [creatingLead, setCreatingLead]     = useState(false)

  // Coupons
  const [coupons, setCoupons]             = useState<{ id: string; code: string; discount_pct: number; min_spend: number; is_used: boolean }[]>([])
  const [newCouponCode, setNewCouponCode] = useState('')
  const [newCouponPct, setNewCouponPct]   = useState('')
  const [newCouponMin, setNewCouponMin]   = useState('')
  const [couponSaving, setCouponSaving]   = useState(false)

  // Order detail drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Lead detail drawer (admin side)
  const [selectedLead, setSelectedLead] = useState<(Lead & { agent_profiles?: { display_name: string } | null }) | null>(null)
  const [leadNoteText, setLeadNoteText]       = useState('')
  const [leadFollowUpDate, setLeadFollowUpDate] = useState('')
  const [updatingLead, setUpdatingLead]       = useState(false)
  const [callHistory, setCallHistory]         = useState<{ id: string; agent_name: string | null; disposition: string; notes: string | null; created_at: string }[]>([])
  const [callHistoryLoading, setCallHistoryLoading] = useState(false)
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all')
  const [leadAgentFilter,  setLeadAgentFilter]  = useState<string>('all')

  // Clear all leads
  const [clearingLeads, setClearingLeads] = useState(false)

  // Dialer (merged into Leads tab)
  const [dialerIdx, setDialerIdx]             = useState(0)
  const [dialerAgentName, setDialerAgentName] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('dialer_agent_name') ?? '' : ''
  )
  const [showImportLeads, setShowImportLeads] = useState(false)
  const [dialerCopied, setDialerCopied]       = useState(false)
  const [dialerCallStatus, setDialerCallStatus] = useState<'idle' | 'calling' | 'ended'>('idle')
  const [dialerPopupBlocked, setDialerPopupBlocked] = useState(false)
  const [showDialerDisposition, setShowDialerDisposition] = useState(false)
  const [dialerSubmitting, setDialerSubmitting] = useState(false)
  const dialerWindowRef = useRef<Window | null>(null)
  const dialerPollRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // Create agent
  const [showCreateAgent, setShowCreateAgent]     = useState(false)
  const [newAgentEmail, setNewAgentEmail]         = useState('')
  const [newAgentPassword, setNewAgentPassword]   = useState('')
  const [newAgentName, setNewAgentName]           = useState('')
  const [creatingAgent, setCreatingAgent]         = useState(false)
  const [createAgentMsg, setCreateAgentMsg]       = useState('')

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('')

  const authHeaders = useCallback((): HeadersInit => ({
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
    'Content-Type': 'application/json',
  }), [session])

  // Support routes need the tab's unlock token on top of the admin session.
  // Read from storage rather than state so callbacks can't close over a stale
  // token after an unlock.
  const supportHeaders = useCallback((): HeadersInit => ({
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
    'Content-Type': 'application/json',
    'x-support-token': readSupportToken() ?? '',
  }), [session])

  const load = useCallback(async (t: Tab, silent = false) => {
    if (!silent) setLoading(true)
    if (t === 'products') {
      const r = await fetch('/api/admin/products', { headers: authHeaders() })
      const d = await r.json(); setProducts(Array.isArray(d) ? d : [])
    } else if (t === 'orders') {
      const r = await fetch('/api/admin/orders', { headers: authHeaders() })
      const d = await r.json(); setOrders(Array.isArray(d) ? d : [])
    } else if (t === 'customers') {
      const r = await fetch('/api/admin/checkout-customers', { headers: authHeaders() })
      const d = await r.json(); setCustomers(Array.isArray(d) ? d : [])
    } else if (t === 'agents') {
      const r = await fetch('/api/admin/agents', { headers: authHeaders() })
      const d = await r.json(); setAgents(Array.isArray(d) ? d : [])
    } else if (t === 'sales' || t === 'agent-performance') {
      const r = await fetch('/api/admin/analytics', { headers: authHeaders() })
      setAnalytics(await r.json())
    } else if (t === 'leads') {
      const [lr, ar] = await Promise.all([
        fetch('/api/admin/leads',  { headers: authHeaders() }).then(r => r.json()),
        fetch('/api/admin/agents', { headers: authHeaders() }).then(r => r.json()),
      ])
      setLeads(Array.isArray(lr) ? lr : [])
      setApprovedAgents((Array.isArray(ar) ? ar as AgentProfile[] : []).filter(a => a.status === 'approved'))
    } else if (t === 'support') {
      // Locked until the tab's own sign-in has happened
      if (!readSupportToken()) { setConversations([]); if (!silent) setLoading(false); return }
      const r = await fetch('/api/admin/support', { headers: supportHeaders() })
      if (r.status === 403) {
        // Token expired or rejected — drop it so the lock screen comes back
        try { sessionStorage.removeItem(SUPPORT_TOKEN_KEY) } catch {}
        setSupportToken(null); setConversations([])
        if (!silent) setLoading(false)
        return
      }
      const d = await r.json(); setConversations(Array.isArray(d) ? d : [])
    } else if (t === 'coupons') {
      const r = await fetch('/api/admin/coupons', { headers: authHeaders() })
      const d = await r.json(); setCoupons(Array.isArray(d) ? d : [])
    } else if (t === 'landing') {
      const r = await fetch('/api/admin/site-config', { headers: authHeaders() })
      const rows: { key: string; value: unknown }[] = await r.json()
      const merged: SiteConfig = { ...DEFAULT_CONFIG }
      for (const row of rows) {
        if (row.key in merged) (merged as unknown as Record<string, unknown>)[row.key] = row.value
      }
      setSiteConfig(merged)
    } else if (t === 'settings') {
      const r = await fetch('/api/admin/site-config', { headers: authHeaders() })
      const rows: { key: string; value: unknown }[] = await r.json()
      const priceRow = rows.find(r => r.key === 'vip_price')
      const price = typeof priceRow?.value === 'number' ? priceRow.value : 20
      setVipPrice(price)
      setVipPriceInput(String(price))
      const wireRow = rows.find(r => r.key === 'wire_config')
      setWireForm(normalizeWireConfig(wireRow?.value))
      const payLinkRow = rows.find(r => r.key === 'pay_link')
      setPayLinkForm(normalizePayLinkConfig(payLinkRow?.value))
      // Product list for the pay-link picker (public route — no admin fields needed)
      try {
        const pub: { id: string; name: string; price: number }[] = await fetch('/api/products').then(r => r.json())
        if (Array.isArray(pub)) setPayLinkProducts(pub.map(p => ({ id: p.id, name: p.name, price: Number(p.price) })))
      } catch {}
    } else {
      const [p, o, c, a, an] = await Promise.all([
        fetch('/api/admin/products',  { headers: authHeaders() }).then(r => r.json()),
        fetch('/api/admin/orders',    { headers: authHeaders() }).then(r => r.json()),
        fetch('/api/admin/checkout-customers', { headers: authHeaders() }).then(r => r.json()),
        fetch('/api/admin/agents',    { headers: authHeaders() }).then(r => r.json()),
        fetch('/api/admin/analytics', { headers: authHeaders() }).then(r => r.json()),
      ])
      setProducts(Array.isArray(p) ? p : [])
      setOrders(Array.isArray(o) ? o : [])
      setCustomers(Array.isArray(c) ? c : [])
      setAgents(Array.isArray(a) ? a : [])
      setAnalytics(an)
    }
    if (!silent) setLoading(false)
  }, [authHeaders, supportHeaders])

  useEffect(() => { load(tab) }, [tab, load])

  // Stop dialer popup-close polling on lead change or unmount
  useEffect(() => {
    return () => stopDialerPolling()
  }, [dialerIdx])

  // Load call history when a lead detail panel is opened
  useEffect(() => {
    if (!selectedLead) { setCallHistory([]); return }
    setCallHistoryLoading(true)
    fetch(`/api/admin/dialer/call-logs?lead_id=${selectedLead.id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setCallHistory(Array.isArray(d) ? d : []))
      .catch(() => setCallHistory([]))
      .finally(() => setCallHistoryLoading(false))
  }, [selectedLead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Supabase Realtime: live order alerts
  useEffect(() => {
    const supabase = getBrowserSupabase()
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const total = Number((payload.new as Order).total ?? 0)
          if (alertTimer.current) clearTimeout(alertTimer.current)
          setRealtimeAlert(`New order received — $${total.toFixed(2)}`)
          alertTimer.current = setTimeout(() => setRealtimeAlert(''), 8000)
          setOrders(prev => [payload.new as Order, ...prev])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function createLead(e: React.FormEvent) {
    e.preventDefault()
    setCreatingLead(true)
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ customer_name: newLeadName, customer_phone: newLeadPhone, product_interest: newLeadProduct, agent_id: newLeadAgent || null, notes: newLeadNotes }),
      })
      if (res.ok) {
        flash('✓ Lead created')
        setShowNewLead(false)
        setNewLeadName(''); setNewLeadPhone(''); setNewLeadProduct(''); setNewLeadAgent(''); setNewLeadNotes('')
        load('leads', true)
      } else {
        flash('✗ Failed to create lead')
      }
    } catch { flash('✗ Network error') }
    setCreatingLead(false)
  }

  async function patchLead(id: string, updates: Record<string, unknown>) {
    setUpdatingLead(true)
    await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ id, ...updates }),
    })
    setUpdatingLead(false)
    setSelectedLead(prev => prev?.id === id ? { ...prev, ...updates } : prev)
    load('leads', true)
  }

  async function assignLead(leadId: string, agentId: string) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, agent_id: agentId || null } : l))
    await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ id: leadId, agent_id: agentId || null }),
    })
    load('leads', true)
  }

  async function deleteLead(id: string) {
    if (!confirm('Delete this lead?')) return
    await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE', headers: authHeaders() })
    flash('✓ Lead deleted')
    if (selectedLead?.id === id) setSelectedLead(null)
    load('leads', true)
  }

  async function clearAllLeads() {
    if (!confirm('Delete ALL leads? This cannot be undone.')) return
    setClearingLeads(true)
    await fetch('/api/admin/leads', { method: 'DELETE', headers: authHeaders() })
    setLeads([])
    setSelectedLead(null)
    setDialerIdx(0)
    setClearingLeads(false)
    flash('✓ All leads cleared')
  }

  function handleDialerAgentNameChange(name: string) {
    setDialerAgentName(name)
    localStorage.setItem('dialer_agent_name', name)
  }

  function stopDialerPolling() {
    if (dialerPollRef.current) { clearInterval(dialerPollRef.current); dialerPollRef.current = null }
  }

  function handleCopyDialerPhone(phone: string) {
    navigator.clipboard.writeText(phone).catch(() => {})
    setDialerCopied(true)
    setTimeout(() => setDialerCopied(false), 1800)
  }

  function openDialerPopup(phone: string) {
    stopDialerPolling()
    navigator.clipboard.writeText(phone).catch(() => {})
    const popup = window.open(
      'https://www.helloairdial.com/',
      'helloairdial',
      'width=500,height=700,left=100,top=100,resizable=yes,scrollbars=yes'
    )
    if (!popup || popup.closed) {
      setDialerPopupBlocked(true)
      setDialerCallStatus('calling')
      return
    }
    setDialerPopupBlocked(false)
    dialerWindowRef.current = popup
    setDialerCallStatus('calling')
    dialerPollRef.current = setInterval(() => {
      if (dialerWindowRef.current?.closed) {
        stopDialerPolling()
        setDialerCallStatus('ended')
        setShowDialerDisposition(true)
      }
    }, 1000)
  }

  async function handleDialerDisposition(disposition: string, notes: string) {
    const lead = dialerQueue[dialerIdx]
    if (!lead) return
    setDialerSubmitting(true)
    try {
      await fetch('/api/admin/dialer/disposition', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          lead_id: lead.id,
          disposition,
          agent_name: dialerAgentName || null,
          notes: notes || null,
        }),
      })
      setShowDialerDisposition(false)
      setDialerCallStatus('idle')
      setDialerPopupBlocked(false)
      setDialerIdx(i => i + 1)
      flash('✓ Call logged')
      load('leads', true)
    } finally {
      setDialerSubmitting(false)
    }
  }

  const dialerQueue = leads
    .filter(l => DIALER_STATUSES.includes(l.status))
    .slice()
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
  const currentDialerLead = dialerQueue[dialerIdx] ?? null

  function skipDialerLead() {
    setDialerIdx(i => i + 1)
  }

  function refreshDialerQueue() {
    setDialerIdx(0)
    load('leads', true)
  }

  async function createAgent(e: React.FormEvent) {
    e.preventDefault()
    setCreatingAgent(true)
    setCreateAgentMsg('')
    const res = await fetch('/api/admin/agents/create', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email: newAgentEmail, password: newAgentPassword, display_name: newAgentName }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateAgentMsg(data.error ?? 'Failed to create agent')
    } else {
      setShowCreateAgent(false)
      setNewAgentEmail(''); setNewAgentPassword(''); setNewAgentName('')
      load('agents', true)
      flash('✓ Agent created and approved')
    }
    setCreatingAgent(false)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function updateOrderStatus(id: string, status: string) {
    await fetch('/api/admin/orders', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ id, status }) })
    flash('✓ Order updated')
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    setSelectedOrder(prev => prev?.id === id ? { ...prev, status } : prev)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE', headers: authHeaders() })
    flash('✓ Product deleted'); load('products', true)
  }

  async function setAgentStatus(userId: string, status: string) {
    await fetch('/api/admin/agents', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ user_id: userId, status }) })
    flash(`✓ Agent ${status}`); load('agents', true)
  }

  // ── Support tab lock ────────────────────────────────────────
  // Restore an unlock from earlier in this browser session, and find out
  // whether the credentials are configured at all so the tab can say so
  // instead of silently rejecting every password.
  useEffect(() => {
    if (tab !== 'support' || !session) return
    setSupportToken(readSupportToken())
    fetch('/api/admin/support/unlock', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setSupportConfigured(d.configured !== false))
      .catch(() => {})
  }, [tab, session, authHeaders])

  async function unlockSupport(e: React.FormEvent) {
    e.preventDefault()
    if (gateBusy) return
    setGateBusy(true)
    setGateError('')
    try {
      const r = await fetch('/api/admin/support/unlock', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: gateEmail, password: gatePassword }),
      })
      const d = await r.json()
      if (!r.ok) {
        setGateError(d.error ?? 'Could not unlock.')
      } else {
        try { sessionStorage.setItem(SUPPORT_TOKEN_KEY, d.token) } catch {}
        setSupportToken(d.token)
        setGateEmail(''); setGatePassword('')
        load('support', true)
      }
    } catch {
      setGateError('Could not reach the server.')
    }
    setGateBusy(false)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwBusy) return
    setPwMsg(null)

    if (newPw.length < 8)   { setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return }
    if (newPw !== confirmPw){ setPwMsg({ ok: false, text: 'New passwords don’t match.' }); return }
    if (newPw === curPw)    { setPwMsg({ ok: false, text: 'New password must be different from the current one.' }); return }

    const email = user?.email
    if (!email) { setPwMsg({ ok: false, text: 'Could not read your account email. Try signing out and back in.' }); return }

    setPwBusy(true)
    const supabase = getBrowserSupabase()

    // Supabase lets any open session set a new password without proving the
    // old one, so check it explicitly first — otherwise an unattended
    // dashboard is enough for someone to lock the real owner out.
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: curPw })
    if (reauthError) {
      setPwMsg({ ok: false, text: 'Current password is incorrect.' })
      setPwBusy(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setPwMsg({ ok: false, text: error.message })
    } else {
      setPwMsg({ ok: true, text: 'Password updated. Use it next time you sign in.' })
      setCurPw(''); setNewPw(''); setConfirmPw('')
    }
    setPwBusy(false)
  }

  async function testNotify() {
    if (testingNotify) return
    setTestingNotify(true)
    try {
      const r = await fetch('/api/admin/support/notify-test', { method: 'POST', headers: supportHeaders() })
      const d = await r.json()
      flash(r.ok ? '✓ Test alert sent — check your phone' : (d.error ?? 'Could not send test alert'))
    } catch {
      flash('Could not reach the server')
    }
    setTestingNotify(false)
  }

  function lockSupport() {
    try { sessionStorage.removeItem(SUPPORT_TOKEN_KEY) } catch {}
    setSupportToken(null)
    setConversations([]); setActiveChat(null); setChatMessages([])
  }

  // ── Support chat ────────────────────────────────────────────
  const openChat = useCallback(async (c: SupportConversationRow) => {
    setActiveChat(c)
    setReplyDraft('')
    const r = await fetch(`/api/admin/support?conversation_id=${encodeURIComponent(c.id)}`, { headers: supportHeaders() })
    const d = await r.json()
    setChatMessages(Array.isArray(d.messages) ? d.messages : [])
    // Opening the thread clears its unread badge server-side; mirror that here
    // so the list doesn't keep showing a count that no longer exists.
    setConversations(prev => prev.map(x => (x.id === c.id ? { ...x, admin_unread: 0 } : x)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendReply() {
    const body = replyDraft.trim()
    if (!body || !activeChat || sendingReply) return
    setSendingReply(true)
    const r = await fetch('/api/admin/support', {
      method: 'POST',
      headers: supportHeaders(),
      body: JSON.stringify({ conversation_id: activeChat.id, body }),
    })
    const d = await r.json()
    if (r.ok && d.message) {
      setChatMessages(prev => [...prev, d.message])
      setReplyDraft('')
      load('support', true)
    } else {
      flash(d.error ?? 'Failed to send')
    }
    setSendingReply(false)
  }

  async function setChatStatus(id: string, status: 'open' | 'closed') {
    await fetch('/api/admin/support', { method: 'PATCH', headers: supportHeaders(), body: JSON.stringify({ conversation_id: id, status }) })
    setActiveChat(prev => (prev && prev.id === id ? { ...prev, status } : prev))
    flash(`✓ Chat ${status}`); load('support', true)
  }

  // Poll the open thread and the list so replies arrive without a refresh
  useEffect(() => {
    if (tab !== 'support' || !supportToken) return
    const id = setInterval(async () => {
      const r = await fetch('/api/admin/support', { headers: supportHeaders() })
      if (!r.ok) return
      const d = await r.json()
      if (Array.isArray(d)) setConversations(d)
      if (activeChat) {
        const mr = await fetch(`/api/admin/support?conversation_id=${encodeURIComponent(activeChat.id)}`, { headers: supportHeaders() })
        const md = await mr.json()
        if (Array.isArray(md.messages)) {
          setChatMessages(prev => (md.messages.length === prev.length ? prev : md.messages))
        }
      }
    }, 8000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeChat])

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview',          icon: 'fa-chart-line',   label: 'Overview' },
    { id: 'products',          icon: 'fa-box',          label: 'Products' },
    { id: 'orders',            icon: 'fa-receipt',      label: 'Orders' },
    { id: 'customers',         icon: 'fa-users',        label: 'Customers' },
    { id: 'agents',            icon: 'fa-headset',      label: 'Agents' },
    { id: 'support',           icon: 'fa-comments',     label: 'Support Chat' },
    { id: 'sales',             icon: 'fa-chart-pie',    label: 'Sales' },
    { id: 'agent-performance', icon: 'fa-ranking-star', label: 'Agent Performance' },
    { id: 'leads',             icon: 'fa-phone',        label: 'Leads' },
    { id: 'coupons',           icon: 'fa-tag',          label: 'Coupons' },
    { id: 'landing',           icon: 'fa-paintbrush',   label: 'Landing Page' },
    { id: 'settings',          icon: 'fa-gear',         label: 'Settings' },
    { id: 'rfs',              icon: 'fa-star',         label: 'RFS Portal' },
  ]

  const pendingAgents      = agents.filter(a => a.status === 'pending').length
  const revenue            = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total), 0)
  const platinumCustomers: CustomerTierRow[] = analytics?.customerTiers.filter(c => c.tier === 'platinum') ?? []
  const filteredCustomers  = customers.filter(c =>
    !customerSearch ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const ORDER_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    paid:            { bg: '#dcfce7', text: '#15803d' },
    pending_payment: { bg: '#ffedd5', text: '#9a3412' },
    pending:   { bg: '#fef9c3', text: '#854d0e' },
    confirmed: { bg: '#dbeafe', text: '#1e40af' },
    packed:    { bg: '#ede9fe', text: '#5b21b6' },
    shipped:   { bg: '#e0f2fe', text: '#0369a1' },
    delivered: { bg: '#d1fae5', text: '#065f46' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
  }

  const AGENT_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    pending:   { bg: '#fef9c3', text: '#854d0e' },
    approved:  { bg: '#d1fae5', text: '#065f46' },
    rejected:  { bg: '#fee2e2', text: '#991b1b' },
    suspended: { bg: '#f3f4f6', text: '#374151' },
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      {/* top bar */}
      <div style={{ background: 'var(--navy)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'white' }}>
          Maga <span style={{ color: 'var(--teal-light)' }}>Offers</span>
          <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--sale-red)', padding: '2px 8px', borderRadius: 20, marginLeft: 8, verticalAlign: 'middle' }}>ADMIN</span>
        </a>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{profile?.full_name ?? 'Admin'}</span>
          <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '6px 14px', borderRadius: 50, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
        </div>
      </div>

      {/* tabs */}
      <div style={{ background: 'var(--navy)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '0 28px', display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ color: tab === t.id ? 'white' : 'rgba(255,255,255,0.6)', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '3px solid var(--teal)' : '3px solid transparent', padding: '13px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.2s' }}>
            <i className={`fa-solid ${t.icon}`} style={{ fontSize: 12 }} /> {t.label}
            {t.id === 'agents' && pendingAgents > 0 && (
              <span style={{ background: 'var(--sale-red)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px' }}>{pendingAgents}</span>
            )}
          </button>
        ))}
      </div>

      {/* Realtime new-order alert */}
      <AnimatePresence>
        {realtimeAlert && (
          <motion.div
            initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 120, opacity: 0 }}
            onClick={() => setRealtimeAlert('')}
            style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, background: 'var(--teal)', color: 'white', padding: '14px 20px', borderRadius: 14, fontWeight: 700, fontSize: 14, boxShadow: '0 8px 28px rgba(88,148,143,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.i className="fa-solid fa-bell" animate={{ rotate: [0, 20, -20, 10, 0] }} transition={{ duration: 0.5, repeat: 3 }} />
            {realtimeAlert}
            <span style={{ fontSize: 12, opacity: 0.7 }}>· click to dismiss</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px' }}>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#d1fae5', color: '#065f46', padding: '12px 20px', borderRadius: 12, marginBottom: 20, fontWeight: 600, fontSize: 14 }}>
            {msg}
          </motion.div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-light)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--teal)' }} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>

              {/* ── OVERVIEW ─────────────────────────────── */}
              {tab === 'overview' && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--heading)', marginBottom: 24 }}>Dashboard Overview</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
                    <StatCard label="Total Products"      value={products.length}                 icon="fa-box"          color="var(--navy)"     delay={0} />
                    <StatCard label="Total Orders"        value={orders.length}                   icon="fa-receipt"      color="var(--teal)"     delay={0.05} />
                    <StatCard label="Customers"           value={customers.length}                icon="fa-users"        color="#7c3aed"         delay={0.1} />
                    <StatCard label="Revenue (delivered)" value={`$${revenue.toFixed(0)}`}        icon="fa-dollar-sign"  color="#059669"         delay={0.15} />
                    <StatCard label="Pending Agents"      value={pendingAgents}                   icon="fa-headset"      color="var(--sale-red)" delay={0.2} />
                    {analytics && (
                      <>
                        <StatCard label="This Week Revenue"  value={`$${analytics.revenueThisWeek.toFixed(0)}`}  icon="fa-calendar-week" color="#0891b2" delay={0.25} />
                        <StatCard label="This Month Revenue" value={`$${analytics.revenueThisMonth.toFixed(0)}`} icon="fa-chart-line"    color="#d97706" delay={0.3} />
                        <StatCard label="This Month Orders"  value={analytics.ordersThisMonth}                   icon="fa-calendar"      color="#0369a1" delay={0.35} />
                      </>
                    )}
                  </div>

                  {analytics && analytics.dailyRevenue.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <AdminCharts section="overview" data={analytics} />
                    </div>
                  )}

                  {pendingAgents > 0 && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <i className="fa-solid fa-bell" style={{ color: '#d97706' }} />
                      <span style={{ fontSize: 14, color: '#92400e', fontWeight: 600 }}>{pendingAgents} agent application{pendingAgents > 1 ? 's' : ''} waiting for review.</span>
                      <button onClick={() => setTab('agents')} style={{ marginLeft: 'auto', background: 'var(--navy)', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Review Now</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── PRODUCTS ─────────────────────────────── */}
              {tab === 'products' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)' }}>Products ({products.length})</h2>
                    <a href="/admin/products/new" style={{ background: 'var(--teal)', color: 'white', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <i className="fa-solid fa-plus" /> Add Product
                    </a>
                  </div>
                  <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['Product', 'Category', 'Price', 'Sale?', 'Stock', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>No products yet. Click &quot;Add Product&quot; to create one.</td></tr>
                        )}
                        {products.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--gray)' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img src={p.img} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--teal)', textTransform: 'capitalize' }}>{p.category}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 700 }}>${p.price.toFixed(2)}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: p.is_sale ? '#fee2e2' : 'var(--gray)', color: p.is_sale ? 'var(--sale-red)' : 'var(--text-mid)' }}>
                                {p.is_sale ? 'Sale' : 'Regular'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: p.in_stock ? '#d1fae5' : '#fee2e2', color: p.in_stock ? '#065f46' : '#991b1b' }}>
                                {p.in_stock ? 'In Stock' : 'Out of Stock'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <a href={`/admin/products/${p.id}`} style={{ background: 'var(--gray)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--heading)', textDecoration: 'none' }}>Edit</a>
                                <button onClick={() => deleteProduct(p.id)} style={{ background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--sale-red)', fontFamily: 'inherit' }}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── ORDERS ───────────────────────────────── */}
              {tab === 'orders' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)' }}>Orders ({orders.length})</h2>
                    {orders.length > 0 && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete all ${orders.length} orders? This cannot be undone.`)) return
                          await fetch('/api/admin/orders', { method: 'DELETE', headers: authHeaders() })
                          flash('✓ All orders cleared')
                          setOrders([])
                        }}
                        style={{ background: '#fee2e2', border: 'none', color: '#991b1b', padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <i className="fa-solid fa-trash" /> Clear All Orders
                      </button>
                    )}
                  </div>
                  <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['Order #', 'Customer', 'Items', 'Total', 'Discount', 'Status', 'Date', ''].map(h => (
                            <th key={h} style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 && (
                          <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>No orders yet.</td></tr>
                        )}
                        {orders.map(o => {
                          const sc = ORDER_STATUS_COLOR[o.status ?? 'pending'] ?? ORDER_STATUS_COLOR.pending
                          return (
                            <tr key={o.id}
                              onClick={() => setSelectedOrder(o)}
                              style={{ borderBottom: '1px solid var(--gray)', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--off-white)')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}>
                              <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--heading)' }}>#{o.order_number ?? o.id?.slice(0, 5).toUpperCase()}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <p style={{ fontWeight: 600, fontSize: 13 }}>{o.customer_name ?? 'Guest'}</p>
                                {o.customer_email && <p style={{ fontSize: 11, color: 'var(--text-light)' }}>{o.customer_email}</p>}
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 13 }}>{Array.isArray(o.items) ? o.items.length : 0} items</td>
                              <td style={{ padding: '12px 14px', fontWeight: 700 }}>${Number(o.total).toFixed(2)}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#059669' }}>{o.discount_amount ? `-$${Number(o.discount_amount).toFixed(2)}` : '—'}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.text, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{(o.status ?? '').replace('_', ' ')}</span>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-light)', fontSize: 11 }} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── CUSTOMERS ────────────────────────────── */}
              {tab === 'customers' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)' }}>Checkout Customers ({filteredCustomers.length})</h2>
                    <input
                      value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Search by name or email…"
                      style={{ border: '2px solid var(--gray)', borderRadius: 50, padding: '9px 18px', fontSize: 13, fontFamily: 'inherit', outline: 'none', minWidth: 260 }} />
                  </div>
                  <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['Email', 'Orders', 'Total Spent', 'First Order', 'Last Order'].map(h => (
                            <th key={h} style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>No checkout customers yet.</td></tr>
                        )}
                        {filteredCustomers.map(c => (
                          <tr key={c.email} style={{ borderBottom: '1px solid var(--gray)' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                  {c.email[0].toUpperCase()}
                                </div>
                                <span style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: 'monospace' }}>{c.email}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: 'var(--heading)' }}>{c.order_count}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#059669', fontSize: 13 }}>${c.total_spent.toFixed(2)}</td>
                            <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{new Date(c.first_order).toLocaleDateString()}</td>
                            <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{new Date(c.last_order).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── SUPPORT CHAT ─────────────────────────── */}
              {tab === 'support' && !supportToken && (
                /* Locked — customer conversations need a second sign-in */
                <div style={{ maxWidth: 420, margin: '40px auto' }}>
                  <div style={{ background: 'var(--white)', borderRadius: 16, padding: 32, boxShadow: '0 2px 12px rgba(9,52,89,0.06)', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--navy), #0e4a80)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                      <i className="fa-solid fa-lock" style={{ color: 'white', fontSize: 21 }} />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 23, fontWeight: 900, color: 'var(--heading)', marginBottom: 8 }}>
                      Support Chat is locked
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: 24 }}>
                      Customer conversations need a separate sign-in.
                    </p>

                    {!supportConfigured ? (
                      <p style={{ fontSize: 13, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', textAlign: 'left', lineHeight: 1.6 }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 7 }} />
                        Not configured yet. Set <strong>SUPPORT_TAB_EMAIL</strong> and <strong>SUPPORT_TAB_PASSWORD</strong> in your Vercel environment variables, then redeploy.
                      </p>
                    ) : (
                      <form onSubmit={unlockSupport} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                        <input type="email" value={gateEmail} onChange={e => setGateEmail(e.target.value)}
                          placeholder="Email" autoComplete="off" required
                          style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text-dark)' }} />
                        <input type="password" value={gatePassword} onChange={e => setGatePassword(e.target.value)}
                          placeholder="Password" autoComplete="off" required
                          style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text-dark)' }} />
                        {gateError && (
                          <p style={{ fontSize: 12.5, color: '#b91c1c', fontWeight: 600, margin: 0 }}>
                            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />{gateError}
                          </p>
                        )}
                        <button type="submit" disabled={gateBusy}
                          style={{ background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 800, cursor: gateBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: gateBusy ? 0.65 : 1 }}>
                          {gateBusy ? 'Checking…' : 'Unlock Support Chat'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {tab === 'support' && supportToken && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)', margin: 0 }}>
                      Support Chat ({conversations.length})
                      {conversations.reduce((s, c) => s + c.admin_unread, 0) > 0 && (
                        <span style={{ fontSize: 14, fontWeight: 700, background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: 20, marginLeft: 12 }}>
                          {conversations.reduce((s, c) => s + c.admin_unread, 0)} unread
                        </span>
                      )}
                    </h2>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={testNotify} disabled={testingNotify}
                        style={{ background: 'var(--gray)', color: 'var(--text-mid)', border: 'none', padding: '9px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: testingNotify ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7, opacity: testingNotify ? 0.6 : 1 }}>
                        <i className="fa-solid fa-bell" /> {testingNotify ? 'Sending…' : 'Test alert'}
                      </button>
                      <button onClick={lockSupport}
                        style={{ background: 'var(--gray)', color: 'var(--text-mid)', border: 'none', padding: '9px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <i className="fa-solid fa-lock" /> Lock
                      </button>
                    </div>
                  </div>

                  {conversations.length === 0 ? (
                    <div style={{ background: 'var(--white)', borderRadius: 16, padding: '60px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
                      <i className="fa-regular fa-comments" style={{ fontSize: 40, color: 'var(--text-light)', opacity: 0.5, marginBottom: 14, display: 'block' }} />
                      <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0 }}>
                        No conversations yet. They appear here as soon as a customer starts a chat.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 16, alignItems: 'start' }}>
                      {/* Conversation list */}
                      <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', maxHeight: '68vh', overflowY: 'auto' }}>
                        {conversations.map(c => {
                          const active = activeChat?.id === c.id
                          return (
                            <button key={c.id} onClick={() => openChat(c)}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                                background: active ? 'rgba(88,148,143,0.10)' : 'transparent',
                                border: 'none', borderLeft: `3px solid ${active ? 'var(--teal)' : 'transparent'}`,
                                borderBottom: '1px solid var(--gray)', padding: '13px 16px', fontFamily: 'inherit',
                              }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {c.email}
                                </span>
                                {c.admin_unread > 0 && (
                                  <span style={{ background: '#dc2626', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: 20, padding: '2px 7px', flexShrink: 0 }}>
                                    {c.admin_unread}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: 11.5, color: 'var(--text-light)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.last_sender === 'admin' && <span style={{ color: 'var(--teal)', fontWeight: 700 }}>You: </span>}
                                {c.last_message ?? 'No messages yet'}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                                <span style={{ fontSize: 10, color: 'var(--text-light)' }}>
                                  {new Date(c.last_message_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                                {c.status === 'closed' && (
                                  <span style={{ fontSize: 9.5, fontWeight: 800, background: 'var(--gray)', color: 'var(--text-mid)', padding: '1px 6px', borderRadius: 20, textTransform: 'uppercase' }}>
                                    Closed
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Thread */}
                      <div style={{ background: 'var(--white)', borderRadius: 16, boxShadow: '0 2px 12px rgba(9,52,89,0.06)', display: 'flex', flexDirection: 'column', minHeight: 420, maxHeight: '68vh' }}>
                        {!activeChat ? (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', fontSize: 14, padding: 40, textAlign: 'center' }}>
                            Pick a conversation to read and reply.
                          </div>
                        ) : (
                          <>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>{activeChat.email}</p>
                                <p style={{ fontSize: 11.5, color: 'var(--text-light)', margin: '2px 0 0' }}>
                                  {chatMessages.length} message{chatMessages.length === 1 ? '' : 's'} · started {new Date(activeChat.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <button onClick={() => setChatStatus(activeChat.id, activeChat.status === 'closed' ? 'open' : 'closed')}
                                style={{ background: activeChat.status === 'closed' ? 'var(--teal)' : 'var(--gray)', color: activeChat.status === 'closed' ? 'white' : 'var(--text-mid)', border: 'none', padding: '7px 14px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                                {activeChat.status === 'closed' ? 'Reopen' : 'Mark resolved'}
                              </button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {chatMessages.map(m => {
                                const mine = m.sender === 'admin'
                                return (
                                  <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                                    <div style={{
                                      maxWidth: '76%',
                                      background: mine ? 'linear-gradient(135deg, var(--navy), #0e4a80)' : 'var(--off-white)',
                                      color: mine ? 'white' : 'var(--text-dark)',
                                      border: mine ? 'none' : '1px solid var(--gray)',
                                      borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                      padding: '10px 14px', fontSize: 13.5, lineHeight: 1.6,
                                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    }}>
                                      {m.body}
                                      <span style={{ display: 'block', fontSize: 10, opacity: 0.6, marginTop: 5, textAlign: 'right' }}>
                                        {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--gray)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                              <textarea
                                value={replyDraft}
                                onChange={e => setReplyDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                                placeholder="Write a reply…"
                                rows={1}
                                maxLength={2000}
                                style={{ flex: 1, border: '2px solid var(--gray)', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', resize: 'none', maxHeight: 120, boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text-dark)' }}
                              />
                              <button onClick={sendReply} disabled={!replyDraft.trim() || sendingReply}
                                style={{ background: replyDraft.trim() ? 'var(--navy)' : 'var(--gray)', color: replyDraft.trim() ? 'white' : 'var(--text-light)', border: 'none', borderRadius: 10, width: 44, height: 44, cursor: replyDraft.trim() && !sendingReply ? 'pointer' : 'not-allowed', fontSize: 14, flexShrink: 0 }}
                                aria-label="Send reply">
                                <i className={sendingReply ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── AGENTS ───────────────────────────────── */}
              {tab === 'agents' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)' }}>
                      Agent Applications ({agents.length})
                      {pendingAgents > 0 && <span style={{ fontSize: 14, fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 20, marginLeft: 12 }}>{pendingAgents} pending</span>}
                    </h2>
                    <motion.button onClick={() => { setShowCreateAgent(true); setCreateAgentMsg('') }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '11px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fa-solid fa-user-plus" /> Create Agent
                    </motion.button>
                  </div>
                  <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['Name', 'Email', 'Phone', 'Leads', 'Converted', 'Status', 'Applied', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {agents.map(a => {
                          const s = AGENT_STATUS_COLOR[a.status] ?? AGENT_STATUS_COLOR.pending
                          return (
                            <tr key={a.id} style={{ borderBottom: '1px solid var(--gray)' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{a.display_name}</td>
                              <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-mid)' }}>{a.email || '—'}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-mid)' }}>{a.phone}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'var(--heading)' }}>{a.lead_count ?? 0}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{a.converted_count ?? 0}</span>
                                {(a.lead_count ?? 0) > 0 && (
                                  <span style={{ fontSize: 11, color: 'var(--text-light)', marginLeft: 4 }}>({Math.round(((a.converted_count ?? 0) / (a.lead_count ?? 1)) * 100)}%)</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.text, textTransform: 'capitalize' }}>{a.status}</span>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {a.status !== 'approved'   && <button onClick={() => setAgentStatus(a.user_id, 'approved')}  style={{ background: '#d1fae5', border: 'none', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#065f46',  fontFamily: 'inherit' }}>Approve</button>}
                                  {a.status !== 'rejected'   && <button onClick={() => setAgentStatus(a.user_id, 'rejected')}  style={{ background: '#fee2e2', border: 'none', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#991b1b',  fontFamily: 'inherit' }}>Reject</button>}
                                  {a.status === 'approved'   && <button onClick={() => setAgentStatus(a.user_id, 'suspended')} style={{ background: '#f3f4f6', border: 'none', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#374151',  fontFamily: 'inherit' }}>Suspend</button>}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        {agents.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>No agent applications yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── SALES ────────────────────────────────── */}
              {tab === 'sales' && analytics && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--heading)', marginBottom: 24 }}>Sales Analytics</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
                    <StatCard label="Total Revenue"     value={`$${analytics.totalRevenue.toFixed(0)}`}     icon="fa-dollar-sign" color="#059669" />
                    <StatCard label="Total Orders"      value={analytics.totalOrders}                        icon="fa-receipt"     color="var(--teal)" />
                    <StatCard label="This Month Rev."   value={`$${analytics.revenueThisMonth.toFixed(0)}`} icon="fa-chart-line"  color="#d97706" delay={0.05} />
                    <StatCard label="This Month Orders" value={analytics.ordersThisMonth}                    icon="fa-calendar"    color="#7c3aed" delay={0.1} />
                    <StatCard label="VIP Customers"     value={platinumCustomers.length}                     icon="fa-crown"       color="#b45309" delay={0.15} />
                  </div>
                  <div style={{ marginBottom: 28 }}>
                    <AdminCharts section="sales" data={analytics} />
                  </div>
                  <div style={{ background: 'var(--white)', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--heading)', marginBottom: 14 }}>Top Products by Revenue</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['#', 'Product', 'Units Sold', 'Revenue'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topProducts.map((p, i) => (
                          <tr key={p.name} style={{ borderBottom: '1px solid var(--gray)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-mid)', fontSize: 13 }}>{i + 1}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{p.name}</td>
                            <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-mid)' }}>{p.units}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669' }}>${p.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                        {analytics.topProducts.length === 0 && <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: 'var(--text-light)' }}>No sales data yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ background: 'var(--white)', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <i className="fa-solid fa-crown" style={{ color: '#b45309', fontSize: 16 }} />
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--heading)' }}>VIP Customers (Spent $2,000+)</p>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['Customer', 'Tier', 'Orders', 'Total Spent'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {platinumCustomers.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--gray)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{c.full_name}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: TIER_STYLE[c.tier].bg, color: TIER_STYLE[c.tier].text, textTransform: 'capitalize' }}>{c.tier}</span>
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-mid)' }}>{c.order_count}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669' }}>${c.total_spent.toFixed(2)}</td>
                          </tr>
                        ))}
                        {platinumCustomers.length === 0 && <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: 'var(--text-light)' }}>No VIP customers yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── AGENT PERFORMANCE ────────────────────── */}
              {tab === 'agent-performance' && analytics && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--heading)', marginBottom: 24 }}>Agent Performance</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
                    <StatCard label="Active Agents"      value={analytics.agentStats.length}                                                          icon="fa-headset"      color="var(--teal)" />
                    <StatCard label="Total Calls Made"   value={analytics.agentStats.reduce((s, a) => s + (a.calls_made ?? 0), 0)}                      icon="fa-phone"        color="var(--navy)" />
                    <StatCard label="Attributed Revenue" value={`$${analytics.agentStats.reduce((s, a) => s + (a.attributed_revenue ?? 0), 0).toFixed(0)}`} icon="fa-dollar-sign"  color="#059669" />
                    <StatCard label="Total Leads"        value={analytics.agentStats.reduce((s, a) => s + (a.total_leads ?? 0), 0)}                      icon="fa-users"        color="#7c3aed" delay={0.05} />
                    <StatCard label="Converted Leads"    value={analytics.agentStats.reduce((s, a) => s + (a.converted_leads ?? 0), 0)}                  icon="fa-circle-check" color="#059669" delay={0.1} />
                  </div>

                  {analytics.agentStats.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <AdminCharts section="agents" data={analytics} />
                    </div>
                  )}

                  <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['Agent', 'Calls Made', 'Total Leads', 'Converted', 'Conv. Rate', 'Attributed Orders', 'Attributed Revenue', 'Last Active'].map(h => (
                            <th key={h} style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.agentStats.map(a => {
                          const rate = a.lead_conversion_rate ?? 0
                          const lastActive = a.last_active ? new Date(a.last_active) : null
                          const daysSince  = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 86400000) : null
                          return (
                            <tr key={a.user_id} style={{ borderBottom: '1px solid var(--gray)' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                                    {a.display_name.charAt(0).toUpperCase()}
                                  </div>
                                  {a.display_name}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <i className="fa-solid fa-phone" style={{ fontSize: 10, color: 'var(--teal)' }} />
                                  {a.calls_made ?? 0}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{a.total_leads ?? 0}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#059669' }}>{a.converted_leads ?? 0}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                                  background: rate >= 50 ? '#d1fae5' : rate >= 20 ? '#fef9c3' : 'var(--gray)',
                                  color: rate >= 50 ? '#065f46' : rate >= 20 ? '#854d0e' : 'var(--text-mid)' }}>
                                  {rate}%
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>
                                {(a.attributed_orders ?? 0) > 0
                                  ? <span style={{ color: '#059669', fontWeight: 700 }}>{a.attributed_orders}</span>
                                  : <span style={{ color: 'var(--text-light)' }}>0</span>}
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 700, color: '#059669' }}>
                                {(a.attributed_revenue ?? 0) > 0 ? `$${(a.attributed_revenue ?? 0).toFixed(2)}` : <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>—</span>}
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 12 }}>
                                {daysSince === null
                                  ? <span style={{ color: 'var(--text-light)' }}>No activity</span>
                                  : daysSince === 0
                                    ? <span style={{ color: '#059669', fontWeight: 700 }}>Today</span>
                                    : daysSince === 1
                                      ? <span style={{ color: '#0369a1', fontWeight: 600 }}>Yesterday</span>
                                      : <span style={{ color: 'var(--text-mid)' }}>{daysSince}d ago</span>}
                              </td>
                            </tr>
                          )
                        })}
                        {analytics.agentStats.length === 0 && (
                          <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>No approved agents yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ background: 'var(--white)', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', marginTop: 24 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--heading)', marginBottom: 14 }}>All Customers — Loyalty Tiers</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['Customer', 'Tier', 'Orders', 'Total Spent', 'Progress to Next Tier'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.customerTiers.map(c => {
                          const nextTiers = [500, 1000, 2000]
                          const next = nextTiers.find(n => n > c.total_spent)
                          const prev = next ? nextTiers[nextTiers.indexOf(next) - 1] ?? 0 : 2000
                          const pct  = next ? Math.min(100, ((c.total_spent - prev) / (next - prev)) * 100) : 100
                          return (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--gray)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{c.full_name}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: TIER_STYLE[c.tier].bg, color: TIER_STYLE[c.tier].text, textTransform: 'capitalize' }}>{c.tier}</span>
                              </td>
                              <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-mid)' }}>{c.order_count}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669', fontSize: 13 }}>${c.total_spent.toFixed(2)}</td>
                              <td style={{ padding: '10px 14px', minWidth: 140 }}>
                                <div style={{ background: 'var(--gray)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                  <div style={{ background: c.tier === 'platinum' ? '#3b82f6' : c.tier === 'gold' ? '#f59e0b' : c.tier === 'silver' ? '#9ca3af' : '#58948F', width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s' }} />
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>
                                  {c.tier === 'platinum' ? 'Max tier' : `$${c.total_spent.toFixed(0)} / $${next}`}
                                </p>
                              </td>
                            </tr>
                          )
                        })}
                        {analytics.customerTiers.length === 0 && <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-light)' }}>No customer data yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── LEADS ───────────────────────────────── */}
              {tab === 'leads' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--heading)' }}>Lead Management</h2>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <motion.button onClick={() => setShowImportLeads(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        style={{ background: 'var(--gray)', color: 'var(--text-mid)', border: 'none', padding: '11px 18px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-file-import" /> Import
                      </motion.button>
                      <motion.button onClick={clearAllLeads} disabled={clearingLeads || leads.length === 0} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        style={{ background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5', padding: '11px 18px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: leads.length === 0 ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, opacity: leads.length === 0 ? 0.5 : 1 }}>
                        <i className="fa-solid fa-trash" /> {clearingLeads ? 'Clearing…' : 'Clear All'}
                      </motion.button>
                      <motion.button onClick={() => setShowNewLead(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        style={{ background: 'var(--teal)', color: 'white', border: 'none', padding: '11px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-plus" /> New Lead
                      </motion.button>
                    </div>
                  </div>

                  {/* ── Call Queue (merged dialer) ── */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--heading)' }}>
                        <i className="fa-solid fa-phone" style={{ marginRight: 8, color: 'var(--teal)' }} />
                        Call Queue
                      </h3>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          value={dialerAgentName}
                          onChange={e => handleDialerAgentNameChange(e.target.value)}
                          placeholder="Your name (caller)"
                          style={{ border: `2px solid ${D.border}`, borderRadius: 50, padding: '7px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', width: 160, background: D.inputBg, color: D.text }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>
                          Lead {dialerQueue.length > 0 ? Math.min(dialerIdx + 1, dialerQueue.length) : 0} of {dialerQueue.length}
                        </span>
                        <button onClick={refreshDialerQueue} style={{ background: 'var(--gray)', border: 'none', color: 'var(--text-mid)', padding: '7px 14px', borderRadius: 50, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <i className="fa-solid fa-rotate" style={{ marginRight: 5 }} />Refresh
                        </button>
                      </div>
                    </div>

                    {!currentDialerLead ? (
                      <div style={{ background: 'var(--white)', borderRadius: 16, padding: '32px 28px', textAlign: 'center', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
                        <i className="fa-solid fa-phone-slash" style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 10, display: 'block' }} />
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)', marginBottom: 4 }}>No leads left to call</p>
                        <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>Import more leads or refresh the queue.</p>
                      </div>
                    ) : (
                      <motion.div key={currentDialerLead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        style={{ background: 'var(--navy)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(9,52,89,0.12)' }}>
                        <div style={{ padding: '24px 28px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                            <div>
                              <p style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 4 }}>{currentDialerLead.customer_name || '(No name)'}</p>
                              <p style={{ fontSize: 19, fontWeight: 700, color: 'var(--teal-light)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                                {currentDialerLead.customer_phone}
                              </p>
                              {currentDialerLead.product_interest && (
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
                                  <i className="fa-solid fa-tag" style={{ marginRight: 6 }} />{currentDialerLead.product_interest}
                                  {currentDialerLead.lineitem_price != null && (
                                    <span style={{ marginLeft: 8, color: '#86efac', fontWeight: 700 }}>${Number(currentDialerLead.lineitem_price).toFixed(2)}</span>
                                  )}
                                </p>
                              )}
                              {currentDialerLead.call_count != null && currentDialerLead.call_count > 0 && (
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                                  Called {currentDialerLead.call_count}× · Last: {currentDialerLead.disposition?.replace(/_/g, ' ') ?? '—'}
                                </p>
                              )}
                            </div>
                          </div>

                          {dialerPopupBlocked && (
                            <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, fontSize: 13, color: '#9a3412', marginBottom: 14 }}>
                              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                              Popup blocked.{' '}
                              <a href="https://www.helloairdial.com/" target="_blank" rel="noreferrer" style={{ color: '#9a3412', fontWeight: 700 }}>
                                Open HelloAirDial manually
                              </a>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 10 }}>
                            {dialerCallStatus === 'idle' ? (
                              <>
                                <button
                                  onClick={() => handleCopyDialerPhone(currentDialerLead.customer_phone)}
                                  style={{
                                    background: dialerCopied ? '#059669' : 'rgba(255,255,255,0.12)', color: 'white', border: 'none',
                                    padding: '13px 18px', borderRadius: 50, fontWeight: 700, fontSize: 14,
                                    cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                                  }}>
                                  <i className={`fa-solid ${dialerCopied ? 'fa-check' : 'fa-copy'}`} />
                                  {dialerCopied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                  onClick={() => openDialerPopup(currentDialerLead.customer_phone)}
                                  style={{
                                    flex: 1, background: '#4dd9b8', color: 'var(--navy)', border: 'none',
                                    padding: '13px 24px', borderRadius: 50, fontWeight: 800, fontSize: 15,
                                    cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                  }}>
                                  <i className="fa-solid fa-phone" /> Start Call
                                </button>
                                <button
                                  onClick={skipDialerLead}
                                  title="Skip this lead"
                                  style={{
                                    background: 'rgba(255,255,255,0.12)', color: 'white', border: 'none',
                                    padding: '13px 18px', borderRadius: 50, fontWeight: 700, fontSize: 14,
                                    cursor: 'pointer', fontFamily: 'inherit',
                                  }}>
                                  <i className="fa-solid fa-forward" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => { stopDialerPolling(); setDialerCallStatus('ended'); setShowDialerDisposition(true) }}
                                style={{
                                  flex: 1, background: '#4dd9b8', color: 'var(--navy)', border: 'none',
                                  padding: '13px 24px', borderRadius: 50, fontWeight: 800, fontSize: 15,
                                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}>
                                <i className="fa-solid fa-clipboard-list" />
                                {dialerCallStatus === 'ended' ? 'Log Disposition' : 'Done Calling — Log Outcome'}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16, marginBottom: 24 }}>
                    <StatCard label="Total Leads"    value={leads.length}                                                    icon="fa-users"        color="var(--navy)" />
                    <StatCard label="New / Assigned" value={leads.filter(l => ['new','assigned'].includes(l.status)).length} icon="fa-phone"        color="var(--teal)"  delay={0.05} />
                    <StatCard label="Follow Ups"     value={leads.filter(l => l.status === 'follow_up').length}              icon="fa-clock"        color="#7c3aed"      delay={0.1} />
                    <StatCard label="Converted"      value={leads.filter(l => l.status === 'converted').length}              icon="fa-circle-check" color="#059669"      delay={0.15} />
                    <StatCard label="Unassigned"     value={leads.filter(l => !l.agent_id).length}                          icon="fa-user-slash"   color="#d97706"      delay={0.2} />
                  </div>

                  {/* Filter row: Status + Agent */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {/* Status filter bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Status:</span>
                      <button onClick={() => setLeadStatusFilter('all')}
                        style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: leadStatusFilter === 'all' ? '2px solid var(--navy)' : `2px solid ${D.border}`, background: leadStatusFilter === 'all' ? 'var(--navy)' : D.btnBg, color: leadStatusFilter === 'all' ? 'white' : D.text }}>
                        All ({leads.length})
                      </button>
                      {Object.entries(STATUS_COLORS).map(([k, v]) => {
                        const count = leads.filter(l => l.status === k).length
                        if (count === 0) return null
                        return (
                          <button key={k} onClick={() => setLeadStatusFilter(k)}
                            style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: leadStatusFilter === k ? `2px solid ${v.text}` : `2px solid ${D.border}`, background: leadStatusFilter === k ? v.bg : D.btnBg, color: leadStatusFilter === k ? v.text : D.text }}>
                            {v.label} ({count})
                          </button>
                        )
                      })}
                    </div>
                    {/* Agent filter bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Agent:</span>
                      <button onClick={() => setLeadAgentFilter('all')}
                        style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: leadAgentFilter === 'all' ? '2px solid var(--teal)' : `2px solid ${D.border}`, background: leadAgentFilter === 'all' ? 'var(--teal)' : D.btnBg, color: leadAgentFilter === 'all' ? 'white' : D.text }}>
                        All Agents
                      </button>
                      <button onClick={() => setLeadAgentFilter('unassigned')}
                        style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: leadAgentFilter === 'unassigned' ? '2px solid #d97706' : `2px solid ${D.border}`, background: leadAgentFilter === 'unassigned' ? '#fef3c7' : D.btnBg, color: leadAgentFilter === 'unassigned' ? '#92400e' : D.text }}>
                        Unassigned ({leads.filter(l => !l.agent_id).length})
                      </button>
                      {approvedAgents.map(a => {
                        const count = leads.filter(l => l.agent_id === a.user_id).length
                        if (count === 0) return null
                        const active = leadAgentFilter === a.user_id
                        return (
                          <button key={a.user_id} onClick={() => setLeadAgentFilter(a.user_id)}
                            style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: active ? '2px solid #7c3aed' : `2px solid ${D.border}`, background: active ? '#ede9fe' : D.btnBg, color: active ? '#5b21b6' : D.text }}>
                            <i className="fa-solid fa-user-headset" style={{ marginRight: 5, fontSize: 10 }} />
                            {a.display_name} ({count})
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['Customer', 'Phone', 'Interest', 'Notes', 'Assigned Agent', 'Status', 'Follow-Up', 'Date', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leads.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>No leads yet. Click &quot;New Lead&quot; to create one.</td></tr>}
                        {(() => {
                          const filtered = leads.filter(l =>
                            (leadStatusFilter === 'all' || l.status === leadStatusFilter) &&
                            (leadAgentFilter === 'all' || (leadAgentFilter === 'unassigned' ? !l.agent_id : l.agent_id === leadAgentFilter))
                          )
                          if (filtered.length === 0 && leads.length > 0) {
                            return <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>No leads match the selected filters.</td></tr>
                          }
                          return null
                        })()}
                        {leads.filter(l =>
                          (leadStatusFilter === 'all' || l.status === leadStatusFilter) &&
                          (leadAgentFilter === 'all' || (leadAgentFilter === 'unassigned' ? !l.agent_id : l.agent_id === leadAgentFilter))
                        ).map(l => {
                          const ss = STATUS_COLORS[l.status] ?? STATUS_COLORS.new
                          return (
                            <tr key={l.id}
                              onClick={() => { setSelectedLead(l); setLeadNoteText(l.notes ?? ''); setLeadFollowUpDate(l.follow_up_date ?? '') }}
                              style={{ borderBottom: '1px solid var(--gray)', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--off-white)')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}>
                              <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{l.customer_name}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-mid)', fontFamily: 'monospace' }}>{l.customer_phone}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-mid)' }}>{l.product_interest || '—'}</td>
                              <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-mid)', maxWidth: 140 }}>
                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.notes || '—'}</span>
                              </td>
                              <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                                <select value={l.agent_id ?? ''} onChange={e => assignLead(l.id, e.target.value)}
                                  style={{ border: '1px solid var(--gray)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', maxWidth: 160 }}>
                                  <option value="">Unassigned</option>
                                  {approvedAgents.map(a => <option key={a.user_id} value={a.user_id}>{a.display_name}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.text, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                  {l.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>{l.follow_up_date || '—'}</td>
                              <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
                              <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => deleteLead(l.id)} style={{ background: '#fee2e2', border: 'none', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#991b1b', fontFamily: 'inherit' }}>Delete</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* New Lead slide panel */}
                  <AnimatePresence>
                    {showNewLead && (
                      <>
                        <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          onClick={() => setShowNewLead(false)}
                          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
                        <motion.div key="panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          style={{ position: 'fixed', top: 0, right: 0, width: 420, maxWidth: '100vw', height: '100%', background: 'white', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)' }}>
                          <div style={{ background: 'var(--navy)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700, color: 'white' }}>Create New Lead</h3>
                            <button onClick={() => setShowNewLead(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
                          </div>
                          <form onSubmit={createLead} style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
                            {[
                              { label: 'Customer Name *', val: newLeadName, set: setNewLeadName, placeholder: 'Full name', required: true },
                              { label: 'Phone Number *',  val: newLeadPhone, set: setNewLeadPhone, placeholder: '+1 555 000 0000', required: true },
                              { label: 'Product Interest', val: newLeadProduct, set: setNewLeadProduct, placeholder: 'e.g. Bitcoin Diamond', required: false },
                            ].map(f => (
                              <div key={f.label}>
                                <label style={{ ...SECTION_LABEL, display: 'block' }}>{f.label}</label>
                                <input required={f.required} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                                  style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                              </div>
                            ))}
                            <div>
                              <label style={{ ...SECTION_LABEL, display: 'block' }}>Assign to Agent</label>
                              <select value={newLeadAgent} onChange={e => setNewLeadAgent(e.target.value)}
                                style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
                                <option value="">Unassigned</option>
                                {approvedAgents.map(a => <option key={a.user_id} value={a.user_id}>{a.display_name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ ...SECTION_LABEL, display: 'block' }}>Notes</label>
                              <textarea value={newLeadNotes} onChange={e => setNewLeadNotes(e.target.value)}
                                placeholder="Any relevant notes…"
                                style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', minHeight: 90, resize: 'vertical', boxSizing: 'border-box' as const }} />
                            </div>
                            <motion.button type="submit" disabled={creatingLead} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                              style={{ background: 'var(--teal)', color: 'white', border: 'none', padding: '13px', borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                              {creatingLead ? 'Creating…' : 'Create Lead'}
                            </motion.button>
                          </form>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  {/* Import leads modal */}
                  <AnimatePresence>
                    {showImportLeads && (
                      <ImportModal
                        authHeaders={authHeaders()}
                        onClose={() => setShowImportLeads(false)}
                        onImported={(count) => {
                          setShowImportLeads(false)
                          flash(`✓ ${count} leads imported`)
                          load('leads', true)
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Dialer disposition modal */}
                  <AnimatePresence>
                    {showDialerDisposition && currentDialerLead && (
                      <DispositionModal
                        lead={currentDialerLead}
                        agentName={dialerAgentName}
                        onSubmit={handleDialerDisposition}
                        onClose={() => setShowDialerDisposition(false)}
                        submitting={dialerSubmitting}
                      />
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── CREATE AGENT MODAL ───────────────── */}
              <AnimatePresence>
                {showCreateAgent && (
                  <>
                    <motion.div key="ca-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setShowCreateAgent(false)}
                      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
                    <motion.div key="ca-panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      style={{ position: 'fixed', top: 0, right: 0, width: 420, maxWidth: '100vw', height: '100%', background: 'white', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)' }}>
                      <div style={{ background: 'var(--navy)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700, color: 'white' }}>Create Agent Account</h3>
                        <button onClick={() => setShowCreateAgent(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
                      </div>
                      <form onSubmit={createAgent} style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
                        <div>
                          <label style={{ ...SECTION_LABEL, display: 'block' }}>Display Name</label>
                          <input value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="e.g. Aira"
                            style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                        </div>
                        <div>
                          <label style={{ ...SECTION_LABEL, display: 'block' }}>Email *</label>
                          <input required type="email" value={newAgentEmail} onChange={e => setNewAgentEmail(e.target.value)} placeholder="agent@example.com"
                            style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                        </div>
                        <div>
                          <label style={{ ...SECTION_LABEL, display: 'block' }}>Password *</label>
                          <input required type="password" value={newAgentPassword} onChange={e => setNewAgentPassword(e.target.value)} placeholder="Min 8 characters"
                            style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                        </div>
                        {createAgentMsg && (
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: 8 }}>{createAgentMsg}</p>
                        )}
                        <motion.button type="submit" disabled={creatingAgent} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '13px', borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                          {creatingAgent ? 'Creating…' : 'Create & Approve Agent'}
                        </motion.button>
                        <p style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'center', lineHeight: 1.6 }}>
                          Account will be created and immediately approved — no application needed.
                        </p>
                      </form>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* ── COUPONS ─────────────────────────── */}
              {tab === 'coupons' && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--heading)', marginBottom: 24 }}>Coupon Codes</h2>

                  {/* Create form */}
                  <div style={{ background: 'var(--white)', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(9,52,89,0.06)', marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--heading)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Create New Coupon</p>
                    <form onSubmit={async e => {
                      e.preventDefault()
                      if (!newCouponCode.trim() || !newCouponPct) return
                      setCouponSaving(true)
                      const r = await fetch('/api/admin/coupons', {
                        method: 'POST', headers: authHeaders(),
                        body: JSON.stringify({ code: newCouponCode.trim(), discount_pct: Number(newCouponPct), min_spend: Number(newCouponMin || 0) }),
                      })
                      if (r.ok) {
                        setNewCouponCode(''); setNewCouponPct(''); setNewCouponMin('')
                        const d = await fetch('/api/admin/coupons', { headers: authHeaders() }).then(r => r.json())
                        setCoupons(Array.isArray(d) ? d : [])
                        flash('Coupon saved')
                      } else {
                        const err = await r.json(); flash(err.error ?? 'Failed to save')
                      }
                      setCouponSaving(false)
                    }} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px auto', gap: 12, alignItems: 'end' }}>
                      <div>
                        <p style={SECTION_LABEL}>Code</p>
                        <input value={newCouponCode} onChange={e => setNewCouponCode(e.target.value.toUpperCase())}
                          placeholder="e.g. THEMAGA10"
                          style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontWeight: 700, letterSpacing: '0.05em' }} />
                      </div>
                      <div>
                        <p style={SECTION_LABEL}>Discount %</p>
                        <input type="number" min={1} max={100} value={newCouponPct} onChange={e => setNewCouponPct(e.target.value)}
                          placeholder="10"
                          style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <p style={SECTION_LABEL}>Min. Spend ($)</p>
                        <input type="number" min={0} value={newCouponMin} onChange={e => setNewCouponMin(e.target.value)}
                          placeholder="0 (no minimum)"
                          style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <button type="submit" disabled={couponSaving || !newCouponCode.trim() || !newCouponPct}
                        style={{ background: 'var(--teal)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (couponSaving || !newCouponCode.trim() || !newCouponPct) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                        {couponSaving ? 'Saving…' : '+ Add'}
                      </button>
                    </form>
                  </div>

                  {/* Coupon list */}
                  <div style={{ background: 'var(--white)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--gray)' }}>
                          {['Code', 'Discount', 'Min. Spend', 'Availability', ''].map(h => (
                            <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {coupons.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)', fontSize: 14 }}>No global coupons yet. Create one above.</td></tr>
                        )}
                        {coupons.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--gray)' }}>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: 'var(--heading)', background: 'var(--off-white)', padding: '4px 10px', borderRadius: 6 }}>{c.code}</span>
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>{c.discount_pct}% off</span>
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text-mid)' }}>
                              {Number(c.min_spend) > 0 ? `$${Number(c.min_spend).toFixed(2)} minimum` : 'No minimum'}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <button onClick={async () => {
                                const newActive = c.is_used // currently disabled → toggle ON
                                const r = await fetch('/api/admin/coupons', {
                                  method: 'PATCH', headers: authHeaders(),
                                  body: JSON.stringify({ id: c.id, is_active: newActive }),
                                })
                                if (r.ok) {
                                  setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_used: !newActive } : x))
                                  flash(`Coupon ${c.code} ${newActive ? 'enabled' : 'disabled'}`)
                                }
                              }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                                <div style={{ width: 40, height: 22, borderRadius: 11, background: c.is_used ? '#e5e7eb' : '#10b981', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: c.is_used ? 3 : 21, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: c.is_used ? '#6b7280' : '#059669' }}>{c.is_used ? 'Disabled' : 'Active'}</span>
                              </button>
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                              <button onClick={async () => {
                                if (!confirm(`Delete coupon ${c.code}?`)) return
                                await fetch(`/api/admin/coupons?id=${c.id}`, { method: 'DELETE', headers: authHeaders() })
                                setCoupons(prev => prev.filter(x => x.id !== c.id))
                                flash(`Coupon ${c.code} deleted`)
                              }} style={{ background: '#fee2e2', border: 'none', color: '#991b1b', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── LANDING PAGE EDITOR ──────────────── */}
              {tab === 'landing' && (
                <LandingEditor initialConfig={siteConfig} />
              )}

              {/* ── SETTINGS ──────────────────────────── */}
              {tab === 'settings' && (
                <div style={{ maxWidth: 560 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--heading)', marginBottom: 24 }}>Settings</h2>

                  {/* Change password */}
                  <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--gray)', padding: '28px 32px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <i className="fa-solid fa-key" style={{ color: 'var(--teal)', fontSize: 17 }} />
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--heading)', margin: 0 }}>Change Password</h3>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-light)', marginBottom: 20, lineHeight: 1.6 }}>
                      Updates the password for <strong style={{ color: 'var(--text-dark)' }}>{user?.email ?? 'your account'}</strong>. You&rsquo;ll stay signed in here; other devices keep their session until it expires.
                    </p>

                    <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)}
                        placeholder="Current password" autoComplete="current-password" required
                        style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text-dark)' }} />
                      <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                        placeholder="New password (at least 8 characters)" autoComplete="new-password" required
                        style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text-dark)' }} />
                      <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                        placeholder="Confirm new password" autoComplete="new-password" required
                        style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text-dark)' }} />

                      {pwMsg && (
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: pwMsg.ok ? '#15803d' : '#b91c1c' }}>
                          <i className={`fa-solid ${pwMsg.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`} style={{ marginRight: 6 }} />
                          {pwMsg.text}
                        </p>
                      )}

                      <button type="submit" disabled={pwBusy}
                        style={{ background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: pwBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: pwBusy ? 0.65 : 1, alignSelf: 'flex-start' }}>
                        {pwBusy ? 'Updating…' : 'Update Password'}
                      </button>
                    </form>
                  </div>

                  {/* VIP Price */}
                  <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--gray)', padding: '28px 32px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <i className="fa-solid fa-crown" style={{ color: '#f59e0b', fontSize: 18 }} />
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--heading)', margin: 0 }}>VIP Membership Price</h3>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-light)', marginBottom: 20, lineHeight: 1.6 }}>
                      Monthly subscription price charged to VIP members. Currently <strong style={{ color: 'var(--text-dark)' }}>${vipPrice}/month</strong>.
                    </p>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 700, color: 'var(--text-mid)' }}>$</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={vipPriceInput}
                          onChange={e => setVipPriceInput(e.target.value)}
                          style={{ width: 120, border: '2px solid var(--gray)', borderRadius: 8, padding: '12px 14px 12px 28px', fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', outline: 'none', background: 'var(--white)' }}
                        />
                      </div>
                      <span style={{ fontSize: 14, color: 'var(--text-light)', fontWeight: 600 }}>/month</span>
                      <button
                        onClick={async () => {
                          const parsed = parseFloat(vipPriceInput)
                          if (isNaN(parsed) || parsed <= 0) { flash('Enter a valid price'); return }
                          setSavingVipPrice(true)
                          const r = await fetch('/api/admin/site-config', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', ...authHeaders() },
                            body: JSON.stringify({ key: 'vip_price', value: parsed }),
                          })
                          setSavingVipPrice(false)
                          if (r.ok) { setVipPrice(parsed); flash(`VIP price updated to $${parsed}/month`) }
                          else flash('Failed to save price')
                        }}
                        disabled={savingVipPrice}
                        style={{ background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: savingVipPrice ? 'not-allowed' : 'pointer', opacity: savingVipPrice ? 0.6 : 1, fontFamily: 'inherit' }}>
                        {savingVipPrice ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 12 }}>
                      This price takes effect immediately for all new subscriptions.
                    </p>
                  </div>

                  {/* Bank Transfer (Wire) */}
                  <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--gray)', padding: '28px 32px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <i className="fa-solid fa-building-columns" style={{ color: 'var(--teal)', fontSize: 18 }} />
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--heading)', margin: 0 }}>Bank Transfer (Wire)</h3>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-light)', marginBottom: 20, lineHeight: 1.6 }}>
                      Let customers pay by bank wire. When enabled, a <strong>Bank Transfer</strong> option appears at checkout showing these details. Those orders arrive as <strong>Pending Payment</strong> — confirm each with <strong>Mark as Paid</strong> in the Orders tab once the funds land.
                    </p>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={wireForm.enabled} onChange={e => setWireForm({ ...wireForm, enabled: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>Enable bank transfer at checkout</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer', background: wireForm.maintenance ? '#fffbeb' : 'transparent', border: `1px solid ${wireForm.maintenance ? '#fde68a' : 'transparent'}`, borderRadius: 8, padding: wireForm.maintenance ? '10px 12px' : '0' }}>
                      <input type="checkbox" checked={wireForm.maintenance} onChange={e => setWireForm({ ...wireForm, maintenance: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2 }} />
                      <span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: wireForm.maintenance ? '#b45309' : 'var(--text-dark)', display: 'block' }}>
                          <i className="fa-solid fa-screwdriver-wrench" style={{ marginRight: 7 }} />
                          Put the “Place Order” button under maintenance
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-light)', lineHeight: 1.5 }}>Bank transfer still shows, but customers see an “under maintenance” notice and cannot place orders until you switch this off.</span>
                      </span>
                    </label>

                    <div style={{ display: 'grid', gap: 12 }}>
                      {/* Same order and wording customers see — so these can be
                          filled straight off the bank's account details page */}
                      {([
                        { key: 'accountName',   label: 'Account Name',                      ph: 'Name on the account' },
                        { key: 'accountType',   label: 'Account type',                      ph: 'e.g. Checking' },
                        { key: 'routingNumber', label: 'Routing number (for wire and ACH)', ph: 'Routing number' },
                        { key: 'accountNumber', label: 'Account number',                    ph: 'Account or IBAN number' },
                        { key: 'bankAddress',   label: 'Address',                           ph: 'Bank address' },
                        { key: 'swift',         label: 'Swift/BIC',                         ph: 'For international wires' },
                        { key: 'memoNote',      label: 'Memo / Note — shown as a separate reminder, not a bank row', ph: 'e.g. Include your order number' },
                      ] as { key: 'bankAddress' | 'accountName' | 'accountNumber' | 'accountType' | 'routingNumber' | 'swift' | 'memoNote'; label: string; ph: string }[]).map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                          <input value={wireForm[f.key]} onChange={e => setWireForm({ ...wireForm, [f.key]: e.target.value })} placeholder={f.ph}
                            style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: 'var(--text-dark)', outline: 'none', background: 'var(--white)', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={async () => {
                        if (wireForm.enabled && !wireForm.accountNumber.trim()) { flash('Add an account number before enabling'); return }
                        setSavingWire(true)
                        const r = await fetch('/api/admin/site-config', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', ...authHeaders() },
                          body: JSON.stringify({ key: 'wire_config', value: wireForm }),
                        })
                        setSavingWire(false)
                        if (r.ok) flash(wireForm.enabled ? 'Bank transfer saved & enabled' : 'Bank transfer details saved')
                        else flash('Failed to save bank details')
                      }}
                      disabled={savingWire}
                      style={{ marginTop: 20, background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: savingWire ? 'not-allowed' : 'pointer', opacity: savingWire ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {savingWire ? 'Saving…' : 'Save Bank Details'}
                    </button>
                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 12 }}>
                      Changes take effect immediately — no redeploy needed. Any field left blank is hidden from customers.
                    </p>
                  </div>

                  {/* Pay Link (hosted checkout, e.g. Wise) */}
                  <div style={{ background: 'var(--white)', border: '1px solid var(--gray)', borderRadius: 12, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <i className="fa-solid fa-link" style={{ color: '#16a34a' }} />
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--heading)', margin: 0 }}>Pay Link (hosted checkout)</h3>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-light)', lineHeight: 1.6, marginBottom: 18 }}>
                      Replaces the bank details with a <strong>Pay</strong> button that sends the customer to an outside
                      payment page. Each link charges a <strong>fixed amount</strong>, so the button only appears when the
                      cart matches one of the links below exactly — same product, same total. Anything else — a different
                      product, an unlisted quantity, a VIP or coupon discount — falls back to bank transfer so nobody is
                      charged the wrong sum.
                    </p>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={payLinkForm.enabled} onChange={e => setPayLinkForm({ ...payLinkForm, enabled: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>Enable pay links at checkout</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer', background: payLinkForm.hideAddToCart ? '#eff6ff' : 'transparent', border: `1px solid ${payLinkForm.hideAddToCart ? '#bfdbfe' : 'transparent'}`, borderRadius: 8, padding: payLinkForm.hideAddToCart ? '10px 12px' : '0' }}>
                      <input type="checkbox" checked={payLinkForm.hideAddToCart} onChange={e => setPayLinkForm({ ...payLinkForm, hideAddToCart: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2 }} />
                      <span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: payLinkForm.hideAddToCart ? '#1d4ed8' : 'var(--text-dark)', display: 'block' }}>
                          One product at a time (hide &ldquo;Add to Cart&rdquo;)
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-light)', lineHeight: 1.5, display: 'block', marginTop: 3 }}>
                          Hides every Add to Cart button <em>and the cart icon in the header</em>. <strong>Buy Now</strong>
                          replaces the cart with that one item and goes straight to checkout, so the total always matches
                          one of the links below.
                        </span>
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer', background: payLinkForm.hidePromos ? '#eff6ff' : 'transparent', border: `1px solid ${payLinkForm.hidePromos ? '#bfdbfe' : 'transparent'}`, borderRadius: 8, padding: payLinkForm.hidePromos ? '10px 12px' : '0' }}>
                      <input type="checkbox" checked={payLinkForm.hidePromos} onChange={e => setPayLinkForm({ ...payLinkForm, hidePromos: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2 }} />
                      <span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: payLinkForm.hidePromos ? '#1d4ed8' : 'var(--text-dark)', display: 'block' }}>
                          Hide all coupon &amp; VIP mentions
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-light)', lineHeight: 1.5, display: 'block', marginTop: 3 }}>
                          Removes the promo-code box at checkout, the VIP header links, VIP prices on products, the FAQ
                          discount answer and the loyalty panels. Discounts move totals off the fixed link amounts, so
                          leave this on while pay links are live. Nothing is deleted — coupons and VIP still work in admin.
                        </span>
                      </span>
                    </label>

                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--heading)', marginBottom: 4 }}>Payment links</p>
                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>
                      One link per price. A product with 1 / 3 / 10-piece bundles needs three separate links.
                    </p>

                    {payLinkForm.links.length === 0 && (
                      <p style={{ fontSize: 13, color: 'var(--text-light)', fontStyle: 'italic', padding: '14px 0' }}>
                        No links yet — add one below.
                      </p>
                    )}

                    {payLinkForm.links.map((ln, i) => (
                      <div key={i} style={{ border: '1.5px solid var(--gray)', borderRadius: 10, padding: 14, marginBottom: 12, background: 'var(--off-white)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Link {i + 1}</span>
                          <button type="button"
                            onClick={() => setPayLinkForm(f => ({ ...f, links: f.links.filter((_, idx) => idx !== i) }))}
                            style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Remove
                          </button>
                        </div>
                        <div style={{ display: 'grid', gap: 10 }}>
                          <select value={ln.productId}
                            onChange={e => setPayLinkForm(f => ({ ...f, links: f.links.map((l, idx) => idx === i ? { ...l, productId: e.target.value } : l) }))}
                            style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 8, padding: '10px 12px', fontSize: 13.5, color: 'var(--text-dark)', outline: 'none', background: 'var(--white)', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer' }}>
                            <option value="">— Any product (not recommended) —</option>
                            {payLinkProducts.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <input type="number" step="0.01" min="0" value={ln.amount || ''} placeholder="Exact total this link collects, e.g. 599"
                            onChange={e => setPayLinkForm(f => ({ ...f, links: f.links.map((l, idx) => idx === i ? { ...l, amount: Number(e.target.value) } : l) }))}
                            style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 8, padding: '10px 12px', fontSize: 13.5, color: 'var(--text-dark)', outline: 'none', background: 'var(--white)', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                          <input value={ln.url} placeholder="https://wise.com/pay/r/…"
                            onChange={e => setPayLinkForm(f => ({ ...f, links: f.links.map((l, idx) => idx === i ? { ...l, url: e.target.value } : l) }))}
                            style={{ width: '100%', border: `2px solid ${ln.url && !isSafePayLinkUrl(ln.url) ? '#fca5a5' : 'var(--gray)'}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text-dark)', outline: 'none', background: 'var(--white)', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                        </div>
                      </div>
                    ))}

                    <button type="button"
                      onClick={() => setPayLinkForm(f => ({ ...f, links: [...f.links, { productId: '', amount: 0, url: '' }] }))}
                      style={{ background: 'var(--off-white)', border: '2px dashed var(--gray)', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18 }}>
                      + Add another link
                    </button>

                    <div style={{ display: 'grid', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', display: 'block', marginBottom: 5 }}>Button label</label>
                        <input value={payLinkForm.label} onChange={e => setPayLinkForm({ ...payLinkForm, label: e.target.value })} placeholder="Pay"
                          style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: 'var(--text-dark)', outline: 'none', background: 'var(--white)', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', display: 'block', marginBottom: 5 }}>Note shown to the customer</label>
                        <input value={payLinkForm.note} onChange={e => setPayLinkForm({ ...payLinkForm, note: e.target.value })} placeholder="Leave blank for the default wording"
                          style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: 'var(--text-dark)', outline: 'none', background: 'var(--white)', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const badLink = payLinkForm.links.find(l => !isSafePayLinkUrl(l.url) || !(l.amount > 0))
                        if (payLinkForm.enabled && payLinkForm.links.length === 0) {
                          flash('Add at least one payment link before enabling'); return
                        }
                        if (badLink) {
                          flash('Every link needs a valid https:// URL and an amount above 0'); return
                        }
                        setSavingPayLink(true)
                        const r = await fetch('/api/admin/site-config', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', ...authHeaders() },
                          body: JSON.stringify({ key: 'pay_link', value: payLinkForm }),
                        })
                        setSavingPayLink(false)
                        if (r.ok) flash(payLinkForm.enabled ? 'Pay link saved & enabled' : 'Pay link saved')
                        else flash('Failed to save pay link')
                      }}
                      disabled={savingPayLink}
                      style={{ marginTop: 20, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: savingPayLink ? 'not-allowed' : 'pointer', opacity: savingPayLink ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {savingPayLink ? 'Saving…' : 'Save Pay Link'}
                    </button>
                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 12, lineHeight: 1.6 }}>
                      Orders still arrive as <strong>Verifying Payment</strong> — the customer pays outside the site, so you
                      confirm the money landed and hit <strong>Mark as Paid</strong> to place the order.
                    </p>
                  </div>
                </div>
              )}

              {/* ── RFS PORTAL ─────────────────────────────────── */}
              {tab === 'rfs' && (
                <RFSTab authHeaders={authHeaders} />
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── ORDER DETAIL DRAWER ──────────────────────────────── */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div key="order-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }} />
            <motion.div key="order-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              style={{ position: 'fixed', top: 0, right: 0, width: 460, maxWidth: '100vw', height: '100%', background: D.card, zIndex: 301, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)' }}>
              {/* Header */}
              <div style={{ background: 'var(--navy)', padding: '20px 24px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700 }}>Order Details</h3>
                    <p style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.6, marginTop: 4 }}>#{selectedOrder.id}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              </div>
              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, background: D.drawerBg }}>
                {/* Customer */}
                <div>
                  <p style={{ ...SECTION_LABEL, color: D.muted }}>Customer</p>
                  <div style={{ background: D.card, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: D.text }}>{selectedOrder.customer_name ?? 'Guest Order'}</p>
                    {(selectedOrder.customer_email || selectedOrder.guest_email) && (
                      <p style={{ fontSize: 13, color: D.muted }}>
                        <i className="fa-solid fa-envelope" style={{ marginRight: 6, opacity: 0.5 }} />
                        {selectedOrder.customer_email ?? selectedOrder.guest_email}
                        {!selectedOrder.customer_email && <span style={{ fontSize: 11, color: D.muted, marginLeft: 6 }}>(guest)</span>}
                      </p>
                    )}
                    {selectedOrder.customer_phone && <p style={{ fontSize: 13, color: D.muted }}><i className="fa-solid fa-phone" style={{ marginRight: 6, opacity: 0.5 }} />{selectedOrder.customer_phone}</p>}
                    {selectedOrder.customer_city  && <p style={{ fontSize: 13, color: D.muted }}><i className="fa-solid fa-location-dot" style={{ marginRight: 6, opacity: 0.5 }} />{selectedOrder.customer_city}</p>}
                    {selectedOrder.customer_address && <p style={{ fontSize: 13, color: D.muted }}>{selectedOrder.customer_address}</p>}
                  </div>
                </div>

                {/* Shipping Address */}
                {selectedOrder.shipping_address && (
                  <div>
                    <p style={{ ...SECTION_LABEL, color: D.muted }}>Shipping Address</p>
                    <div style={{ background: D.card, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {(selectedOrder.shipping_address.firstName || selectedOrder.shipping_address.lastName) && (
                        <p style={{ fontWeight: 700, fontSize: 14, color: D.text }}>
                          {[selectedOrder.shipping_address.firstName, selectedOrder.shipping_address.lastName].filter(Boolean).join(' ')}
                        </p>
                      )}
                      {selectedOrder.shipping_address.address && (
                        <p style={{ fontSize: 13, color: D.muted }}>
                          {selectedOrder.shipping_address.address}
                          {selectedOrder.shipping_address.apartment ? `, ${selectedOrder.shipping_address.apartment}` : ''}
                        </p>
                      )}
                      {(selectedOrder.shipping_address.city || selectedOrder.shipping_address.region || selectedOrder.shipping_address.postalCode) && (
                        <p style={{ fontSize: 13, color: D.muted }}>
                          {[selectedOrder.shipping_address.city, selectedOrder.shipping_address.region, selectedOrder.shipping_address.postalCode].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {selectedOrder.shipping_address.country && (
                        <p style={{ fontSize: 13, color: D.muted }}>{selectedOrder.shipping_address.country}</p>
                      )}
                      {selectedOrder.shipping_address.phone && (
                        <p style={{ fontSize: 13, color: D.muted }}>
                          <i className="fa-solid fa-phone" style={{ marginRight: 6, opacity: 0.5 }} />
                          {selectedOrder.shipping_address.phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div>
                  <p style={{ ...SECTION_LABEL, color: D.muted }}>Items ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: D.card, borderRadius: 10 }}>
                        {item.img && <img src={item.img} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{item.name}</p>
                          <p style={{ fontSize: 11, color: D.muted }}>{item.bundle_label ?? `×${item.qty}`}</p>
                        </div>
                        <p style={{ fontWeight: 700, fontSize: 14, flexShrink: 0, color: D.text }}>
                          ${(item.bundle_price != null ? item.bundle_price : item.price * item.qty).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amounts */}
                <div style={{ background: D.card, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: D.muted }}>Subtotal</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>${(Number(selectedOrder.total) + Number(selectedOrder.discount_amount ?? 0)).toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount_amount ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#059669' }}>
                        Discount {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ''}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>-${Number(selectedOrder.discount_amount).toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${D.border}`, marginTop: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: D.text }}>Total</span>
                    <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--teal)' }}>${Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Bank-transfer receipt */}
                {(selectedOrder.payment_method === 'wire' || selectedOrder.receipt_url) && (
                  <div>
                    <p style={{ ...SECTION_LABEL, color: D.muted }}>Payment Receipt</p>
                    {selectedOrder.receipt_signed_url ? (
                      <div>
                        {selectedOrder.receipt_url?.toLowerCase().endsWith('.pdf') ? (
                          <a href={selectedOrder.receipt_signed_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: D.drawerBg, border: `1.5px solid ${D.border}`, borderRadius: 10, padding: '12px 16px', color: 'var(--teal)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                            <i className="fa-solid fa-file-pdf" /> View receipt (PDF)
                          </a>
                        ) : (
                          <a href={selectedOrder.receipt_signed_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={selectedOrder.receipt_signed_url} alt="Payment receipt"
                              style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 10, border: `1.5px solid ${D.border}`, background: D.drawerBg }} />
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--teal)', fontWeight: 700, fontSize: 13 }}>
                              <i className="fa-solid fa-up-right-from-square" /> Open full size
                            </span>
                          </a>
                        )}
                        <p style={{ fontSize: 12, color: '#15803d', fontWeight: 700, marginTop: 8 }}>
                          <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} /> Receipt uploaded — review it before marking the order as paid.
                        </p>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: D.muted, background: D.drawerBg, border: `1.5px dashed ${D.border}`, borderRadius: 10, padding: '14px 16px' }}>
                        <i className="fa-solid fa-hourglass-half" style={{ marginRight: 7 }} /> No receipt uploaded yet.
                      </p>
                    )}
                  </div>
                )}

                {/* Awaiting bank transfer — one-click confirm */}
                {selectedOrder.status === 'pending_payment' && (
                  <div style={{ background: '#fff8ec', border: '1.5px solid #fcd9a3', borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>
                      <i className="fa-solid fa-building-columns" style={{ marginRight: 7 }} />
                      Awaiting bank transfer
                    </p>
                    <p style={{ fontSize: 12, color: '#9a3412', marginBottom: 12, lineHeight: 1.5 }}>
                      Confirm once the wire for <strong>${Number(selectedOrder.total).toFixed(2)}</strong> (Ref #{selectedOrder.order_number ?? selectedOrder.id?.slice(0, 5).toUpperCase()}) has landed.
                    </p>
                    <button onClick={() => updateOrderStatus(selectedOrder.id!, 'paid')}
                      style={{ width: '100%', background: '#15803d', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700, padding: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <i className="fa-solid fa-check" /> Mark as Paid
                    </button>
                  </div>
                )}

                {/* Status update */}
                <div>
                  <p style={{ ...SECTION_LABEL, color: D.muted }}>Update Status</p>
                  <select value={selectedOrder.status ?? 'pending'}
                    onChange={e => updateOrderStatus(selectedOrder.id!, e.target.value)}
                    style={{ width: '100%', border: `2px solid ${D.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: D.inputBg, color: D.text }}>
                    {['paid', 'pending_payment', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <p style={{ fontSize: 12, color: D.muted }}>
                  <i className="fa-solid fa-clock" style={{ marginRight: 6 }} />
                  Placed {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : '—'}
                </p>

                {/* Delete this order (e.g. test orders) */}
                <button
                  onClick={async () => {
                    if (!confirm(`Delete order #${selectedOrder.order_number ?? selectedOrder.id?.slice(0, 5).toUpperCase()}? This permanently removes it and cannot be undone.`)) return
                    const res = await fetch(`/api/admin/orders?id=${selectedOrder.id}`, { method: 'DELETE', headers: authHeaders() })
                    if (res.ok) {
                      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id))
                      setSelectedOrder(null)
                      flash('✓ Order deleted')
                    } else {
                      flash('Failed to delete order')
                    }
                  }}
                  style={{ width: '100%', marginTop: 8, background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <i className="fa-solid fa-trash-can" /> Delete Order
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── LEAD DETAIL DRAWER (admin) ───────────────────────── */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div key="lead-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }} />
            <motion.div key="lead-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              style={{ position: 'fixed', top: 0, right: 0, width: 440, maxWidth: '100vw', height: '100%', background: D.card, zIndex: 301, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)' }}>
              {/* Header */}
              <div style={{ background: 'var(--navy)', padding: '20px 24px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700 }}>{selectedLead.customer_name}</h3>
                    <p style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{selectedLead.customer_phone}</p>
                  </div>
                  <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              </div>
              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: D.drawerBg }}>

                {/* Status */}
                <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    <i className="fa-solid fa-circle-dot" style={{ marginRight: 6, color: 'var(--teal)' }} />
                    Status
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(STATUS_COLORS).map(([k, v]) => (
                      <button key={k} disabled={updatingLead}
                        onClick={() => patchLead(selectedLead.id, { status: k })}
                        style={{
                          padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          border: selectedLead.status === k ? `2px solid ${v.text}` : `2px solid ${D.border}`,
                          background: selectedLead.status === k ? v.bg : D.btnBg,
                          color: selectedLead.status === k ? v.text : D.text,
                        }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    <i className="fa-solid fa-note-sticky" style={{ marginRight: 6, color: 'var(--teal)' }} />
                    Notes
                  </p>
                  <textarea value={leadNoteText} onChange={e => setLeadNoteText(e.target.value)}
                    placeholder="Add call notes here…"
                    style={{ width: '100%', border: `2px solid ${D.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 100, boxSizing: 'border-box' as const, color: D.text, background: D.inputBg, lineHeight: 1.5 }} />
                  <button disabled={updatingLead}
                    onClick={() => patchLead(selectedLead.id, { notes: leadNoteText })}
                    style={{ marginTop: 10, background: 'var(--navy)', color: 'white', border: 'none', padding: '10px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-floppy-disk" />
                    {updatingLead ? 'Saving…' : 'Save Notes'}
                  </button>
                </div>

                {/* Follow-up date */}
                <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    <i className="fa-solid fa-calendar-days" style={{ marginRight: 6, color: '#7c3aed' }} />
                    Follow-up Date
                  </p>
                  <input type="date" value={leadFollowUpDate} onChange={e => setLeadFollowUpDate(e.target.value)}
                    style={{ width: '100%', border: `2px solid ${D.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, color: D.text, background: D.inputBg }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button disabled={updatingLead}
                      onClick={() => patchLead(selectedLead.id, { follow_up_date: leadFollowUpDate || null })}
                      style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fa-solid fa-calendar-check" />
                      Save Date
                    </button>
                    {leadFollowUpDate && (
                      <button disabled={updatingLead}
                        onClick={() => { setLeadFollowUpDate(''); patchLead(selectedLead.id, { follow_up_date: null }) }}
                        style={{ background: D.btnBg, color: D.text, border: `2px solid ${D.border}`, padding: '10px 16px', borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Meta */}
                {(selectedLead.product_interest || selectedLead.agent_profiles?.display_name) && (
                  <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedLead.product_interest && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                          <i className="fa-solid fa-tag" style={{ marginRight: 6, color: 'var(--gold)' }} />
                          Product Interest
                        </p>
                        <p style={{ fontSize: 14, color: D.text, fontWeight: 600 }}>{selectedLead.product_interest}</p>
                      </div>
                    )}
                    {selectedLead.agent_profiles?.display_name && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                          <i className="fa-solid fa-user-tie" style={{ marginRight: 6, color: 'var(--teal)' }} />
                          Assigned Agent
                        </p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)' }}>{selectedLead.agent_profiles.display_name}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact & Location */}
                {(selectedLead.customer_email || selectedLead.billing_address || selectedLead.billing_city) && (
                  <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      <i className="fa-solid fa-address-card" style={{ marginRight: 6, color: 'var(--teal)' }} />
                      Contact &amp; Location
                    </p>
                    {selectedLead.customer_email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-envelope" style={{ fontSize: 12, color: D.muted, width: 14 }} />
                        <span style={{ fontSize: 13, color: D.text, fontFamily: 'monospace' }}>{selectedLead.customer_email}</span>
                      </div>
                    )}
                    {(selectedLead.billing_address || selectedLead.billing_city) && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <i className="fa-solid fa-location-dot" style={{ fontSize: 12, color: D.muted, width: 14, marginTop: 2 }} />
                        <div>
                          {selectedLead.billing_address && <p style={{ fontSize: 13, color: D.text, margin: 0 }}>{selectedLead.billing_address}</p>}
                          {(selectedLead.billing_city || selectedLead.billing_province || selectedLead.billing_zip) && (
                            <p style={{ fontSize: 13, color: D.muted, margin: '2px 0 0' }}>
                              {[selectedLead.billing_city, selectedLead.billing_province, selectedLead.billing_zip].filter(Boolean).join(', ')}
                              {selectedLead.billing_country ? ` · ${selectedLead.billing_country}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Call History */}
                <div style={{ background: D.card, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: D.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                    <i className="fa-solid fa-phone-volume" style={{ marginRight: 6, color: '#7c3aed' }} />
                    Call History ({callHistory.length})
                  </p>
                  {callHistoryLoading ? (
                    <p style={{ fontSize: 13, color: D.muted }}>Loading…</p>
                  ) : callHistory.length === 0 ? (
                    <p style={{ fontSize: 13, color: D.muted }}>No calls logged yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {callHistory.map(log => {
                        const disp = DISPOSITIONS.find(d => d.value === log.disposition)
                        return (
                          <div key={log.id} style={{ borderRadius: 10, border: `1.5px solid ${D.border}`, padding: '11px 14px', background: D.drawerBg }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: log.notes ? 8 : 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {disp && (
                                  <span style={{ background: disp.bg, color: disp.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                                    <i className={`fa-solid ${disp.icon}`} style={{ fontSize: 10 }} />
                                    {disp.label}
                                  </span>
                                )}
                                {!disp && (
                                  <span style={{ background: D.btnBg, color: D.muted, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                                    {log.disposition.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: 11, color: D.muted, whiteSpace: 'nowrap' }}>
                                {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                              <i className="fa-solid fa-user-headset" style={{ fontSize: 11, color: D.muted }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: log.agent_name ? 'var(--teal)' : D.muted }}>
                                {log.agent_name || 'Unknown caller'}
                              </span>
                            </div>
                            {log.notes && (
                              <p style={{ fontSize: 12, color: D.muted, marginTop: 6, lineHeight: 1.5, paddingTop: 6, borderTop: `1px solid ${D.border}` }}>
                                {log.notes}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <p style={{ fontSize: 12, color: D.muted, padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-clock" />
                  Created {selectedLead.created_at ? new Date(selectedLead.created_at).toLocaleString() : '—'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
