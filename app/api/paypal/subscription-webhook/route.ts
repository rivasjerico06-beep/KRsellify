import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

const PAYPAL_BASE = process.env.PAYPAL_API_URL ?? 'https://api-m.paypal.com'

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token as string
}

async function verifyWebhookSignature(
  headers: Headers,
  rawBody: string,
  webhookId: string,
  accessToken: string
): Promise<boolean> {
  const payload = {
    auth_algo: headers.get('paypal-auth-algo'),
    cert_url: headers.get('paypal-cert-url'),
    transmission_id: headers.get('paypal-transmission-id'),
    transmission_sig: headers.get('paypal-transmission-sig'),
    transmission_time: headers.get('paypal-transmission-time'),
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  }

  const res = await fetch(
    `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  )
  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}

export async function POST(request: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  const rawBody = await request.text()

  // Verify signature if webhook ID is configured
  if (webhookId) {
    try {
      const accessToken = await getAccessToken()
      const valid = await verifyWebhookSignature(request.headers, rawBody, webhookId, accessToken)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }
  }

  const body = JSON.parse(rawBody)
  const { event_type, resource } = body

  const admin = getAdminSupabase()

  if (event_type === 'BILLING.SUBSCRIPTION.CANCELLED' || event_type === 'BILLING.SUBSCRIPTION.EXPIRED') {
    await admin
      .from('vip_subscriptions')
      .update({ status: 'cancelled' })
      .eq('paypal_subscription_id', resource.id)
  }

  if (event_type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
    await admin
      .from('vip_subscriptions')
      .update({ status: 'suspended' })
      .eq('paypal_subscription_id', resource.id)
  }

  if (event_type === 'BILLING.SUBSCRIPTION.REACTIVATED' || event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    await admin
      .from('vip_subscriptions')
      .update({ status: 'active' })
      .eq('paypal_subscription_id', resource.id)
  }

  return NextResponse.json({ received: true })
}
