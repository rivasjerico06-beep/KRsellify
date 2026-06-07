import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ is_vip: false })

  const auth = getBrowserSupabase()
  const { data: { user } } = await auth.auth.getUser(token)
  if (!user) return NextResponse.json({ is_vip: false })

  const admin = getAdminSupabase()
  const { data } = await admin
    .from('vip_subscriptions')
    .select('status, paypal_subscription_id')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    is_vip: data?.status === 'active',
    status: data?.status ?? null,
  })
}
