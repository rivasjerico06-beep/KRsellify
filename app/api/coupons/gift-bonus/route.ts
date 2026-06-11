import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

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
    const { orderID, choice } = await request.json() as { orderID: string; choice: 30 | 50 }

    if (!orderID) return NextResponse.json({ error: 'Missing orderID' }, { status: 400 })
    if (choice !== 30 && choice !== 50)
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 })

    // Capture the PayPal payment before issuing coupon
    const accessToken = await getPayPalToken()
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const captureData = await captureRes.json()
    if (captureData.status !== 'COMPLETED')
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })

    const authToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
    let userId: string | null = null
    if (authToken) {
      const { data: { user } } = await getBrowserSupabase().auth.getUser(authToken)
      if (user) userId = user.id
    }

    const admin = getAdminSupabase()
    const code = choice === 30 ? 'THEMAGA30' : 'THEMAGA50'

    await admin.from('coupons').insert({
      code,
      discount_pct: choice,
      min_spend: 0,
      user_id: userId ?? null,
      tier: 'gift_card_bonus',
    })

    return NextResponse.json({ code })
  } catch (err) {
    console.error('[coupons/gift-bonus]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
