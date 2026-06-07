'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import { Product, Order, Profile, AgentProfile, AnalyticsData, CustomerTierRow, Lead } from '@/lib/types'
import { SiteConfig, DEFAULT_CONFIG } from '@/lib/site-config'
import { getBrowserSupabase } from '@/lib/supabase-browser'

const AdminCharts   = dynamic(() => import('@/components/AdminCharts'),  { ssr: false })
const LandingEditor = dynamic(() => import('@/components/LandingEditor'), { ssr: false })

export default function AdminPage() {
  return (
    <AuthGuard adminOnly>
      <AdminContent />
    </AuthGuard>
  )
}

type Tab = 'overview' | 'products' | 'orders' | 'customers' | 'agents' | 'sales' | 'agent-performance' | 'landing' | 'leads' | 'coupons'

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

function AdminContent() {
  const { profile, session, signOut } = useAuth()
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

  // New lead form
  const [showNewLead, setShowNewLead]       = useState(false)
  const [newLeadName, setNewLeadName]       = useState('')
  const [newLeadPhone, setNewLeadPhone]     = useState('')
  const [newLeadProduct, setNewLeadProduct] = useState('')
  const [newLeadAgent, setNewLeadAgent]     = useState('')
  const [newLeadNotes, setNewLeadNotes]     = useState('')
  const [creatingLead, setCreatingLead]     = useState(false)

  // Coupons
  const [coupons, setCoupons]             = useState<{ id: string; code: string; discount_pct: number; min_spend: number }[]>([])
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

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('')

  const authHeaders = useCallback((): HeadersInit => ({
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
    'Content-Type': 'application/json',
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
  }, [authHeaders])

  useEffect(() => { load(tab) }, [tab, load])

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

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview',          icon: 'fa-chart-line',   label: 'Overview' },
    { id: 'products',          icon: 'fa-box',          label: 'Products' },
    { id: 'orders',            icon: 'fa-receipt',      label: 'Orders' },
    { id: 'customers',         icon: 'fa-users',        label: 'Customers' },
    { id: 'agents',            icon: 'fa-headset',      label: 'Agents' },
    { id: 'sales',             icon: 'fa-chart-pie',    label: 'Sales' },
    { id: 'agent-performance', icon: 'fa-ranking-star', label: 'Agent Performance' },
    { id: 'leads',             icon: 'fa-phone',        label: 'Leads' },
    { id: 'coupons',           icon: 'fa-tag',          label: 'Coupons' },
    { id: 'landing',           icon: 'fa-paintbrush',   label: 'Landing Page' },
  ]

  const pendingAgents      = agents.filter(a => a.status === 'pending').length
  const revenue            = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total), 0)
  const platinumCustomers: CustomerTierRow[] = analytics?.customerTiers.filter(c => c.tier === 'platinum') ?? []
  const filteredCustomers  = customers.filter(c =>
    !customerSearch ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const ORDER_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    paid:      { bg: '#dcfce7', text: '#15803d' },
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
                        <StatCard label="This Month Revenue" value={`$${analytics.revenueThisMonth.toFixed(0)}`} icon="fa-chart-line" color="#d97706" delay={0.25} />
                        <StatCard label="This Month Orders"  value={analytics.ordersThisMonth}                   icon="fa-calendar"   color="#0369a1" delay={0.3} />
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
                              <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-mid)' }}>{o.id?.slice(0, 8)}…</td>
                              <td style={{ padding: '12px 14px' }}>
                                <p style={{ fontWeight: 600, fontSize: 13 }}>{o.customer_name ?? 'Guest'}</p>
                                {o.customer_email && <p style={{ fontSize: 11, color: 'var(--text-light)' }}>{o.customer_email}</p>}
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: 13 }}>{Array.isArray(o.items) ? o.items.length : 0} items</td>
                              <td style={{ padding: '12px 14px', fontWeight: 700 }}>${Number(o.total).toFixed(2)}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#059669' }}>{o.discount_amount ? `-$${Number(o.discount_amount).toFixed(2)}` : '—'}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.text, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{o.status}</span>
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

              {/* ── AGENTS ───────────────────────────────── */}
              {tab === 'agents' && (
                <div>
                  <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)', marginBottom: 20 }}>
                    Agent Applications ({agents.length})
                    {pendingAgents > 0 && <span style={{ fontSize: 14, fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 20, marginLeft: 12 }}>{pendingAgents} pending</span>}
                  </h2>
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
                    <StatCard label="Active Agents"        value={analytics.agentStats.length}                                             icon="fa-headset"      color="var(--teal)" />
                    <StatCard label="Total Referred Orders" value={analytics.agentStats.reduce((s, a) => s + a.orders, 0)}                  icon="fa-receipt"      color="var(--navy)" />
                    <StatCard label="Referred Revenue"     value={`$${analytics.agentStats.reduce((s, a) => s + a.revenue, 0).toFixed(0)}`} icon="fa-dollar-sign"  color="#059669" />
                    <StatCard label="Total Leads"          value={analytics.agentStats.reduce((s, a) => s + (a.total_leads ?? 0), 0)}       icon="fa-users"        color="#7c3aed" delay={0.05} />
                    <StatCard label="Converted Leads"      value={analytics.agentStats.reduce((s, a) => s + (a.converted_leads ?? 0), 0)}   icon="fa-circle-check" color="#059669" delay={0.1} />
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
                          {['Agent', 'Total Leads', 'Converted', 'Lead Rate', 'Orders', 'Revenue', 'Avg. Order'].map(h => (
                            <th key={h} style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.agentStats.map(a => (
                          <tr key={a.user_id} style={{ borderBottom: '1px solid var(--gray)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{a.display_name}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{a.total_leads ?? 0}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#059669' }}>{a.converted_leads ?? 0}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                                background: (a.lead_conversion_rate ?? 0) >= 50 ? '#d1fae5' : (a.lead_conversion_rate ?? 0) >= 20 ? '#fef9c3' : 'var(--gray)',
                                color: (a.lead_conversion_rate ?? 0) >= 50 ? '#065f46' : (a.lead_conversion_rate ?? 0) >= 20 ? '#854d0e' : 'var(--text-mid)' }}>
                                {a.lead_conversion_rate ?? 0}%
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{a.orders}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#059669' }}>${a.revenue.toFixed(2)}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-mid)' }}>{a.orders > 0 ? `$${(a.revenue / a.orders).toFixed(2)}` : '—'}</td>
                          </tr>
                        ))}
                        {analytics.agentStats.length === 0 && (
                          <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>No approved agents yet.</td></tr>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 900, color: 'var(--heading)' }}>Lead Management</h2>
                    <motion.button onClick={() => setShowNewLead(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{ background: 'var(--teal)', color: 'white', border: 'none', padding: '11px 22px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fa-solid fa-plus" /> New Lead
                    </motion.button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16, marginBottom: 24 }}>
                    <StatCard label="Total Leads"    value={leads.length}                                                    icon="fa-users"        color="var(--navy)" />
                    <StatCard label="New / Assigned" value={leads.filter(l => ['new','assigned'].includes(l.status)).length} icon="fa-phone"        color="var(--teal)"  delay={0.05} />
                    <StatCard label="Follow Ups"     value={leads.filter(l => l.status === 'follow_up').length}              icon="fa-clock"        color="#7c3aed"      delay={0.1} />
                    <StatCard label="Converted"      value={leads.filter(l => l.status === 'converted').length}              icon="fa-circle-check" color="#059669"      delay={0.15} />
                    <StatCard label="Unassigned"     value={leads.filter(l => !l.agent_id).length}                          icon="fa-user-slash"   color="#d97706"      delay={0.2} />
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
                        {leads.map(l => {
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
                </div>
              )}

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
                          {['Code', 'Discount', 'Min. Spend', 'Usage', ''].map(h => (
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
                              <span style={{ fontSize: 12, fontWeight: 700, background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20 }}>Unlimited</span>
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
              style={{ position: 'fixed', top: 0, right: 0, width: 460, maxWidth: '100vw', height: '100%', background: 'white', zIndex: 301, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)' }}>
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
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Customer */}
                <div>
                  <p style={SECTION_LABEL}>Customer</p>
                  <div style={{ background: 'var(--off-white)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{selectedOrder.customer_name ?? 'Guest Order'}</p>
                    {(selectedOrder.customer_email || selectedOrder.guest_email) && (
                      <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>
                        <i className="fa-solid fa-envelope" style={{ marginRight: 6, opacity: 0.5 }} />
                        {selectedOrder.customer_email ?? selectedOrder.guest_email}
                        {!selectedOrder.customer_email && <span style={{ fontSize: 11, color: 'var(--text-light)', marginLeft: 6 }}>(guest)</span>}
                      </p>
                    )}
                    {selectedOrder.customer_phone && <p style={{ fontSize: 13, color: 'var(--text-mid)' }}><i className="fa-solid fa-phone" style={{ marginRight: 6, opacity: 0.5 }} />{selectedOrder.customer_phone}</p>}
                    {selectedOrder.customer_city  && <p style={{ fontSize: 13, color: 'var(--text-mid)' }}><i className="fa-solid fa-location-dot" style={{ marginRight: 6, opacity: 0.5 }} />{selectedOrder.customer_city}</p>}
                    {selectedOrder.customer_address && <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>{selectedOrder.customer_address}</p>}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <p style={SECTION_LABEL}>Items ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--off-white)', borderRadius: 10 }}>
                        {item.img && <img src={item.img} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-light)' }}>{item.bundle_label ?? `×${item.qty}`}</p>
                        </div>
                        <p style={{ fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          ${(item.bundle_price != null ? item.bundle_price : item.price * item.qty).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amounts */}
                <div style={{ background: 'var(--off-white)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>Subtotal</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>${(Number(selectedOrder.total) + Number(selectedOrder.discount_amount ?? 0)).toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount_amount ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#059669' }}>
                        Discount {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ''}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>-${Number(selectedOrder.discount_amount).toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--gray)', marginTop: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
                    <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--heading)' }}>${Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Status update */}
                <div>
                  <p style={SECTION_LABEL}>Update Status</p>
                  <select value={selectedOrder.status ?? 'pending'}
                    onChange={e => updateOrderStatus(selectedOrder.id!, e.target.value)}
                    style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                    {['paid', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  <i className="fa-solid fa-clock" style={{ marginRight: 6 }} />
                  Placed {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : '—'}
                </p>
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
              style={{ position: 'fixed', top: 0, right: 0, width: 440, maxWidth: '100vw', height: '100%', background: 'white', zIndex: 301, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.15)' }}>
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
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Status */}
                <div>
                  <p style={SECTION_LABEL}>Status</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(STATUS_COLORS).map(([k, v]) => (
                      <button key={k} disabled={updatingLead}
                        onClick={() => patchLead(selectedLead.id, { status: k })}
                        style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                          background: selectedLead.status === k ? v.bg : 'var(--gray)',
                          color: selectedLead.status === k ? v.text : 'var(--text-mid)' }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p style={SECTION_LABEL}>Notes</p>
                  <textarea value={leadNoteText} onChange={e => setLeadNoteText(e.target.value)}
                    style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 100, boxSizing: 'border-box' as const }} />
                  <button disabled={updatingLead}
                    onClick={() => patchLead(selectedLead.id, { notes: leadNoteText })}
                    style={{ marginTop: 8, background: 'var(--navy)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {updatingLead ? 'Saving…' : 'Save Notes'}
                  </button>
                </div>

                {/* Follow-up date */}
                <div>
                  <p style={SECTION_LABEL}>Follow-up Date</p>
                  <input type="date" value={leadFollowUpDate} onChange={e => setLeadFollowUpDate(e.target.value)}
                    style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button disabled={updatingLead}
                      onClick={() => patchLead(selectedLead.id, { follow_up_date: leadFollowUpDate || null })}
                      style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Save Date
                    </button>
                    {leadFollowUpDate && (
                      <button disabled={updatingLead}
                        onClick={() => { setLeadFollowUpDate(''); patchLead(selectedLead.id, { follow_up_date: null }) }}
                        style={{ background: 'var(--gray)', color: 'var(--text-mid)', border: 'none', padding: '10px 16px', borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Meta */}
                {selectedLead.product_interest && (
                  <div>
                    <p style={SECTION_LABEL}>Product Interest</p>
                    <p style={{ fontSize: 14, color: 'var(--text-dark)' }}>{selectedLead.product_interest}</p>
                  </div>
                )}
                {selectedLead.agent_profiles?.display_name && (
                  <div>
                    <p style={SECTION_LABEL}>Assigned Agent</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)' }}>{selectedLead.agent_profiles.display_name}</p>
                  </div>
                )}
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  <i className="fa-solid fa-clock" style={{ marginRight: 6 }} />
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
