'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/context/ThemeContext'

interface QuantityTier { label: string; qty: number; bundle_total: number }
interface ProductOption { id: string; name: string; price: number; img: string; quantity_options: QuantityTier[] | null }
interface RequiredItem {
  product_id: string
  bundle_label?: string
  qty?: number
  purpose?: string
  completed?: boolean
}
interface RFSProfile {
  id: string; gmail: string; display_name: string; benefit_title: string
  benefit_amount: number; activation_pct: number; deduction_pct: number
  minimized_deduction_pct: number | null; required_product_ids: string[]
  required_product_quantities: Record<string, number>
  required_product_bundles: Record<string, string>
  required_items: RequiredItem[]
  completed_product_ids: string[]; status: string; deadline: string | null
  custom_message: string | null; admin_notes: string | null; created_at: string
  portal_texts: Record<string, string>
  priority_list: boolean
}

const TEXT_GROUPS = [
  { group: 'Top Bar & Header', fields: [
    { key: 'topbar_label',   label: 'Top Bar Label',      def: 'Rewards Portal' },
    { key: 'welcome_label',  label: 'Welcome Label',      def: 'Welcome back,' },
    { key: 'welcome_sub',    label: 'Welcome Subtitle',   def: "Here's your activation and rewards overview" },
    { key: 'status_fallback',label: 'Status Fallback Msg',def: 'Your account is currently being processed. You will be notified once the review is complete.' },
    { key: 'signout_btn',    label: 'Sign Out Button',    def: 'Sign Out' },
  ]},
  { group: 'Benefit Card', fields: [
    { key: 'benefit_sub',  label: 'Benefit Subtitle', def: 'Your estimated reward amount' },
  ]},
  { group: 'Activation Ring', fields: [
    { key: 'activation_title',    label: 'Ring Title',          def: 'Activation Completion' },
    { key: 'activation_complete', label: 'Complete Message',    def: 'Activation Complete!' },
  ]},
  { group: 'Deduction Card', fields: [
    { key: 'deduction_title',     label: 'Deduction Title',         def: 'Deduction Summary (First Cash-Out)' },
    { key: 'deduction_cur_label', label: 'Current Deduction Label', def: 'CURRENT DEDUCTION' },
    { key: 'deduction_amt_label', label: 'Amount Label',            def: 'AMOUNT' },
  ]},
  { group: 'Required Products', fields: [
    { key: 'required_deduction_note',label: 'Deduction Reduction Note', def: 'Completing them reduces your deduction to only' },
    { key: 'product_buy_btn',       label: 'Buy Now Button',        def: 'Buy Now' },
    { key: 'product_completed_btn', label: 'Completed Label',       def: 'Completed' },
    { key: 'progress_label',        label: 'Progress Bar Label',    def: 'Products Completed' },
  ]},
  { group: 'Timeline Steps', fields: [
    { key: 'timeline_title', label: 'Timeline Title',    def: 'Activation Review Process' },
    { key: 'step1_label',    label: 'Step 1 Label',      def: 'Request Received' },
    { key: 'step1_sub',      label: 'Step 1 Sub',        def: 'Complete' },
    { key: 'step2_label',    label: 'Step 2 Label',      def: 'Under Review' },
    { key: 'step2_sub',      label: 'Step 2 Sub',        def: 'In Progress' },
    { key: 'step3_label',    label: 'Step 3 Label',      def: 'Compliance Check' },
    { key: 'step4_label',    label: 'Step 4 Label',      def: 'Final Verification' },
    { key: 'step5_label',    label: 'Step 5 Label',      def: 'Activation Approval' },
    { key: 'step_done',      label: 'Step Done Sub',     def: 'Complete' },
    { key: 'step_pending',   label: 'Step Pending Sub',  def: 'Pending' },
  ]},
  { group: 'Deadline Card', fields: [
    { key: 'deadline_title', label: 'Deadline Title', def: 'Requirement Deadline' },
    { key: 'deadline_sub',   label: 'Deadline Body',  def: 'You must complete all required products before the deadline to avoid any delays or cancellation.' },
    { key: 'deadline_note',  label: 'Deadline Note',  def: 'Deadline is final and non-extendable.' },
  ]},
  { group: 'Priority List Card', fields: [
    { key: 'priority_title', label: 'Priority Title',    def: 'You are now in priority list!' },
    { key: 'priority_sub',   label: 'Priority Subtitle', def: 'Your account has been moved to priority processing. Your activation and cash-out are handled ahead of the standard queue.' },
    { key: 'priority_badge', label: 'Priority Badge',    def: 'Priority' },
  ]},
  { group: 'Required Products (extra)', fields: [
    { key: 'product_line_total', label: 'Line Total Label', def: 'Total' },
  ]},
  { group: 'Footer', fields: [
    { key: 'cashout_label', label: 'Cash-Out Label', def: 'Possible Cash-Out Amount' },
  ]},
]

