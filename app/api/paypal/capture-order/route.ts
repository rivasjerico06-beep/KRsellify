import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { CartItem } from '@/lib/types'
import { sendOrderConfirmation } from '@/lib/email'
import { applyPostPaymentRewards } from '@/lib/order-fulfillment'

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
    const { orderID, items, coupon_code, email, shipping_address, agent_code } = await request.json() as {
      orderID: string
      items: CartItem[]
      coupon_code?: string
      email: string
      shipping_address?: Record<string, string>
      agent_code?: string
    }

    // Only accept a clean 4–6 digit agent ID (from an agent's generated link)
    const attributedAgent = typeof agent_code === 'string' && /^\d{4,6}$/.test(agent_code) ? agent_code : null

    if (!orderID)
      return NextResponse.json({ error: 'Missing PayPal order ID' }, { status: 400 })
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'No items' }, { status: 400 })

    const authToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
    let userId: string | null = null
    if (authToken) {
      const { data: { user } } = await getBrowserSupabase().auth.getUser(authToken)
      if (user) userId = user.id
    }

    // Capture the PayPal order
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

    // Authoritative amount comes from PayPal, never the client
    const capturedAmount = parseFloat(
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? '0'
    )
    if (!capturedAmount)
      return NextResponse.json({ error: 'Could not read captured amount' }, { status: 500 })

    const admin = getAdminSupabase()

    // Check for discount/gift card by querying real product names from DB
    const { data: dbProducts } = await admin
      .from('products')
      .select('id, name')
      .in('id', [...new Set(items.map(i => i.id))])
    const hasGiftCard = dbProducts?.some(p => {
      const n = p.name.toLowerCase()
      return n.includes('gift card') || n.includes('discount card')
    }) ?? false

    // Coupon handling
    let appliedDiscount = 0
    let couponMarked = false
    if (coupon_code) {
      const code = coupon_code.toUpperCase().trim()
      if (userId) {
        const { data: userCoupon } = await admin
          .from('coupons')
          .select('id, discount_pct, min_spend')
          .eq('code', code)
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
          .eq('code', code)
          .is('user_id', null)
          .eq('is_used', false)
          .maybeSingle()
        if (globalCoupon && Number(globalCoupon.min_spend ?? 0) <= capturedAmount) {
          appliedDiscount = capturedAmount * (globalCoupon.discount_pct / 100)
          // Global promo codes are reusable — not marked as used
        }
      }
    }

    // Create order in DB — try with shipping_address, fall back without if column not yet added
    const orderPayload = {
      user_id: userId,
      guest_email: !userId ? (email?.toLowerCase().trim() ?? null) : null,
      items: items.map(i => ({
        id: i.id, name: i.name, price: i.price, qty: i.qty,
        img: i.img, via: i.via, category: i.category,
      })),
      total: capturedAmount,
      discount_amount: appliedDiscount,
      coupon_code: coupon_code ?? null,
      status: 'paid',
      paypal_order_id: orderID,
      order_number: Math.floor(10000 + Math.random() * 90000),
      shipping_address: shipping_address ?? null,
      agent_code: attributedAgent,
    }

    let { data: order, error: orderError } = await admin.from('orders').insert(orderPayload).select().single()

    // A column may not exist yet — retry without the optional ones
    if (orderError?.code === '42703') {
      const { shipping_address: _sa, agent_code: _ac, ...payloadWithout } = orderPayload
      ;({ data: order, error: orderError } = await admin.from('orders').insert(payloadWithout).select().single())
    }

    if (orderError || !order)
      return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })

    // Issue gift-card + loyalty rewards for this paid order
    await applyPostPaymentRewards(admin, { userId, hasGiftCard })

    // Send confirmation email
    const confirmEmail = userId
      ? await admin.auth.admin.getUserById(userId).then(r => r.data?.user?.email)
      : email?.trim()

    if (confirmEmail) {
      const name = userId
        ? await admin.from('profiles').select('full_name').eq('id', userId).single()
            .then(r => r.data?.full_name ?? confirmEmail.split('@')[0])
        : confirmEmail.split('@')[0]
      sendOrderConfirmation({
        to: confirmEmail,
        name: typeof name === 'string' ? name : confirmEmail.split('@')[0],
        orderId: order.id,
        orderNumber: order.order_number,
        items,
        total: capturedAmount,
        discountAmount: appliedDiscount > 0 ? appliedDiscount : undefined,
        shippingAddress: shipping_address,
      }).catch(() => {})
    }

    return NextResponse.json({ ...order, has_gift_card: hasGiftCard })
  } catch (err) {
    console.error('[paypal/capture-order]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
