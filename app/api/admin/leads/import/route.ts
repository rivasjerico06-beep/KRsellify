import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

const COL_MAP: Record<string, string> = {
  'agent_name':       'assigned_agent_name',
  'tagging':          'tagging',
  'billing_phone':    'customer_phone',
  'billing_name':     'customer_name',
  'shipping_name':    'customer_name',
  'shipping_street':  'billing_address',
  'lineitem_name':    'product_interest',
  'lineitem_price':   'lineitem_price',
  'billing_address1': 'billing_address',
  'shipping_address1': 'billing_address',
  'shipping_city':    'billing_city',
  'billing_city':     'billing_city',
  'shipping_zip':     'billing_zip',
  'billing_zip':      'billing_zip',
  'shipping_province': 'billing_province',
  'billing_province': 'billing_province',
  'shipping_country': 'billing_country',
  'billing_country':  'billing_country',
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const { content, delimiter = '\t' } = body

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }

  const lines = content.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) {
    return NextResponse.json({ error: 'No data rows found' }, { status: 400 })
  }

  const headers = lines[0].split(delimiter).map(h =>
    h.trim().toLowerCase().replace(/\s+/g, '_')
  )

  const rows: Record<string, string | number | null>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter)
    const row: Record<string, string | number | null> = { status: 'new', call_count: 0, customer_name: '' }

    headers.forEach((header, idx) => {
      const field = COL_MAP[header]
      if (!field) return
      const val = (values[idx] ?? '').trim()
      if (!val) return
      row[field] = field === 'lineitem_price' ? (parseFloat(val) || null) : val
    })

    if (!row.customer_phone) continue
    rows.push(row)
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid rows found (missing phone numbers)' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('leads')
    .insert(rows)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: data?.length ?? 0 })
}