const STATUSES = ['under_review','active','pending','completed','suspended']
const STATUS_COLOR: Record<string,string> = {
  under_review:'#f59e0b', active:'#10b981', completed:'#3b82f6',
  pending:'#8b5cf6', suspended:'#ef4444',
}
const STATUS_LABEL: Record<string,string> = {
  under_review:'Under Review', active:'Active', completed:'Completed',
  pending:'Pending', suspended:'Suspended',
}

function empty(): Partial<RFSProfile> {
  return {
    gmail:'', display_name:'Valued Customer', benefit_title:'Cash-Out Amount',
    benefit_amount:0, activation_pct:0, deduction_pct:0, minimized_deduction_pct:null,
    required_product_ids:[], required_product_quantities:{}, required_product_bundles:{}, completed_product_ids:[],
    required_items:[],
    status:'under_review', deadline:null, custom_message:null, admin_notes:null,
    portal_texts:{}, priority_list:false,
  }
}

export default function RFSTab({ authHeaders }: { authHeaders: () => HeadersInit }) {
  const [profiles, setProfiles]           = useState<RFSProfile[]>([])
  const [products, setProducts]           = useState<ProductOption[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [editing, setEditing]             = useState<Partial<RFSProfile> | null>(null)
  const [saving, setSaving]               = useState(false)
  const [flash, setFlash]                 = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showTexts, setShowTexts]         = useState(false)
  const { isDark } = useTheme()
  const D = {
    bg:      isDark ? '#0f1e2e' : '#f8fafc',
    card:    isDark ? '#1a2e42' : '#ffffff',
    text:    isDark ? '#ecf5fc' : '#0d1f2d',
    muted:   isDark ? '#5e8faa' : '#64748b',
    border:  isDark ? '#273d52' : '#e5e7eb',
    inputBg: isDark ? '#0b1622' : '#ffffff',
    rowHov:  isDark ? '#273d52' : '#f9fafb',
    btnBg:   isDark ? '#273d52' : '#f3f4f6',
  }

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 3200) }

  const load = useCallback(async () => {
    setLoading(true)
    const [pr, prod] = await Promise.all([
      fetch('/api/admin/rfs', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/admin/products', { headers: authHeaders() }).then(r => r.json()),
    ])
    setProfiles(Array.isArray(pr) ? pr : [])
    setProducts(Array.isArray(prod) ? prod.map((p: any) => ({ id: p.id, name: p.name, price: p.price, img: p.img, quantity_options: Array.isArray(p.quantity_options) ? p.quantity_options : null })) : [])
    setLoading(false)
  }, [authHeaders])

  useEffect(() => { load() }, [load])

  const filtered = profiles.filter(p =>
    !search || p.gmail.includes(search.toLowerCase()) || p.display_name.toLowerCase().includes(search.toLowerCase())
  )

  async function save() {
    if (!editing) return
    setSaving(true)
    const isNew = !editing.id
    const url   = isNew ? '/api/admin/rfs' : `/api/admin/rfs/${editing.id}`
    const method = isNew ? 'POST' : 'PUT'
    const body = { ...editing }
    if (body.deadline === '') body.deadline = null
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type':'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (d.error) { showFlash('Error: ' + d.error); setSaving(false); return }
    showFlash(isNew ? 'Profile created!' : 'Profile updated!')
    setEditing(null); setSaving(false); load()
  }

  async function del(id: string) {
    const r = await fetch(`/api/admin/rfs/${id}`, { method:'DELETE', headers: authHeaders() })
    const d = await r.json()
    if (d.error) { showFlash('Error: ' + d.error); return }
    showFlash('Profile deleted.'); setConfirmDelete(null); load()
  }

  /**
   * Older profiles stored requirements as a set of product ids. Convert them
   * to the ordered shape when a profile is opened, so editing one never
   * silently drops its requirements. The first two slots are labelled the way
   * the customer is shown them.
   */
  function withItems(p: RFSProfile): Partial<RFSProfile> {
    if (Array.isArray(p.required_items) && p.required_items.length > 0) return { ...p }
    return {
      ...p,
      required_items: (p.required_product_ids ?? []).map((pid, i) => ({
        product_id: pid,
        bundle_label: (p.required_product_bundles ?? {})[pid] ?? '',
        qty: (p.required_product_quantities ?? {})[pid] ?? 1,
        purpose: i === 0 ? 'Account activation' : i === 1 ? 'Priority listing' : '',
        completed: (p.completed_product_ids ?? []).includes(pid),
      })),
    }
  }

  // ── Requirement rows ──────────────────────────────────────
  // An ordered list rather than a set of ids, so the same product can be
  // required twice — once to activate the account, again for priority listing.
  const items = (): RequiredItem[] => editing?.required_items ?? []
  const writeItems = (next: RequiredItem[]) => editing && setEditing({ ...editing, required_items: next })

  function patchItem(i: number, patch: Partial<RequiredItem>) {
    const next = [...items()]
    next[i] = { ...next[i], ...patch }
    writeItems(next)
  }

  function setItemProduct(i: number, pid: string) {
    // Changing product invalidates the chosen bundle, so land on that
    // product's first bundle rather than keeping one it doesn't have.
    const tiers = products.find(x => x.id === pid)?.quantity_options
    patchItem(i, {
      product_id: pid,
      bundle_label: tiers?.length ? tiers[0].label : '',
      qty: tiers?.length ? tiers[0].qty : 1,
    })
  }

  function setItemBundle(i: number, label: string) {
    const tiers = products.find(x => x.id === items()[i]?.product_id)?.quantity_options ?? []
    const tier = tiers.find(t => t.label === label)
    if (!tier) return
    patchItem(i, { bundle_label: label, qty: tier.qty })
  }

  function addItem() {
    const n = items().length
    writeItems([...items(), {
      product_id: '', bundle_label: '', qty: 1, completed: false,
      purpose: n === 0 ? 'Account activation' : n === 1 ? 'Priority listing' : '',
    }])
  }

  function removeItem(i: number) { writeItems(items().filter((_, k) => k !== i)) }

  function moveItem(i: number, dir: -1 | 1) {
    const j = i + dir
    const next = [...items()]
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    writeItems(next)
  }

  const inp = (disabled = false): React.CSSProperties => ({
    border: `1.5px solid ${D.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13,
    fontFamily: 'inherit', width: '100%', outline: 'none',
    background: disabled ? D.bg : D.inputBg, color: D.text, cursor: disabled ? 'not-allowed' : 'text',
  })

  return (
    <div style={{ fontFamily:'inherit' }}>
      {/* Flash */}
      {flash && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, background:flash.startsWith('Error')?'#ef4444':'#10b981', color:'white', padding:'12px 20px', borderRadius:10, fontWeight:700, fontSize:13, boxShadow:'0 4px 20px rgba(0,0,0,.25)', fontFamily:'inherit' }}>
          {flash}
        </div>
      )}

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, gap:16, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, margin:0, color:D.text }}>RFS Profiles</h2>
          <p style={{ fontSize:13, color:D.muted, margin:'4px 0 0' }}>Manage customer reward profiles for the /rfs portal</p>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Gmail or name…"
            style={{ border:`1.5px solid ${D.border}`, borderRadius:8, padding:'9px 14px', fontSize:13, width:240, fontFamily:'inherit', outline:'none', background:D.inputBg, color:D.text }}/>
          <button onClick={() => setEditing(empty())}
            style={{ background:'var(--navy)', color:'white', border:'none', borderRadius:8, padding:'10px 18px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7 }}>
            <i className="fa-solid fa-plus"/> New Profile
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:D.muted, fontSize:14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:D.muted }}>
          <i className="fa-solid fa-inbox" style={{ fontSize:36, marginBottom:12, display:'block', opacity:.3 }}/>
          {search ? 'No profiles match your search.' : 'No RFS profiles yet. Create one to get started.'}
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${D.border}` }}>
                {['Gmail','Name','Benefit','Activation','Deduction','Status','Products','Created',''].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontWeight:700, color:D.muted, fontSize:11, textTransform:'uppercase', letterSpacing:.5, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom:`1px solid ${D.border}` }}>
                  <td style={{ padding:'12px', fontWeight:600, color:D.text }}>{p.gmail}</td>
                  <td style={{ padding:'12px', color:D.text }}>{p.display_name}</td>
                  <td style={{ padding:'12px', fontWeight:700, color:'#10b981' }}>${Number(p.benefit_amount).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                  <td style={{ padding:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:60, height:6, background:D.border, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${p.activation_pct}%`, background:'#10b981', borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:12, color:D.text }}>{p.activation_pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px', color:'#ef4444', fontWeight:700 }}>{p.deduction_pct}%</td>
                  <td style={{ padding:'12px' }}>
                    <span style={{ background:`${STATUS_COLOR[p.status]}22`, color:STATUS_COLOR[p.status], padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700 }}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td style={{ padding:'12px', color:D.muted }}>{p.required_product_ids.length} req / {p.completed_product_ids.length} done</td>
                  <td style={{ padding:'12px', color:D.muted, whiteSpace:'nowrap' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td style={{ padding:'12px' }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>setEditing(withItems(p))}
                        style={{ background:D.btnBg, border:'none', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', color:D.text }}>
                        Edit
                      </button>
                      <button onClick={()=>setConfirmDelete(p.id)}
                        style={{ background:'#fee2e2', border:'none', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', color:'#dc2626' }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:D.card, borderRadius:16, padding:28, width:340, textAlign:'center', fontFamily:'inherit' }}>
            <i className="fa-solid fa-trash-can" style={{ fontSize:32, color:'#ef4444', marginBottom:12 }}/>
            <h3 style={{ margin:'0 0 8px', color:D.text }}>Delete Profile?</h3>
            <p style={{ fontSize:13, color:D.muted, margin:'0 0 22px' }}>This action cannot be undone.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setConfirmDelete(null)}
                style={{ padding:'9px 20px', borderRadius:8, border:`1.5px solid ${D.border}`, background:D.btnBg, cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, color:D.text }}>
                Cancel
              </button>
              <button onClick={()=>del(confirmDelete)}
                style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#ef4444', color:'white', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:13 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create drawer */}
      {editing && (
        <>
          <div onClick={()=>setEditing(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:800 }}/>
          <div style={{ position:'fixed', top:0, right:0, width:560, maxWidth:'100vw', height:'100%', background:D.card, zIndex:801, display:'flex', flexDirection:'column', boxShadow:'-4px 0 40px rgba(0,0,0,.15)', fontFamily:'inherit', overflow:'hidden' }}>
            {/* Drawer header */}
            <div style={{ background:'var(--navy)', padding:'18px 24px', color:'white', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800 }}>{editing.id ? 'Edit RFS Profile' : 'New RFS Profile'}</div>
                {editing.id && <div style={{ fontSize:11, opacity:.6, marginTop:2 }}>{editing.gmail}</div>}
              </div>
              <button onClick={()=>setEditing(null)} style={{ background:'rgba(255,255,255,.12)', border:'none', color:'white', width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:16, fontFamily:'inherit' }}>✕</button>
            </div>

            {/* Drawer body */}
            <div style={{ flex:1, overflowY:'auto', padding:24, display:'flex', flexDirection:'column', gap:20, background:D.bg }}>

              {/* Gmail */}
              <Field label="Gmail Address *" color={D.muted}>
                <input value={editing.gmail ?? ''} onChange={e=>setEditing({...editing, gmail:e.target.value})}
                  placeholder="customer@gmail.com" disabled={!!editing.id}
                  style={inp(!!editing.id)}/>
                {editing.id && <p style={{ fontSize:11, color:D.muted, margin:'4px 0 0' }}>Gmail cannot be changed after creation.</p>}
              </Field>

              {/* Display name */}
              <Field label="Display Name" color={D.muted}>
                <input value={editing.display_name ?? ''} onChange={e=>setEditing({...editing, display_name:e.target.value})} style={inp()}/>
              </Field>

              {/* Benefit */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Benefit Title" color={D.muted}>
                  <input value={editing.benefit_title ?? ''} onChange={e=>setEditing({...editing, benefit_title:e.target.value})} style={inp()}/>
                </Field>
                <Field label="Benefit Amount ($)" color={D.muted}>
                  <input type="number" value={editing.benefit_amount ?? 0} onChange={e=>setEditing({...editing, benefit_amount:Number(e.target.value)})} style={inp()}/>
                </Field>
              </div>

              {/* Activation + deductions */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                <Field label="Activation %" color={D.muted}>
                  <input type="number" min={0} max={100} value={editing.activation_pct ?? 0} onChange={e=>setEditing({...editing, activation_pct:Math.min(100,Math.max(0,Number(e.target.value)))})} style={inp()}/>
                </Field>
                <Field label="Deduction %" color={D.muted}>
                  <input type="number" min={0} max={100} value={editing.deduction_pct ?? 0} onChange={e=>setEditing({...editing, deduction_pct:Math.min(100,Math.max(0,Number(e.target.value)))})} style={inp()}/>
                </Field>
                <Field label="Min. Deduction %" color={D.muted}>
                  <input type="number" min={0} max={100} value={editing.minimized_deduction_pct ?? ''} placeholder="none"
                    onChange={e=>setEditing({...editing, minimized_deduction_pct:e.target.value===''?null:Math.min(100,Math.max(0,Number(e.target.value)))})} style={inp()}/>
                </Field>
              </div>

              {/* Status + deadline */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Status" color={D.muted}>
                  <select value={editing.status ?? 'under_review'} onChange={e=>setEditing({...editing, status:e.target.value})} style={inp()}>
                    {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </Field>
                <Field label="Deadline (optional)" color={D.muted}>
                  <input type="datetime-local" value={editing.deadline ? editing.deadline.slice(0,16) : ''} onChange={e=>setEditing({...editing, deadline:e.target.value?new Date(e.target.value).toISOString():null})} style={inp()}/>
                </Field>
              </div>

              {/* Priority list badge — adds a fourth card to this customer's
                  dashboard. Off by default so it only shows where an admin has
                  deliberately switched it on. */}
              <label style={{
                display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', flexShrink:0,
                background: editing.priority_list ? 'rgba(16,185,129,0.08)' : D.card,
                border:`1.5px solid ${editing.priority_list ? 'rgba(16,185,129,0.45)' : D.border}`,
                borderRadius:10, padding:'13px 15px',
              }}>
                <input type="checkbox" checked={!!editing.priority_list}
                  onChange={e=>setEditing({...editing, priority_list:e.target.checked})}
                  style={{ width:16, height:16, cursor:'pointer', marginTop:2, flexShrink:0 }}/>
                <span>
                  <span style={{ fontSize:13, fontWeight:700, color: editing.priority_list ? '#10b981' : D.text, display:'block', marginBottom:2 }}>
                    <i className="fa-solid fa-bolt" style={{ marginRight:7, fontSize:12 }}/>
                    Show &ldquo;You are now in priority list!&rdquo;
                  </span>
                  <span style={{ fontSize:11, color:D.muted, lineHeight:1.5 }}>
                    Adds a fourth card to this customer&rsquo;s dashboard, beside cash-out,
                    activation and deduction. Only this customer sees it.
                  </span>
                </span>
              </label>

              {/* Custom message */}
              <Field label="Custom Message (shown on portal)" color={D.muted}>
                <textarea value={editing.custom_message ?? ''} rows={3}
                  onChange={e=>setEditing({...editing, custom_message:e.target.value||null})}
                  placeholder="Your account is currently being processed…"
                  style={{ ...inp(), resize:'vertical', height:'auto' }}/>
              </Field>

              {/* Admin notes */}
              <Field label="Admin Notes (internal only)" color={D.muted}>
                <textarea value={editing.admin_notes ?? ''} rows={2}
                  onChange={e=>setEditing({...editing, admin_notes:e.target.value||null})}
                  style={{ ...inp(), resize:'vertical', height:'auto' }}/>
              </Field>

              {/* Benefit note */}
              <Field label="Benefit Note (below cash-out amount)" color={D.muted}>
                <textarea
                  value={(editing.portal_texts??{})['benefit_note'] ?? ''}
                  onChange={e => setEditing({...editing, portal_texts:{...(editing.portal_texts??{}), benefit_note: e.target.value}})}
                  placeholder="This amount will be available once your activation process is fully completed."
                  rows={2}
                  style={{ ...inp(), resize:'vertical', height:'auto' }}/>
              </Field>

              {/* Action required notice */}
              <Field label="Action Required Notice (above product list)" color={D.muted}>
                <textarea
                  value={(editing.portal_texts??{})['required_header'] ?? ''}
                  onChange={e => setEditing({...editing, portal_texts:{...(editing.portal_texts??{}), required_header: e.target.value}})}
                  placeholder="Action Required: Complete the required product purchase to restore your account to the priority processing list."
                  rows={2}
                  style={{ ...inp(), resize:'vertical', height:'auto' }}/>
              </Field>

              {/* Deduction minimize hint */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Deduction Hint — Prefix" color={D.muted}>
                  <input
                    value={(editing.portal_texts??{})['deduction_minimize_prefix'] ?? ''}
                    onChange={e => setEditing({...editing, portal_texts:{...(editing.portal_texts??{}), deduction_minimize_prefix: e.target.value}})}
                    placeholder="Complete"
                    style={inp()}/>
                </Field>
                <Field label="Deduction Hint — Suffix" color={D.muted}>
                  <input
                    value={(editing.portal_texts??{})['deduction_minimize_suffix'] ?? ''}
                    onChange={e => setEditing({...editing, portal_texts:{...(editing.portal_texts??{}), deduction_minimize_suffix: e.target.value}})}
                    placeholder="to minimize your deduction"
                    style={inp()}/>
                </Field>
              </div>
              <p style={{ fontSize:11, color:D.muted, margin:'-10px 0 0', lineHeight:1.5 }}>
                Shown as: <em>[Prefix] [Suffix]</em>. Leave both blank to hide this line entirely.
              </p>

              {/* Activation ring messages */}
              <Field label="Activation Ring — Progress Message" color={D.muted}>
                <input
                  value={(editing.portal_texts??{})['activation_msg'] ?? ''}
                  onChange={e => setEditing({...editing, portal_texts:{...(editing.portal_texts??{}), activation_msg: e.target.value}})}
                  placeholder="You are almost there!"
                  style={inp()}/>
              </Field>
              <Field label="Activation Ring — Progress Subtitle" color={D.muted}>
                <textarea
                  value={(editing.portal_texts??{})['activation_sub'] ?? ''}
                  onChange={e => setEditing({...editing, portal_texts:{...(editing.portal_texts??{}), activation_sub: e.target.value}})}
                  placeholder="Complete the remaining requirements to proceed with your activation."
                  rows={2}
                  style={{ ...inp(), resize:'vertical', height:'auto' }}/>
              </Field>

              {/* Timeline Step States */}
              <div style={{ border:'2px solid var(--teal)', borderRadius:10, flexShrink:0 }}>
                <div style={{ padding:'12px 16px', background:'var(--teal)', fontSize:13, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8, borderRadius:'8px 8px 0 0' }}>
                  <i className="fa-solid fa-list-check" style={{ fontSize:12 }}/>
                  Timeline Step States
                </div>
                <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10, background:D.card, borderRadius:'0 0 8px 8px' }}>
                  <p style={{ fontSize:11, color:D.muted, margin:'0 0 4px', lineHeight:1.5 }}>
                    Override each step state. Leave on Auto to use profile status and activation %.
                  </p>
                  {[
                    ['step1_state', 'Step 1 — Request Received'],
                    ['step2_state', 'Step 2 — Under Review'],
                    ['step3_state', 'Step 3 — Compliance Check'],
                    ['step4_state', 'Step 4 — Final Verification'],
                    ['step5_state', 'Step 5 — Activation Approval'],
                  ].map(([key, label]) => (
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:D.text, flex:1 }}>{label}</span>
                      <select
                        value={(editing.portal_texts ?? {})[key] ?? ''}
                        onChange={e => setEditing({...editing, portal_texts:{...(editing.portal_texts??{}), [key]: e.target.value}})}
                        style={{ ...inp(), width:150, fontSize:12 }}>
                        <option value="">Auto</option>
                        <option value="done">Done</option>
                        <option value="active">In Progress</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements — an ordered list, so the same product can be
                  required twice: once to activate, again for priority listing.
                  Position identifies a requirement, which is why each row
                  carries its own bundle, purpose and completion rather than
                  being keyed by product id. */}
              <Field label={`Required Products (${(editing.required_items??[]).length})`} color={D.muted}>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(editing.required_items??[]).map((item, i) => {
                    const prod  = products.find(x => x.id === item.product_id)
                    const tiers = prod?.quantity_options?.length ? prod.quantity_options : null
                    const tier  = tiers?.find(t => t.label === item.bundle_label)
                               ?? tiers?.find(t => Number(t.qty) === Number(item.qty))
                    const lineTotal = tier ? Number(tier.bundle_total)
                                           : Number(prod?.price ?? 0) * Number(item.qty ?? 1)
                    const last = i === (editing.required_items??[]).length - 1
                    return (
                      <div key={i} style={{ border:`1.5px solid ${item.completed ? 'rgba(16,185,129,0.45)' : D.border}`, background:item.completed ? 'rgba(16,185,129,0.06)' : D.inputBg, borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:9 }}>

                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:11, fontWeight:800, color:D.muted, background:D.btnBg, borderRadius:6, padding:'3px 8px', flexShrink:0 }}>#{i+1}</span>
                          {prod && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={prod.img} alt="" style={{ width:30, height:30, borderRadius:6, objectFit:'cover', flexShrink:0, background:D.btnBg }}/>
                          )}
                          <select value={item.product_id} onChange={e=>setItemProduct(i, e.target.value)}
                            style={{ ...inp(), flex:1, minWidth:150, padding:'6px 8px', fontSize:12.5 }}>
                            <option value="">&mdash; pick a product &mdash;</option>
                            {products.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                          </select>
                          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                            <button onClick={()=>moveItem(i,-1)} disabled={i===0} title="Move up"
                              style={{ background:D.btnBg, border:'none', borderRadius:6, padding:'6px 9px', cursor:i===0?'not-allowed':'pointer', opacity:i===0?0.4:1, color:D.muted }}>
                              <i className="fa-solid fa-chevron-up" style={{ fontSize:11 }}/>
                            </button>
                            <button onClick={()=>moveItem(i,1)} disabled={last} title="Move down"
                              style={{ background:D.btnBg, border:'none', borderRadius:6, padding:'6px 9px', cursor:last?'not-allowed':'pointer', opacity:last?0.4:1, color:D.muted }}>
                              <i className="fa-solid fa-chevron-down" style={{ fontSize:11 }}/>
                            </button>
                            <button onClick={()=>removeItem(i)} title="Remove"
                              style={{ background:'#fee2e2', color:'#991b1b', border:'none', borderRadius:6, padding:'6px 9px', cursor:'pointer' }}>
                              <i className="fa-solid fa-trash" style={{ fontSize:11 }}/>
                            </button>
                          </div>
                        </div>

                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                          {tiers ? (
                            <select value={tier?.label ?? ''} onChange={e=>setItemBundle(i, e.target.value)}
                              style={{ ...inp(), width:'auto', minWidth:230, padding:'5px 8px', fontSize:12.5 }}>
                              {tiers.map(t => (
                                <option key={t.label} value={t.label}>{t.label} &mdash; ${Number(t.bundle_total).toFixed(2)}</option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <span style={{ fontSize:11, color:D.muted }}>Qty:</span>
                              <input type="number" min={1} value={item.qty ?? 1}
                                onChange={e=>patchItem(i, { qty: Math.max(1, Number(e.target.value)) })}
                                style={{ width:64, border:`1.5px solid ${D.border}`, borderRadius:6, padding:'4px 8px', fontSize:13, background:D.card, color:D.text, fontFamily:'inherit', outline:'none', textAlign:'center' }}/>
                            </>
                          )}
                          {prod && <span style={{ fontSize:12, fontWeight:800, color:'#d4af37' }}>${lineTotal.toFixed(2)}</span>}
                        </div>

                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                          <span style={{ fontSize:11, color:D.muted, flexShrink:0 }}>When purchased:</span>
                          <input value={item.purpose ?? ''} onChange={e=>patchItem(i, { purpose: e.target.value })}
                            placeholder={i===0 ? 'Account activation' : i===1 ? 'Priority listing' : 'What this unlocks'}
                            style={{ ...inp(), flex:1, minWidth:170, padding:'5px 9px', fontSize:12.5 }}/>
                          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:item.completed?'#10b981':D.muted, cursor:'pointer', flexShrink:0 }}>
                            <input type="checkbox" checked={!!item.completed}
                              onChange={e=>patchItem(i, { completed: e.target.checked })}
                              style={{ width:15, height:15, cursor:'pointer' }}/>
                            Done
                          </label>
                        </div>
                      </div>
                    )
                  })}

                  <button onClick={addItem}
                    style={{ alignSelf:'flex-start', background:D.btnBg, color:D.text, border:`1.5px solid ${D.border}`, borderRadius:8, padding:'9px 16px', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    <i className="fa-solid fa-plus" style={{ marginRight:7, fontSize:11 }}/>Add requirement
                  </button>
                  <p style={{ fontSize:11, color:D.muted, margin:0, lineHeight:1.6 }}>
                    Order is what the customer sees. The same product can be added twice &mdash;
                    for example once to activate the account, again for priority listing.
                  </p>
                </div>
              </Field>


              {/* Portal Text Labels */}
              <div style={{ border:`1.5px solid ${D.border}`, borderRadius:10, overflow:'hidden' }}>
                <button
                  type="button"
                  onClick={() => setShowTexts(v => !v)}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:D.btnBg, border:'none', cursor:'pointer', fontFamily:'inherit', color:D.text, fontSize:13, fontWeight:700 }}>
                  <span><i className="fa-solid fa-pen-to-square" style={{ marginRight:8, color:'var(--teal)', fontSize:12 }}/>Portal Page Text Labels</span>
                  <i className={`fa-solid fa-chevron-${showTexts?'up':'down'}`} style={{ fontSize:11, color:D.muted }}/>
                </button>
                {showTexts && (
                  <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:18, background:D.bg }}>
                    <p style={{ fontSize:11, color:D.muted, margin:0, lineHeight:1.6 }}>
                      Override any text shown on the customer&apos;s RFS dashboard. Leave blank to use the default.
                    </p>
                    {TEXT_GROUPS.map(grp => (
                      <div key={grp.group}>
                        <div style={{ fontSize:10, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:.8, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${D.border}` }}>{grp.group}</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          {grp.fields.map(f => {
                            const val = (editing.portal_texts??{})[f.key] ?? ''
                            const isLong = f.def.length > 60
                            return (
                              <div key={f.key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'flex', justifyContent:'space-between' }}>
                                  <span>{f.label}</span>
                                  {val && <span style={{ color:'var(--teal)', fontWeight:600 }}>custom</span>}
                                </label>
                                {isLong ? (
                                  <textarea
                                    value={val}
                                    onChange={e => setEditing({...editing, portal_texts:{...(editing.portal_texts??{}), [f.key]: e.target.value}})}
                                    placeholder={f.def}
                                    rows={2}
                                    style={{ ...inp(), resize:'vertical', height:'auto', fontSize:12 }}/>
                                ) : (
                                  <input
                                    value={val}
                                    onChange={e => setEditing({...editing, portal_texts:{...(editing.portal_texts??{}), [f.key]: e.target.value}})}
                                    placeholder={f.def}
                                    style={{ ...inp(), fontSize:12 }}/>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditing({...editing, portal_texts:{}})}
                      style={{ alignSelf:'flex-start', background:'#fee2e2', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600, color:'#dc2626', fontFamily:'inherit' }}>
                      <i className="fa-solid fa-rotate-left" style={{ marginRight:5 }}/>Reset all to defaults
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer footer */}
            <div style={{ padding:'16px 24px', borderTop:`1px solid ${D.border}`, display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0, background:D.card }}>
              <button onClick={()=>setEditing(null)} style={{ padding:'10px 22px', borderRadius:8, border:`1.5px solid ${D.border}`, background:D.btnBg, cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, color:D.text }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving || !editing.gmail}
                style={{ padding:'10px 22px', borderRadius:8, border:'none', background:'var(--navy)', color:'white', cursor:saving||!editing.gmail?'not-allowed':'pointer', fontFamily:'inherit', fontWeight:700, fontSize:13, opacity:saving||!editing.gmail?.trim()?0.6:1 }}>
                {saving ? 'Saving…' : editing.id ? 'Save Changes' : 'Create Profile'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Field({ label, children, color }: { label: string; children: React.ReactNode; color: string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11, fontWeight:700, color, textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>
      {children}
    </div>
  )
}
