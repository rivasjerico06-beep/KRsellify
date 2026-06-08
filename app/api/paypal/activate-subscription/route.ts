import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

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
  const { subscription_id, email } = await request.json()

  if (!subscription_id || !email?.trim()) {
    return NextResponse.json({ error: 'Missing subscription_id or email' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

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

  const { error } = await admin.from('vip_subscriptions').upsert({
    email: normalizedEmail,
    paypal_subscription_id: subscription_id,
    status: 'active',
  }, { onConflict: 'paypal_subscription_id' })

  if (error) return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })

  return NextResponse.json({ success: true })
}
