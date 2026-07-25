import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { normalizeWireConfig } from '@/lib/wire-config'
import { normalizePayLinkConfig, isSafePayLinkUrl, payLinkMatches } from '@/lib/pay-link'
import { getSiteConfig } from '@/lib/site-config'
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
    // Two ways to pay out-of-band: the bank details, or a hosted pay link.
    // Either being live is enough to accept the order; which one applies to
    // THIS cart is decided further down, once the total is known.
    const siteCfg = await getSiteConfig()
    const wire = normalizeWireConfig(siteCfg.wire_config)
    const payLink = normalizePayLinkConfig(siteCfg.pay_link)
    const wireAvailable = wire.enabled && !wire.maintenance
    const payLinkAvailable = payLink.enabled && !!payLink.url && isSafePayLinkUrl(payLink.url)
    if (!wireAvailable && !payLinkAvailable)
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

    // Authoritative amount + line items — priced from DB, never the client total
    type LineItem = { id: string; name: string; price: number; qty: number; img?: string; via?: string; category?: string; bundle_label?: string }
    const lineItems: LineItem[] = []
    let amount = 0
    for (const item of items) {
      const product = productMap[item.id]
      if (!product)
        return NextResponse.json({ error: `Product ${item.id} not found` }, { status: 400 })
      // Never trust the client's qty shape — clamp to a positive integer so a
      // crafted negative/fractional qty can't manipulate the total
      const qty = Math.floor(Number(item.qty))
      if (!Number.isFinite(qty) || qty < 1 || qty > 999)
        return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
      let unitPrice: number
      if (item.bundle_label && Array.isArray(product.quantity_options)) {
        const bundle = (product.quantity_options as { label: string; bundle_total: number }[])
          .find(o => o.label === item.bundle_label)
        if (!bundle)
          return NextResponse.json({ error: 'Bundle not found' }, { status: 400 })
        unitPrice = Number(bundle.bundle_total)
      } else {
        unitPrice = Number(product.price)
      }
      amount += unitPrice * qty
      lineItems.push({
        id: item.id, name: product.name, price: unitPrice, qty,
        img: item.img, via: item.via, category: item.category, bundle_label: item.bundle_label,
      })
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
        // Consume single-use (user-specific) coupons so they can't be reused
        // across multiple wire orders. Global promo codes stay reusable.
        if (coupon.user_id) {
          await admin.from('coupons')
            .update({ is_used: true, used_at: new Date().toISOString() })
            .eq('id', coupon.id)
        }
      }
    }

    if (!isFinite(amount) || amount <= 0)
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 })

    // The pay link collects a fixed amount, so re-check server-side that this
    // cart really is the product it covers at the price it charges. Without
    // this, a crafted request could bank a discounted order against a link
    // that would take the full price (or vice versa).
    const payableTotal = Number(amount.toFixed(2))
    const payLinkOk = payLinkAvailable && payLinkMatches(payLink, lineItems, payableTotal)
    if (!wireAvailable && !payLinkOk)
      return NextResponse.json(
        { error: 'This order can’t be paid online right now. Please contact support.' },
        { status: 400 },
      )

    const discountAmount = Math.max(0, grossAmount - amount)
    const orderNumber = Math.floor(10000 + Math.random() * 90000)

    // Persist the pending order. Retry without optional columns if they don't exist yet.
    const orderPayload = {
      user_id: userId,
      guest_email: !userId ? emailLower : null,
      items: lineItems,
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
      total: payableTotal,
      payLinkUrl: payLinkOk ? payLink.url : undefined,
    }).catch(() => {})

    return NextResponse.json({
      id: order.id,
      order_number: order.order_number,
      total: payableTotal,
      discount_amount: Number(discountAmount.toFixed(2)),
      pay_link_url: payLinkOk ? payLink.url : null,
    })
  } catch (err) {
    console.error('[orders/create-wire]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
