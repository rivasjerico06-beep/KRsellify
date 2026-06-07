import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()

  const [ordersRes, authRes] = await Promise.all([
    admin.from('orders').select('user_id, guest_email, total, status, created_at').order('created_at', { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 })

  // Build email map from auth users
  const emailMap: Record<string, string> = {}
  for (const u of authRes.data?.users ?? []) {
    if (u.email) emailMap[u.id] = u.email
  }

  const map: Record<string, {
    email: string
    order_count: number
    total_spent: number
    first_order: string
    last_order: string
  }> = {}

  for (const o of ordersRes.data ?? []) {
    const email = (o.guest_email ?? (o.user_id ? emailMap[o.user_id] : null) ?? '').toLowerCase().trim()
    if (!email) continue

    if (!map[email]) {
      map[email] = { email, order_count: 0, total_spent: 0, first_order: o.created_at, last_order: o.created_at }
    }

    const entry = map[email]
    if (o.status !== 'cancelled') {
      entry.order_count += 1
      entry.total_spent += Number(o.total ?? 0)
    }
    if (o.created_at < entry.first_order) entry.first_order = o.created_at
    if (o.created_at > entry.last_order)  entry.last_order  = o.created_at
  }

  const result = Object.values(map).sort((a, b) => b.last_order.localeCompare(a.last_order))

  return NextResponse.json(result)
}
