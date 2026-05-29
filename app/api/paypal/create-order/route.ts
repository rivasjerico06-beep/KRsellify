import { NextResponse } from 'next/server'
import { getBrowserSupabase } from '@/lib/supabase-browser'

const PAYPAL_BASE = process.env.PAYPAL_API_URL ?? 'https://api-m.sandbox.paypal.com'

async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
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

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = getBrowserSupabase()
  const { data: { user } } = await auth.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount } = await request.json()
  if (typeof amount !== 'number' || amount <= 0 || amount > 100000) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const accessToken = await getAccessToken()

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toFixed(2),
        },
        description: 'KRSELLIFY Collectibles Order',
      }],
      application_context: {
        brand_name: 'KRSELLIFY',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    }),
  })

  const order = await res.json()
  if (!order.id) {
    return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
  }

  return NextResponse.json({ id: order.id })
}
