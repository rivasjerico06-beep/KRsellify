import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request) {
  const body = await request.json()
  const { email } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const normalised = email.toLowerCase().trim()
  if (!EMAIL_REGEX.test(normalised) || normalised.length > 254) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  const { data: orders, error } = await admin
    .from('orders')
    .select('id, order_number, status, total, discount_amount, items, created_at')
    .eq('guest_email', normalised)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })

  return NextResponse.json({ orders: orders ?? [] })
}
