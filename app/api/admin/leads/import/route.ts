import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

function norm(k: string) {
  return k.trim().toLowerCase().replace(/\s+/g, '_')
}

const COL_MAP: Record<string, string> = {
  'billing_name':       'customer_name',
  'shipping_name':      'customer_name',
  'email':              'customer_email',
  'billing_phone':      'customer_phone',
  'shipping_street':    'billing_address',
  'billing_address1':   'billing_address',
  'shipping_address1':  'billing_address',
  'shipping_city':      'billing_city',
  'billing_city':       'billing_city',
  'shipping_zip':       'billing_zip',
  'billing_zip':        'billing_zip',
  'shipping_province':  'billing_province',
  'billing_province':   'billing_province',
  'shipping_country':   'billing_country',
  'billing_country':    'billing_country',
  'lineitem_name':      'product_interest',
  'lineitem_price':     'lineitem_price',
  'agent_name':         'assigned_agent_name',
  'tagging':            'tagging',
}

type RawRow = Record<string, string | number | null | undefined>

function mapRow(rawRow: RawRow): Record<string, string | number | null> {
  const row: Record<string, string | number | null> = { customer_name: '' }
  for (const [rawKey, rawVal] of Object.entries(rawRow)) {
    const field = COL_MAP[norm(rawKey)]
    if (!field) continue
    const val = String(rawVal ?? '').trim()
    if (!val || val === 'undefined' || val === 'null') continue
    row[field] = field === 'lineitem_price' ? (parseFloat(val) || null) : val
  }
  return row
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const admin = getAdminSupabase()

  let rawRows: RawRow[]

  if (Array.isArray(body.rows)) {
    // xlsx path: pre-parsed JSON rows from client
    rawRows = body.rows as RawRow[]
  } else if (body.content) {
    // CSV/TSV path
    const { content, delimiter = '\t' } = body
    const lines = (content as string).trim().split('\n').filter((l: string) => l.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: 'No data rows found' }, { status: 400 })
    }
    const headers = lines[0].split(delimiter).map((h: string) => h.trim())
    rawRows = lines.slice(1).map((line: string) => {
      const values = line.split(delimiter)
      const row: RawRow = {}
      headers.forEach((h: string, i: number) => { row[h] = (values[i] ?? '').trim() })
      return row
    })
  } else {
    return NextResponse.json({ error: 'content or rows required' }, { status: 400 })
  }

  // Map all raw rows to DB field names
  const mapped = rawRows
    .map(mapRow)
    .filter(r => {
      const phone = String(r.customer_phone ?? '').trim()
      return phone.length >= 7
    })
    .map(r => ({
      ...r,
      // Strip trailing .0 that Excel adds to numeric phone fields
      customer_phone: String(r.customer_phone).replace(/\.0$/, ''),
    }))

  if (mapped.length === 0) {
    return NextResponse.json({ error: 'No valid rows found (missing phone numbers)' }, { status: 400 })
  }

  const phones = [...new Set(mapped.map(r => String(r.customer_phone)))]

  // Find which phones already exist in the DB
  const { data: existing } = await admin
    .from('leads')
    .select('id, customer_phone')
    .in('customer_phone', phones)

  const existingPhones = new Set((existing ?? []).map(e => String(e.customer_phone)))

  const toInsert: Record<string, string | number | null>[] = mapped.filter(r => !existingPhones.has(String(r.customer_phone)))
  const toUpdate: Record<string, string | number | null>[] = mapped.filter(r => existingPhones.has(String(r.customer_phone)))

  let inserted = 0
  let updated = 0

  // Batch-insert new leads
  if (toInsert.length > 0) {
    const insRows = toInsert.map(r => ({ ...r, status: 'new', call_count: 0 }))
    const { data: ins, error: insErr } = await admin.from('leads').insert(insRows).select('id')
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    inserted = ins?.length ?? 0
  }

  // Update existing leads — only safe contact/address fields, never touch status/notes/agent
  const UPDATE_FIELDS = [
    'customer_name', 'customer_email',
    'billing_address', 'billing_city', 'billing_zip', 'billing_province', 'billing_country',
    'product_interest',
  ]
  for (const row of toUpdate) {
    const phone = String(row.customer_phone)
    const update: Record<string, unknown> = {}
    for (const f of UPDATE_FIELDS) {
      if (row[f] !== undefined && row[f] !== null && row[f] !== '') update[f] = row[f]
    }
    if (Object.keys(update).length > 0) {
      await admin.from('leads').update(update).eq('customer_phone', phone)
    }
    updated++
  }

  return NextResponse.json({ imported: inserted + updated, inserted, updated })
}
