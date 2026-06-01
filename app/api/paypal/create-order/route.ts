import { NextResponse } from 'next/server'

const PAYPAL_BASE = process.env.PAYPAL_API_URL ?? 'https://api-m.sandbox.paypal.com'

async function getAccessToken() {
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

export async function POST(request: Request) {
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
        description: 'THE MAGA OFFERS Collectibles Order',
      }],
      application_context: {
        brand_name: 'THE MAGA OFFERS',
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
