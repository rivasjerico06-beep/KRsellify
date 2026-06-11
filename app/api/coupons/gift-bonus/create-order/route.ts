import { NextResponse } from 'next/server'

const PAYPAL_BASE = 'https://api-m.paypal.com'

async function getPayPalToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('PayPal auth failed')
  return data.access_token as string
}

export async function POST(request: Request) {
  try {
    const { choice } = await request.json() as { choice: 30 | 50 }
    if (choice !== 30 && choice !== 50)
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 })

    const amount = choice === 30 ? '30.00' : '50.00'
    const accessToken = await getPayPalToken()

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'PayPal-Request-Id': `bonus-${choice}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amount },
          description: `Maga Offers ${choice}% Discount Coupon`,
        }],
        application_context: {
          brand_name: 'Maga Offers',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    })

    const order = await res.json()
    if (!order.id)
      return NextResponse.json({ error: order.message ?? 'PayPal order failed' }, { status: 500 })

    return NextResponse.json({ id: order.id })
  } catch (err) {
    console.error('[gift-bonus/create-order]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
