'use client'
import { useState, useEffect, useCallback } from 'react'

interface ProductOption { id: string; name: string; price: number }
interface RFSProfile {
  id: string; gmail: string; display_name: string; benefit_title: string
  benefit_amount: number; activation_pct: number; deduction_pct: number
  minimized_deduction_pct: number | null; required_product_ids: string[]
  completed_product_ids: string[]; status: string; deadline: string | null
  custom_message: string | null; admin_notes: string | null; created_at: string
}

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
    required_product_ids:[], completed_product_ids:[], status:'under_review',
    deadline:null, custom_message:null, admin_notes:null,
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

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 3200) }

  const load = useCallback(async () => {
    setLoading(true)
    const [pr, prod] = await Promise.all([
      fetch('/api/admin/rfs', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/admin/products', { headers: authHeaders() }).then(r => r.json()),
    ])
    setProfiles(Array.isArray(pr) ? pr : [])
    setProducts(Array.isArray(prod) ? prod.map((p: any) => ({ id: p.id, name: p.name, price: p.price })) : [])
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

  function toggleProduct(pid: string, field: 'required_product_ids' | 'completed_product_ids') {
    if (!editing) return
    const cur = editing[field] ?? []
    setEditing({ ...editing, [field]: cur.includes(pid) ? cur.filter((x: string) => x !== pid) : [...cur, pid] })
  }

  // ── Render ────────────────────────────────────────────────

  const cs: React.CSSProperties = { fontFamily:'inherit' }

  return (
    <div style={{ ...cs }}>
      {/* Flash */}
      {flash && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, background:flash.startsWith('Error')?'#ef4444':'#10b981', color:'white', padding:'12px 20px', borderRadius:10, fontWeight:700, fontSize:13, boxShadow:'0 4px 20px rgba(0,0,0,.25)', fontFamily:'inherit' }}>
          {flash}
        </div>
      )}

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, gap:16, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, margin:0, color:'var(--navy)' }}>RFS Profiles</h2>
          <p style={{ fontSize:13, color:'var(--text-light)', margin:'4px 0 0' }}>Manage customer reward profiles for the /rfs portal</p>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Gmail or name…"
            style={{ border:'1.5px solid #e5e7eb', borderRadius:8, padding:'9px 14px', fontSize:13, width:240, fontFamily:'inherit', outline:'none' }}/>
          <button onClick={() => setEditing(empty())}
            style={{ background:'var(--navy)', color:'white', border:'none', borderRadius:8, padding:'10px 18px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7 }}>
            <i className="fa-solid fa-plus"/> New Profile
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-light)', fontSize:14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-light)' }}>
          <i className="fa-solid fa-inbox" style={{ fontSize:36, marginBottom:12, display:'block', opacity:.3 }}/>
          {search ? 'No profiles match your search.' : 'No RFS profiles yet. Create one to get started.'}
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'2px solid #f3f4f6' }}>
                {['Gmail','Name','Benefit','Activation','Deduction','Status','Products','Created',''].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontWeight:700, color:'var(--text-light)', fontSize:11, textTransform:'uppercase', letterSpacing:.5, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                  <td style={{ padding:'12px', fontWeight:600, color:'var(--navy)' }}>{p.gmail}</td>
                  <td style={{ padding:'12px' }}>{p.display_name}</td>
                  <td style={{ padding:'12px', fontWeight:700, color:'var(--navy)' }}>${Number(p.benefit_amount).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
                  <td style={{ padding:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:60, height:6, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${p.activation_pct}%`, background:'#10b981', borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:12, color:'#374151' }}>{p.activation_pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px', color:'#ef4444', fontWeight:700 }}>{p.deduction_pct}%</td>
                  <td style={{ padding:'12px' }}>
                    <span style={{ background:`${STATUS_COLOR[p.status]}22`, color:STATUS_COLOR[p.status], padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:700 }}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td style={{ padding:'12px', color:'var(--text-light)' }}>{p.required_product_ids.length} req / {p.completed_product_ids.length} done</td>
                  <td style={{ padding:'12px', color:'var(--text-light)', whiteSpace:'nowrap' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td style={{ padding:'12px' }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>setEditing({...p})}
                        style={{ background:'#f3f4f6', border:'none', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', color:'var(--navy)' }}>
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
          <div style={{ background:'white', borderRadius:16, padding:28, width:340, textAlign:'center', fontFamily:'inherit' }}>
            <i className="fa-solid fa-trash-can" style={{ fontSize:32, color:'#ef4444', marginBottom:12 }}/>
            <h3 style={{ margin:'0 0 8px', color:'var(--navy)' }}>Delete Profile?</h3>
            <p style={{ fontSize:13, color:'var(--text-light)', margin:'0 0 22px' }}>This action cannot be undone.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setConfirmDelete(null)}
                style={{ padding:'9px 20px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'white', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13 }}>
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
          <div style={{ position:'fixed', top:0, right:0, width:560, maxWidth:'100vw', height:'100%', background:'white', zIndex:801, display:'flex', flexDirection:'column', boxShadow:'-4px 0 40px rgba(0,0,0,.15)', fontFamily:'inherit', overflow:'hidden' }}>
            {/* Drawer header */}
            <div style={{ background:'var(--navy)', padding:'18px 24px', color:'white', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800 }}>{editing.id ? 'Edit RFS Profile' : 'New RFS Profile'}</div>
                {editing.id && <div style={{ fontSize:11, opacity:.6, marginTop:2 }}>{editing.gmail}</div>}
              </div>
              <button onClick={()=>setEditing(null)} style={{ background:'rgba(255,255,255,.12)', border:'none', color:'white', width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:16, fontFamily:'inherit' }}>✕</button>
            </div>

            {/* Drawer body */}
            <div style={{ flex:1, overflowY:'auto', padding:24, display:'flex', flexDirection:'column', gap:20 }}>

              {/* Gmail */}
              <Field label="Gmail Address *">
                <input value={editing.gmail ?? ''} onChange={e=>setEditing({...editing, gmail:e.target.value})}
                  placeholder="customer@gmail.com" disabled={!!editing.id}
                  style={inp(!!editing.id)}/>
                {editing.id && <p style={{ fontSize:11, color:'var(--text-light)', margin:'4px 0 0' }}>Gmail cannot be changed after creation.</p>}
              </Field>

              {/* Display name */}
              <Field label="Display Name">
                <input value={editing.display_name ?? ''} onChange={e=>setEditing({...editing, display_name:e.target.value})} style={inp()}/>
              </Field>

              {/* Benefit */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Benefit Title">
                  <input value={editing.benefit_title ?? ''} onChange={e=>setEditing({...editing, benefit_title:e.target.value})} style={inp()}/>
                </Field>
                <Field label="Benefit Amount ($)">
                  <input type="number" value={editing.benefit_amount ?? 0} onChange={e=>setEditing({...editing, benefit_amount:Number(e.target.value)})} style={inp()}/>
                </Field>
              </div>

              {/* Activation + deductions */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                <Field label="Activation %">
                  <input type="number" min={0} max={100} value={editing.activation_pct ?? 0} onChange={e=>setEditing({...editing, activation_pct:Math.min(100,Math.max(0,Number(e.target.value)))})} style={inp()}/>
                </Field>
                <Field label="Deduction %">
                  <input type="number" min={0} max={100} value={editing.deduction_pct ?? 0} onChange={e=>setEditing({...editing, deduction_pct:Math.min(100,Math.max(0,Number(e.target.value)))})} style={inp()}/>
                </Field>
                <Field label="Min. Deduction %">
                  <input type="number" min={0} max={100} value={editing.minimized_deduction_pct ?? ''} placeholder="none"
                    onChange={e=>setEditing({...editing, minimized_deduction_pct:e.target.value===''?null:Math.min(100,Math.max(0,Number(e.target.value)))})} style={inp()}/>
                </Field>
              </div>

              {/* Status + deadline */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Status">
                  <select value={editing.status ?? 'under_review'} onChange={e=>setEditing({...editing, status:e.target.value})} style={inp()}>
                    {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </Field>
                <Field label="Deadline (optional)">
                  <input type="datetime-local" value={editing.deadline ? editing.deadline.slice(0,16) : ''} onChange={e=>setEditing({...editing, deadline:e.target.value?new Date(e.target.value).toISOString():null})} style={inp()}/>
                </Field>
              </div>

              {/* Custom message */}
              <Field label="Custom Message (shown on portal)">
                <textarea value={editing.custom_message ?? ''} rows={3}
                  onChange={e=>setEditing({...editing, custom_message:e.target.value||null})}
                  placeholder="Your account is currently being processed…"
                  style={{ ...inp(), resize:'vertical', height:'auto' }}/>
              </Field>

              {/* Admin notes */}
              <Field label="Admin Notes (internal only)">
                <textarea value={editing.admin_notes ?? ''} rows={2}
                  onChange={e=>setEditing({...editing, admin_notes:e.target.value||null})}
                  style={{ ...inp(), resize:'vertical', height:'auto' }}/>
              </Field>

              {/* Required products */}
              <Field label={`Required Products (${(editing.required_product_ids??[]).length} selected)`}>
                <div style={{ maxHeight:220, overflowY:'auto', border:'1.5px solid #e5e7eb', borderRadius:8, padding:10, display:'flex', flexDirection:'column', gap:6 }}>
                  {products.map(p=>{
                    const checked=(editing.required_product_ids??[]).includes(p.id)
                    return (
                      <label key={p.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'4px 0', userSelect:'none' }}>
                        <input type="checkbox" checked={checked} onChange={()=>toggleProduct(p.id,'required_product_ids')} style={{ width:15, height:15 }}/>
                        <span style={{ fontSize:13, flex:1 }}>{p.name}</span>
                        <span style={{ fontSize:12, color:'var(--text-light)', fontWeight:600 }}>${Number(p.price).toFixed(2)}</span>
                      </label>
                    )
                  })}
                </div>
              </Field>

              {/* Completed products */}
              {(editing.required_product_ids??[]).length > 0 && (
                <Field label={`Completed Products (${(editing.completed_product_ids??[]).length} marked done)`}>
                  <div style={{ maxHeight:180, overflowY:'auto', border:'1.5px solid #e5e7eb', borderRadius:8, padding:10, display:'flex', flexDirection:'column', gap:6 }}>
                    {products.filter(p=>(editing.required_product_ids??[]).includes(p.id)).map(p=>{
                      const checked=(editing.completed_product_ids??[]).includes(p.id)
                      return (
                        <label key={p.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'4px 0', userSelect:'none' }}>
                          <input type="checkbox" checked={checked} onChange={()=>toggleProduct(p.id,'completed_product_ids')} style={{ width:15, height:15 }}/>
                          <span style={{ fontSize:13, color: checked?'#10b981':'var(--navy)', fontWeight: checked?700:400 }}>{p.name}</span>
                          {checked && <i className="fa-solid fa-circle-check" style={{ color:'#10b981', fontSize:12 }}/>}
                        </label>
                      )
                    })}
                  </div>
                </Field>
              )}
            </div>

            {/* Drawer footer */}
            <div style={{ padding:'16px 24px', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0 }}>
              <button onClick={()=>setEditing(null)} style={{ padding:'10px 22px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'white', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13 }}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>
      {children}
    </div>
  )
}

function inp(disabled = false): React.CSSProperties {
  return {
    border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13,
    fontFamily: 'inherit', width: '100%', outline: 'none',
    background: disabled ? '#f9fafb' : 'white', color: '#111', cursor: disabled ? 'not-allowed' : 'text',
  }
}
