import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

const VALID_STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { data: orders, error } = await admin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = [...new Set((orders ?? []).map(o => o.user_id).filter(Boolean) as string[])]
  if (userIds.length === 0) return NextResponse.json(orders ?? [])

  const [profilesRes, authRes] = await Promise.all([
    admin.from('profiles').select('id,full_name,phone,city,address').in('id', userIds),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const profileMap: Record<string, { full_name?: string | null; phone?: string | null; city?: string | null; address?: string | null }> = {}
  for (const p of profilesRes.data ?? []) profileMap[p.id] = p

  const emailMap: Record<string, string> = {}
  for (const u of authRes.data?.users ?? []) emailMap[u.id] = u.email ?? ''

  const enriched = (orders ?? []).map(o => ({
    ...o,
    customer_name:    o.user_id ? (profileMap[o.user_id]?.full_name ?? null)  : null,
    customer_email:   o.user_id ? (emailMap[o.user_id] ?? null)               : null,
    customer_phone:   o.user_id ? (profileMap[o.user_id]?.phone ?? null)      : null,
    customer_city:    o.user_id ? (profileMap[o.user_id]?.city ?? null)       : null,
    customer_address: o.user_id ? (profileMap[o.user_id]?.address ?? null)    : null,
  }))

  return NextResponse.json(enriched)
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const { data, error } = await admin.from('orders').update({ status }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
