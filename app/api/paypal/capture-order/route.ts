import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { CartItem } from '@/lib/types'
import { sendOrderConfirmation } from '@/lib/email'

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

const TIERS = [
  { min: 2000, tier: 'platinum', pct: 50, label: 'PLATINUM50' },
  { min: 1000, tier: 'gold',     pct: 50, label: 'GOLD50' },
  { min: 500,  tier: 'silver',   pct: 30, label: 'SILVER30' },
]

export async function POST(request: Request) {
  // Auth is optional — guests can pay without an account
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  let userId: string | null = null

  if (token) {
    const auth = getBrowserSupabase()
    const { data: { user } } = await auth.auth.getUser(token)
    if (user) userId = user.id
  }

  const body = await request.json()
  const {
    paypal_order_id,
    items,
    total,
    coupon_code,
    discount_amount,
    guest_email,
  }: {
    paypal_order_id: string
    items: CartItem[]
    total: number
    coupon_code?: string
    discount_amount?: number
    guest_email?: string
  } = body

  if (!paypal_order_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (typeof total !== 'number' || !isFinite(total) || total <= 0 || total > 100000) {
    return NextResponse.json({ error: 'Invalid total' }, { status: 400 })
  }

  // Capture the PayPal payment first — money moves here
  const accessToken = await getAccessToken()
  const captureRes = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${paypal_order_id}/capture`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )
  const capture = await captureRes.json()

  if (capture.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'Payment was not completed' }, { status: 400 })
  }

  // Use PayPal's verified captured amount — never trust the client-supplied total
  const capturedAmount = parseFloat(
    capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? '0'
  )
  if (!capturedAmount || capturedAmount <= 0) {
    return NextResponse.json({ error: 'Could not verify captured amount' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  // Validate and mark coupon as used — always recalculate from scratch, never trust client's discount_amount
  let appliedDiscount = 0
  let couponMarked = false

  if (coupon_code) {
    // User-specific coupon (logged-in users only)
    if (userId) {
      const { data: userCoupon } = await admin
        .from('coupons')
        .select('id, discount_pct, min_spend, is_used')
        .eq('code', coupon_code.toUpperCase().trim())
        .eq('user_id', userId)
        .maybeSingle()

      if (userCoupon && !userCoupon.is_used && Number(userCoupon.min_spend ?? 0) <= total) {
        appliedDiscount = total * (userCoupon.discount_pct / 100)
        couponMarked = true
        await admin
          .from('coupons')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', userCoupon.id)
      }
    }

    // Global coupon (no user_id) — works for guests and logged-in users who had no personal coupon
    if (!couponMarked) {
      const { data: globalCoupon } = await admin
        .from('coupons')
        .select('id, discount_pct, min_spend, is_used')
        .eq('code', coupon_code.toUpperCase().trim())
        .is('user_id', null)
        .eq('is_used', false)
        .maybeSingle()

      if (globalCoupon && !globalCoupon.is_used && Number(globalCoupon.min_spend ?? 0) <= total) {
        appliedDiscount = total * (globalCoupon.discount_pct / 100)
        await admin
          .from('coupons')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('id', globalCoupon.id)
      }
    }
  }

  // Save order as paid (only after confirmed PayPal capture)
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
      paypal_order_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })

  // Auto-issue loyalty coupons for logged-in users only
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

  // Send confirmation email (non-blocking)
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
      items,
      total: capturedAmount,
      discountAmount: appliedDiscount > 0 ? appliedDiscount : undefined,
    }).catch(() => {})
  }

  return NextResponse.json(order, { status: 201 })
}
