import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

const ALLOWED_FIELDS = [
  'name', 'description', 'price', 'compare_at_price', 'img', 'category',
  'tags', 'stock', 'sku', 'weight', 'dimensions', 'is_active', 'is_featured',
  'slug', 'quantity_options', 'badge', 'sort_order',
  'old_price', 'cat_label', 'is_sale', 'is_new', 'in_stock', 'rating', 'reviews_count',
]

function pickAllowed(body: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED_FIELDS.includes(k))
  )
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin.from('products').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const raw = await request.json()
  const body = pickAllowed(raw)
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const { data, error } = await admin.from('products').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const raw = await request.json()
  const { id, ...rest } = raw
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates = pickAllowed(rest)
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  const { data, error } = await admin.from('products').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await admin.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
