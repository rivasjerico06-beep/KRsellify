import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

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

interface OrderItem {
  id: string
  qty: number
  bundle_label?: string
}

export async function POST(request: Request) {
  const body = await request.json()
  const { items, coupon_code }: { items: OrderItem[]; coupon_code?: string } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  // Fetch real prices from DB — client-supplied prices are never trusted
  const itemIds = [...new Set(items.map(i => i.id))]
  const { data: dbProducts } = await admin
    .from('products')
    .select('id, price, quantity_options')
    .in('id', itemIds)

  if (!dbProducts?.length) {
    return NextResponse.json({ error: 'Products not found' }, { status: 400 })
  }

  const productMap = Object.fromEntries(dbProducts.map(p => [p.id, p]))

  // Compute total from DB prices only
  let amount = 0
  for (const item of items) {
    const product = productMap[item.id]
    if (!product) return NextResponse.json({ error: `Product ${item.id} not found` }, { status: 400 })

    if (item.bundle_label && Array.isArray(product.quantity_options)) {
      const bundle = (product.quantity_options as { label: string; bundle_total: number }[])
        .find(o => o.label === item.bundle_label)
      if (!bundle) return NextResponse.json({ error: 'Bundle option not found' }, { status: 400 })
      amount += bundle.bundle_total * item.qty
    } else {
      amount += Number(product.price) * item.qty
    }
  }

  // Resolve the authenticated user once — used for both VIP and coupon checks
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  let userId: string | null = null
  if (authToken) {
    const { data: { user } } = await getBrowserSupabase().auth.getUser(authToken)
    if (user) userId = user.id
  }

  // Apply VIP 30% discount if user is an active VIP subscriber
  if (userId) {
    const { data: vipSub } = await admin
      .from('vip_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    if (vipSub) {
      amount = amount * 0.7
    }
  }

  // Apply coupon discount if provided — does NOT mark the coupon as used yet
  if (coupon_code) {
    const { data: coupons } = await admin
      .from('coupons')
      .select('*')
      .eq('code', coupon_code.toUpperCase().trim())

    const coupon = coupons?.find(c => (userId && c.user_id === userId) || !c.user_id)
    if (coupon && Number(coupon.min_spend ?? 0) <= amount) {
      amount = amount * (1 - coupon.discount_pct / 100)
    }
  }

  if (!isFinite(amount) || amount <= 0 || amount > 100000) {
    return NextResponse.json({ error: 'Invalid order total' }, { status: 400 })
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
        description: 'MAGA OFFERS Collectibles Order',
      }],
      application_context: {
        brand_name: 'MAGA OFFERS',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        landing_page: 'BILLING',
      },
    }),
  })

  const order = await res.json()
  if (!order.id) {
    return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
  }

  return NextResponse.json({ id: order.id })
}
