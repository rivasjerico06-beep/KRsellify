import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { sendOrderConfirmation } from '@/lib/email'
import crypto from 'crypto'

const TIERS = [
  { min: 2000, tier: 'platinum', pct: 50, label: 'PLATINUM50' },
  { min: 1000, tier: 'gold',     pct: 50, label: 'GOLD50' },
  { min: 500,  tier: 'silver',   pct: 30, label: 'SILVER30' },
]

interface OrderItemInput {
  id: string
  qty: number
  bundle_label?: string
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  let userId: string | null = null
  if (token) {
    const { data: { user } } = await getBrowserSupabase().auth.getUser(token)
    if (user) userId = user.id
  }

  const body = await request.json()
  const {
    source_id,
    items,
    coupon_code,
    email: checkoutEmail,
    guest_email,
  }: {
    source_id: string
    items: OrderItemInput[]
    coupon_code?: string
    email: string
    guest_email?: string
  } = body

  if (!source_id || !Array.isArray(items) || items.length === 0 || !checkoutEmail) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  // Fetch real prices from DB — never trust client
  const itemIds = [...new Set(items.map(i => i.id))]
  const { data: dbProducts } = await admin
    .from('products')
    .select('id, name, price, img, quantity_options')
    .in('id', itemIds)

  if (!dbProducts?.length) {
    return NextResponse.json({ error: 'Products not found' }, { status: 400 })
  }

  const productMap = Object.fromEntries(dbProducts.map(p => [p.id, p]))

  let amount = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderItems: any[] = []

  for (const item of items) {
    const product = productMap[item.id]
    if (!product) return NextResponse.json({ error: `Product ${item.id} not found` }, { status: 400 })

    let unitPrice = Number(product.price)
    let bundleQty = 1

    if (item.bundle_label && Array.isArray(product.quantity_options)) {
      const bundle = (product.quantity_options as { label: string; bundle_total: number; qty: number }[])
        .find(o => o.label === item.bundle_label)
      if (!bundle) return NextResponse.json({ error: 'Bundle option not found' }, { status: 400 })
      unitPrice = bundle.bundle_total
      bundleQty = bundle.qty
    }

    amount += unitPrice * item.qty
    orderItems.push({
      id: item.id,
      name: product.name,
      price: unitPrice,
      qty: item.qty,
      img: product.img,
      bundle_label: item.bundle_label,
      bundle_qty: bundleQty,
    })
  }

  // VIP 30% discount (email-based)
  const emailNorm = checkoutEmail.toLowerCase().trim()
  const { data: vipSub } = await admin
    .from('vip_subscriptions')
    .select('id')
    .eq('email', emailNorm)
    .eq('status', 'active')
    .maybeSingle()
  if (vipSub) amount = amount * 0.7

  // Coupon discount
  let couponRow: { id: string; discount_pct: number } | null = null
  if (coupon_code) {
    const { data: coupons } = await admin
      .from('coupons')
      .select('id, discount_pct, min_spend, user_id')
      .eq('code', coupon_code.toUpperCase().trim())
    const coupon = coupons?.find(c => (userId && c.user_id === userId) || !c.user_id)
    if (coupon && Number(coupon.min_spend ?? 0) <= amount) {
      couponRow = coupon
      amount = amount * (1 - coupon.discount_pct / 100)
    }
  }

  if (!isFinite(amount) || amount <= 0 || amount > 100000) {
    return NextResponse.json({ error: 'Invalid order total' }, { status: 400 })
  }

  // Charge via Square Payments API
  const squareRes = await fetch('https://connect.squareup.com/v2/payments', {
    method: 'POST',
    headers: {
      'Square-Version': '2024-06-04',
      'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_id,
      idempotency_key: crypto.randomUUID(),
      amount_money: {
        amount: Math.round(amount * 100),
        currency: 'USD',
      },
      buyer_email_address: checkoutEmail,
    }),
  })

  const squareData = await squareRes.json()
  if (!squareRes.ok || squareData.payment?.status !== 'COMPLETED') {
    const detail = squareData.errors?.[0]?.detail ?? squareData.errors?.[0]?.code ?? 'Payment declined'
    return NextResponse.json({ error: detail }, { status: 400 })
  }

  const paidAmount = squareData.payment.amount_money.amount / 100

  // Mark coupon as used and record discount amount
  let appliedDiscount = 0
  if (couponRow) {
    // discount = charged_amount * pct / (100 - pct)
    appliedDiscount = paidAmount * (couponRow.discount_pct / (100 - couponRow.discount_pct))
    await admin.from('coupons')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', couponRow.id)
  }

  // Save order
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: userId,
      guest_email: !userId ? (guest_email?.toLowerCase().trim() ?? null) : null,
      items: orderItems,
      total: paidAmount,
      discount_amount: appliedDiscount,
      coupon_code: coupon_code ?? null,
      status: 'paid',
      square_payment_id: squareData.payment.id,
    })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })

  // Auto-issue loyalty coupons for logged-in users
  if (userId) {
    const { data: userOrders } = await admin
      .from('orders')
      .select('total, discount_amount')
      .eq('user_id', userId)
      .neq('status', 'cancelled')

    const totalSpent = (userOrders ?? []).reduce(
      (s, o) => s + Number(o.total) - Number(o.discount_amount ?? 0), 0
    )

    for (const { min, tier, pct, label } of TIERS) {
      if (totalSpent >= min) {
        const { data: existing } = await admin.from('coupons').select('id')
          .eq('user_id', userId).eq('tier', tier).maybeSingle()
        if (!existing) {
          const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
          await admin.from('coupons').insert({
            code: `${label}-${suffix}`, discount_pct: pct, min_spend: 0, user_id: userId, tier,
          })
        }
        break
      }
    }
  }

  // Send confirmation email
  let confirmEmail: string | undefined
  if (userId) {
    const { data: rec } = await admin.auth.admin.getUserById(userId)
    confirmEmail = rec?.user?.email
  } else if (guest_email) {
    confirmEmail = guest_email
  }

  if (confirmEmail) {
    const name = userId
      ? await admin.from('profiles').select('full_name').eq('id', userId).single()
          .then(r => r.data?.full_name ?? confirmEmail!.split('@')[0])
      : confirmEmail.split('@')[0]

    sendOrderConfirmation({
      to: confirmEmail,
      name: typeof name === 'string' ? name : confirmEmail.split('@')[0],
      orderId: order.id,
      orderNumber: order.order_number,
      items: orderItems,
      total: paidAmount,
      discountAmount: appliedDiscount > 0 ? appliedDiscount : undefined,
    }).catch(() => {})
  }

  return NextResponse.json(order, { status: 201 })
}
