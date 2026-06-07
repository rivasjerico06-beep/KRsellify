import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()

  const { data: orders, error } = await admin
    .from('orders')
    .select('customer_name, customer_email, guest_email, total, status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by email — coalesce customer_email and guest_email
  const map: Record<string, {
    email: string
    name: string
    order_count: number
    total_spent: number
    first_order: string
    last_order: string
  }> = {}

  for (const o of orders ?? []) {
    const email = (o.customer_email ?? o.guest_email ?? '').toLowerCase().trim()
    if (!email) continue

    if (!map[email]) {
      map[email] = {
        email,
        name: o.customer_name ?? '',
        order_count: 0,
        total_spent: 0,
        first_order: o.created_at,
        last_order: o.created_at,
      }
    }

    const entry = map[email]
    if (o.status !== 'cancelled') {
      entry.order_count += 1
      entry.total_spent += Number(o.total ?? 0)
    }
    if (o.created_at < entry.first_order) entry.first_order = o.created_at
    if (o.created_at > entry.last_order)  entry.last_order  = o.created_at
    // Use most recent name if available
    if (o.customer_name && o.created_at >= entry.last_order) entry.name = o.customer_name
  }

  const result = Object.values(map).sort((a, b) => b.last_order.localeCompare(a.last_order))

  return NextResponse.json(result)
}
