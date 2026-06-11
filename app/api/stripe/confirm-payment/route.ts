import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { CartItem } from '@/lib/types'
import { sendOrderConfirmation } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const TIERS = [
  { min: 2000, tier: 'platinum', pct: 50, label: 'PLATINUM50' },
  { min: 1000, tier: 'gold',     pct: 50, label: 'GOLD50' },
  { min: 500,  tier: 'silver',   pct: 30, label: 'SILVER30' },
]

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  let userId: string | null = null

  if (token) {
    const { data: { user } } = await getBrowserSupabase().auth.getUser(token)
    if (user) userId = user.id
  }

  const body = await request.json()
  const {
    payment_intent_id,
    items,
    coupon_code,
    guest_email,
  }: {
    payment_intent_id: string
    items: CartItem[]
    coupon_code?: string
    guest_email?: string
  } = body

  if (!payment_intent_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Verify payment with Stripe — amount comes from Stripe, never from client
  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

  if (paymentIntent.status !== 'succeeded') {
    return NextResponse.json({ error: 'Payment was not completed' }, { status: 400 })
  }

  const capturedAmount = paymentIntent.amount / 100

  const admin = getAdminSupabase()

  let appliedDiscount = 0
  let couponMarked = false

  if (coupon_code) {
    if (userId) {
      const { data: userCoupon } = await admin
        .from('coupons')
        .select('id, discount_pct, min_spend')
        .eq('code', coupon_code.toUpperCase().trim())
        .eq('user_id', userId)
        .eq('is_used', false)
        .maybeSingle()

      if (userCoupon && Number(userCoupon.min_spend ?? 0) <= capturedAmount) {
        appliedDiscount = capturedAmount * (userCoupon.discount_pct / 100)
        couponMarked = true
        await admin.from('coupons')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', userCoupon.id)
      }
    }

    if (!couponMarked) {
      const { data: globalCoupon } = await admin
        .from('coupons')
        .select('id, discount_pct, min_spend')
        .eq('code', coupon_code.toUpperCase().trim())
        .is('user_id', null)
        .maybeSingle()

      if (globalCoupon && Number(globalCoupon.min_spend ?? 0) <= capturedAmount) {
        appliedDiscount = capturedAmount * (globalCoupon.discount_pct / 100)
        await admin.from('coupons')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', globalCoupon.id)
      }
    }
  }

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      user_id: userId,
      guest_email: !userId ? (guest_email?.toLowerCase().trim() ?? null) : null,
      items: items.map(i => ({
        id: i.id, name: i.name, price: i.price, qty: i.qty,
        img: i.img, via: i.via, category: i.category,
      })),
      total: capturedAmount,
      discount_amount: appliedDiscount,
      coupon_code: coupon_code ?? null,
      status: 'paid',
      paypal_order_id: `stripe_${payment_intent_id}`,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })

  if (userId) {
    const { data: userOrders } = await admin
      .from('orders')
      .select('total, discount_amount')
      .eq('user_id', userId)
      .neq('status', 'cancelled')

    const totalSpent = (userOrders ?? []).reduce(
      (sum, o) => sum + Number(o.total) - Number(o.discount_amount ?? 0), 0
    )

    for (const { min, tier, pct, label } of TIERS) {
      if (totalSpent >= min) {
        const { data: existing } = await admin
          .from('coupons').select('id')
          .eq('user_id', userId).eq('tier', tier).maybeSingle()
        if (!existing) {
          const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
          await admin.from('coupons').insert({
            code: `${label}-${suffix}`,
            discount_pct: pct, min_spend: 0, user_id: userId, tier,
          })
        }
        break
      }
    }
  }

  let confirmEmail: string | undefined
  if (userId) {
    const { data: userRecord } = await admin.auth.admin.getUserById(userId)
    confirmEmail = userRecord?.user?.email
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
      items,
      total: capturedAmount,
      discountAmount: appliedDiscount > 0 ? appliedDiscount : undefined,
    }).catch(() => {})
  }

  return NextResponse.json(order, { status: 201 })
}
