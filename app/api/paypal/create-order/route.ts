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
    const { items, coupon_code, email } = await request.json() as {
      items: { id: string; qty: number; bundle_label?: string }[]
      coupon_code?: string
      email: string
    }

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    if (!email?.trim())
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const authToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
    let userId: string | null = null
    if (authToken) {
      const { data: { user } } = await getBrowserSupabase().auth.getUser(authToken)
      if (user) userId = user.id
    }

    const admin = getAdminSupabase()
    const { data: dbProducts } = await admin
      .from('products')
      .select('id, price, quantity_options')
      .in('id', [...new Set(items.map(i => i.id))])

    if (!dbProducts?.length)
      return NextResponse.json({ error: 'Products not found' }, { status: 400 })

    const productMap = Object.fromEntries(dbProducts.map(p => [p.id, p]))
    let amount = 0

    for (const item of items) {
      const product = productMap[item.id]
      if (!product)
        return NextResponse.json({ error: `Product ${item.id} not found` }, { status: 400 })
      if (item.bundle_label && Array.isArray(product.quantity_options)) {
        const bundle = (product.quantity_options as { label: string; bundle_total: number }[])
          .find(o => o.label === item.bundle_label)
        if (!bundle)
          return NextResponse.json({ error: 'Bundle not found' }, { status: 400 })
        amount += bundle.bundle_total * item.qty
      } else {
        amount += Number(product.price) * item.qty
      }
    }

    // VIP discount
    const emailLower = email.trim().toLowerCase()
    const { data: vipSub } = await admin
      .from('vip_subscriptions')
      .select('id')
      .eq('email', emailLower)
      .eq('status', 'active')
      .maybeSingle()
    if (vipSub) amount = amount * 0.7

    // Coupon discount
    if (coupon_code) {
      const { data: coupons } = await admin
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase().trim())
      const coupon = coupons?.find(c =>
        (userId && c.user_id === userId && !c.is_used) || (!c.user_id && !c.is_used)
      )
      if (coupon && Number(coupon.min_spend ?? 0) <= amount) {
        amount = amount * (1 - coupon.discount_pct / 100)
      }
    }

    if (!isFinite(amount) || amount <= 0)
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 })

    const accessToken = await getPayPalToken()
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'PayPal-Request-Id': `mo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amount.toFixed(2) },
          description: 'Maga Offers Order',
          payee: { merchant_id: process.env.PAYPAL_MERCHANT_ID },
        }],
        application_context: {
          brand_name: 'Maga Offers',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    })

    const order = await res.json()
    if (!order.id)
      return NextResponse.json({ error: order.message ?? 'PayPal order creation failed' }, { status: 500 })

    return NextResponse.json({ id: order.id })
  } catch (err) {
    console.error('[paypal/create-order]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
