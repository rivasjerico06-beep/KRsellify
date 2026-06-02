import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const body = await request.json()
  const { email } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  const { data: orders, error } = await admin
    .from('orders')
    .select('id, status, total, discount_amount, items, created_at, coupon_code')
    .eq('guest_email', email.toLowerCase().trim())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })

  return NextResponse.json({ orders: orders ?? [] })
}
