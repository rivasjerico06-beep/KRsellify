import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { WIRE_ENABLED } from '@/lib/wire-config'
import { sendWireInstructions } from '@/lib/email'

/**
 * Creates an order to be paid by bank wire transfer.
 *
 * Unlike PayPal/PayMongo there is no online authorization — the customer wires
 * the money out-of-band. So the order is saved with status 'pending_payment'
 * and payment_method 'wire', the amount is computed server-side (never trusted
 * from the client), and an instructions email is sent. An admin marks the order
 * 'paid' once the funds land.
 */
export async function POST(request: Request) {
  try {
    if (!WIRE_ENABLED)
      return NextResponse.json({ error: 'Wire transfer is not available' }, { status: 400 })

    const { items, coupon_code, email, shipping_address, agent_code } = await request.json() as {
      items: { id: string; qty: number; bundle_label?: string; name?: string; img?: string; via?: string; category?: string; price?: number }[]
      coupon_code?: string
      email: string
      shipping_address?: Record<string, string>
      agent_code?: string
    }

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    if (!email?.trim())
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const attributedAgent = typeof agent_code === 'string' && /^\d{4,6}$/.test(agent_code) ? agent_code : null

    const authToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
    let userId: string | null = null
    if (authToken) {
      const { data: { user } } = await getBrowserSupabase().auth.getUser(authToken)
      if (user) userId = user.id
    }

    const admin = getAdminSupabase()
    const { data: dbProducts } = await admin
      .from('products')
      .select('id, name, price, quantity_options')
      .in('id', [...new Set(items.map(i => i.id))])

    if (!dbProducts?.length)
      return NextResponse.json({ error: 'Products not found' }, { status: 400 })

    const productMap = Object.fromEntries(dbProducts.map(p => [p.id, p]))

    // Authoritative amount — computed from DB prices, never the client total
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
    const grossAmount = amount

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

    const discountAmount = Math.max(0, grossAmount - amount)
    const orderNumber = Math.floor(10000 + Math.random() * 90000)

    // Persist the pending order. Retry without optional columns if they don't exist yet.
    const orderPayload = {
      user_id: userId,
      guest_email: !userId ? emailLower : null,
      items: items.map(i => ({
        id: i.id, name: productMap[i.id]?.name ?? i.name, price: i.price, qty: i.qty,
        img: i.img, via: i.via, category: i.category, bundle_label: i.bundle_label,
      })),
      total: Number(amount.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      coupon_code: coupon_code ?? null,
      status: 'pending_payment',
      payment_method: 'wire',
      order_number: orderNumber,
      shipping_address: shipping_address ?? null,
      agent_code: attributedAgent,
    }

    let { data: order, error: orderError } = await admin.from('orders').insert(orderPayload).select().single()
    if (orderError?.code === '42703') {
      const { shipping_address: _sa, agent_code: _ac, payment_method: _pm, ...base } = orderPayload
      ;({ data: order, error: orderError } = await admin.from('orders').insert(base).select().single())
    }

    if (orderError || !order)
      return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })

    // Email the customer their payment instructions (non-blocking)
    sendWireInstructions({
      to: email.trim(),
      name: (shipping_address?.firstName?.trim() || email.split('@')[0]),
      orderId: order.id,
      orderNumber: order.order_number,
      total: Number(amount.toFixed(2)),
    }).catch(() => {})

    return NextResponse.json({
      id: order.id,
      order_number: order.order_number,
      total: Number(amount.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
    })
  } catch (err) {
    console.error('[orders/create-wire]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
