import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { resolveAgentCode } from '@/lib/agent-attribution'
import { getSiteConfig } from '@/lib/site-config'
import { createPaymentIntent, isAirwallexConfigured, airwallexEnv } from '@/lib/airwallex'

/**
 * Starts an Airwallex Hosted Payment Page checkout.
 *
 * The order is recorded BEFORE the customer is sent to Airwallex — otherwise
 * they pay on an external page and we have no name, address or line items to
 * ship against. It is saved as 'pending_payment' and only becomes 'paid' when
 * the payment is confirmed back against the Airwallex API (see
 * lib/airwallex-fulfill.ts), never on the client's say-so.
 *
 * The total is priced from the database here, exactly like the wire flow: the
 * client's cart is treated as a list of ids and quantities, nothing more.
 */

// ISO-3166 alpha-2 for the countries the checkout offers. Airwallex uses the
// country to decide which payment methods to show on the hosted page; an
// unknown country just falls back to US rather than blocking the sale.
const COUNTRY_CODES: Record<string, string> = {
  'United States': 'US', 'Philippines': 'PH', 'Canada': 'CA', 'United Kingdom': 'GB',
  'Australia': 'AU', 'New Zealand': 'NZ', 'Germany': 'DE', 'France': 'FR',
  'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL', 'Belgium': 'BE',
  'Switzerland': 'CH', 'Austria': 'AT', 'Sweden': 'SE', 'Norway': 'NO',
  'Denmark': 'DK', 'Finland': 'FI', 'Japan': 'JP', 'South Korea': 'KR',
  'Singapore': 'SG', 'Malaysia': 'MY', 'Thailand': 'TH', 'Indonesia': 'ID',
  'Vietnam': 'VN', 'India': 'IN', 'UAE': 'AE', 'Saudi Arabia': 'SA',
  'Mexico': 'MX', 'Brazil': 'BR', 'Argentina': 'AR', 'Colombia': 'CO',
  'Chile': 'CL', 'South Africa': 'ZA', 'Nigeria': 'NG',
}

function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return new URL(request.url).origin
}

export async function POST(request: Request) {
  try {
    if (!isAirwallexConfigured())
      return NextResponse.json({ error: 'Card payments are not available right now.' }, { status: 503 })

    const siteCfg = await getSiteConfig()
    if (siteCfg.payments_config.maintenance)
      return NextResponse.json({ error: 'Card payments are temporarily unavailable.' }, { status: 503 })

    const { items, coupon_code, email, shipping_address, agent_code } = await request.json() as {
      items: { id: string; qty: number; bundle_label?: string; img?: string; via?: string; category?: string }[]
      coupon_code?: string
      email: string
      shipping_address?: Record<string, string>
      agent_code?: string
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

    // Credit the referring agent only if the code maps to a live, approved
    // agent — a suspended agent's old links must not keep earning
    const attributedAgent = await resolveAgentCode(admin, agent_code)

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

    // Coupon discount. Unlike the wire flow, a single-use coupon is NOT burnt
    // here — an abandoned redirect would eat it. It is consumed once the
    // payment actually succeeds, in lib/airwallex-fulfill.ts.
    let appliedCoupon: string | null = null
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
        appliedCoupon = coupon_code.toUpperCase().trim()
      }
    }

    const payableTotal = Number(amount.toFixed(2))
    if (!isFinite(payableTotal) || payableTotal <= 0 || payableTotal > 100000)
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 })

    const discountAmount = Math.max(0, grossAmount - payableTotal)
    const orderNumber = Math.floor(10000 + Math.random() * 90000)

    const orderPayload = {
      user_id: userId,
      guest_email: !userId ? emailLower : null,
      items: lineItems,
      total: payableTotal,
      discount_amount: Number(discountAmount.toFixed(2)),
      coupon_code: appliedCoupon,
      status: 'pending_payment',
      payment_method: 'airwallex',
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

    // merchant_order_id is how the webhook finds its way back to this row.
    const intent = await createPaymentIntent({
      amount: payableTotal,
      currency: 'USD',
      merchantOrderId: order.id,
      returnUrl: `${siteOrigin(request)}/order-success`,
      customer: {
        email: emailLower,
        first_name: shipping_address?.firstName?.trim() || undefined,
        last_name: shipping_address?.lastName?.trim() || undefined,
      },
      metadata: { order_number: String(order.order_number ?? '') },
    })

    // Best-effort backfill so the intent can be traced from the admin order
    // list. The column is optional; a database without the migration still
    // reconciles fine via merchant_order_id.
    await admin.from('orders').update({ airwallex_intent_id: intent.id }).eq('id', order.id)

    return NextResponse.json({
      order_id: order.id,
      order_number: order.order_number,
      total: payableTotal,
      discount_amount: Number(discountAmount.toFixed(2)),
      intent_id: intent.id,
      client_secret: intent.client_secret,
      currency: 'USD',
      country_code: COUNTRY_CODES[shipping_address?.country ?? ''] ?? 'US',
      // Served from the server so the browser can never disagree with the
      // environment the intent was actually created in.
      env: airwallexEnv(),
    })
  } catch (err) {
    console.error('[airwallex/create-intent]', err)
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 500 })
  }
}
