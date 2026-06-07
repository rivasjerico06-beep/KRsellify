import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

const PAYPAL_BASE = process.env.PAYPAL_API_URL ?? 'https://api-m.paypal.com'

async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${credentials}` },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token as string
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = getBrowserSupabase()
  const { data: { user } } = await auth.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscription_id } = await request.json()
  if (!subscription_id) return NextResponse.json({ error: 'Missing subscription_id' }, { status: 400 })

  // Verify the subscription is real and active with PayPal
  const accessToken = await getAccessToken()
  const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscription_id}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })
  const subData = await subRes.json()

  if (!subRes.ok || !['ACTIVE', 'APPROVED'].includes(subData.status)) {
    return NextResponse.json({ error: 'Subscription not active' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  // Upsert VIP subscription record
  const { error } = await admin.from('vip_subscriptions').upsert({
    user_id: user.id,
    paypal_subscription_id: subscription_id,
    status: 'active',
  }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })

  return NextResponse.json({ success: true })
}
