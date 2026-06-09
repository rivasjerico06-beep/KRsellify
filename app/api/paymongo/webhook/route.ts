import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { sendOrderConfirmation } from '@/lib/email'
import { CartItem } from '@/lib/types'
import { createHmac, timingSafeEqual } from 'crypto'

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  // PayMongo signature format: t=timestamp,te=test_hash,li=live_hash
  const parts = Object.fromEntries(
    signature.split(',').map(p => p.split('=') as [string, string])
  )
  const timestamp = parts['t']
  const hash = parts['li'] ?? parts['te'] // li = live, te = test
  if (!timestamp || !hash) return false

  const message = `${timestamp}.${rawBody}`
  const expected = createHmac('sha256', secret).update(message).digest('hex')
  if (expected.length !== hash.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(hash))
}

export async function POST(request: Request) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET
  const rawBody = await request.text()

  if (secret) {
    const signature = request.headers.get('paymongo-signature') ?? ''
    if (!signature || !verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const attributes = (body?.data as Record<string, unknown>)?.attributes as Record<string, unknown>
  const eventType = attributes?.type as string
  const eventData = (attributes?.data as Record<string, unknown>)?.attributes as Record<string, unknown>

  if (eventType !== 'checkout_session.payment.paid') {
    return NextResponse.json({ received: true })
  }

  const orderId = (eventData?.metadata as Record<string, string>)?.order_id
    ?? (eventData?.reference_number as string)

  if (!orderId) return NextResponse.json({ received: true })

  const admin = getAdminSupabase()

  const { data: order } = await admin
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
    .select()
    .single()

  if (!order) return NextResponse.json({ received: true })

  // Mark coupon as used if applicable
  if (order.coupon_code) {
    await admin
      .from('coupons')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('code', (order.coupon_code as string).toUpperCase())
      .eq('is_used', false)
  }

  // Auto-issue loyalty coupons for logged-in users
  if (order.user_id) {
    const TIERS = [
      { min: 2000, tier: 'platinum', pct: 50, label: 'PLATINUM50' },
      { min: 1000, tier: 'gold',     pct: 50, label: 'GOLD50' },
      { min: 500,  tier: 'silver',   pct: 30, label: 'SILVER30' },
    ]
    const { data: userOrders } = await admin
      .from('orders')
      .select('total, discount_amount')
      .eq('user_id', order.user_id)
      .neq('status', 'cancelled')

    const totalSpent = (userOrders ?? []).reduce(
      (sum, o) => sum + Number(o.total) - Number(o.discount_amount ?? 0), 0
    )

    for (const { min, tier, pct, label } of TIERS) {
      if (totalSpent >= min) {
        const { data: existing } = await admin
          .from('coupons').select('id')
          .eq('user_id', order.user_id).eq('tier', tier).maybeSingle()
        if (!existing) {
          const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
          await admin.from('coupons').insert({
            code: `${label}-${suffix}`,
            discount_pct: pct, min_spend: 0, user_id: order.user_id, tier,
          })
        }
        break
      }
    }
  }

  // Send confirmation email
  let confirmEmail: string | undefined
  if (order.user_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(order.user_id)
    confirmEmail = authUser?.user?.email
  } else if (order.guest_email) {
    confirmEmail = order.guest_email
  }

  if (confirmEmail) {
    const name = order.user_id
      ? await admin.from('profiles').select('full_name').eq('id', order.user_id).single()
          .then(r => r.data?.full_name ?? (confirmEmail as string).split('@')[0])
      : confirmEmail.split('@')[0]

    sendOrderConfirmation({
      to: confirmEmail,
      name: typeof name === 'string' ? name : confirmEmail.split('@')[0],
      orderId: order.id,
      orderNumber: order.order_number,
      items: order.items as CartItem[],
      total: Number(order.total),
      discountAmount: Number(order.discount_amount) > 0 ? Number(order.discount_amount) : undefined,
    }).catch(() => {})
  }

  return NextResponse.json({ received: true })
}
