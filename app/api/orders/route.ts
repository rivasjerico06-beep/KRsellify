import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = getBrowserSupabase()
  const { data: { user } } = await auth.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdminSupabase()
  // Hide abandoned gateway redirects, but DO show pending WIRE orders — the
  // customer placed those deliberately and is waiting for payment verification.
  let { data, error } = await admin
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .or('status.neq.pending_payment,payment_method.eq.wire')
    .order('created_at', { ascending: false })
  // payment_method column may not exist yet — fall back to the old filter
  if (error?.code === '42703') {
    ;({ data, error } = await admin
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false }))
  }

  if (error) return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
