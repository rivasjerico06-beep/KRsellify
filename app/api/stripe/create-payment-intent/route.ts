import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
  return new Stripe(key)
}

interface OrderItem {
  id: string
  qty: number
  bundle_label?: string
}

export async function POST(request: Request) {
  try {
  const body = await request.json()
  const { items, coupon_code, email: checkoutEmail }: { items: OrderItem[]; coupon_code?: string; email?: string } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  const itemIds = [...new Set(items.map(i => i.id))]
  const { data: dbProducts } = await admin
    .from('products')
    .select('id, price, quantity_options')
    .in('id', itemIds)

  if (!dbProducts?.length) {
    return NextResponse.json({ error: 'Products not found' }, { status: 400 })
  }

  const productMap = Object.fromEntries(dbProducts.map(p => [p.id, p]))

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

  const authToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  let userId: string | null = null
  if (authToken) {
    const { data: { user } } = await getBrowserSupabase().auth.getUser(authToken)
    if (user) userId = user.id
  }

  const emailToCheck = checkoutEmail?.toLowerCase().trim() ?? null
  if (emailToCheck) {
    const { data: vipSub } = await admin
      .from('vip_subscriptions')
      .select('id')
      .eq('email', emailToCheck)
      .eq('status', 'active')
      .maybeSingle()
    if (vipSub) amount = amount * 0.7
  }

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

  if (!isFinite(amount) || amount <= 0 || amount > 100000) {
    return NextResponse.json({ error: 'Invalid order total' }, { status: 400 })
  }

  const stripe = getStripe()
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    payment_method_types: ['card'],
    metadata: {
      email: checkoutEmail ?? '',
      coupon_code: coupon_code ?? '',
    },
  })

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[stripe/create-payment-intent]', err)
    const message = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
