import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { CartItem } from '@/lib/types'

const PAYMONGO_BASE = 'https://api.paymongo.com/v1'
const USD_TO_PHP = Number(process.env.PAYMONGO_USD_TO_PHP_RATE ?? 57)

function pmAuth() {
  return 'Basic ' + Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin

  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  let userId: string | null = null

  if (token) {
    const auth = getBrowserSupabase()
    const { data: { user } } = await auth.auth.getUser(token)
    if (user) userId = user.id
  }

  const body = await request.json()
  const {
    items,
    total,
    coupon_code,
    discount_amount,
    guest_email,
  }: {
    items: CartItem[]
    total: number
    coupon_code?: string
    discount_amount?: number
    guest_email?: string
  } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (typeof total !== 'number' || !isFinite(total) || total <= 0 || total > 100000) {
    return NextResponse.json({ error: 'Invalid total' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  // Save a pending order so it exists before the redirect
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: userId,
      guest_email: !userId ? (guest_email?.toLowerCase().trim() ?? null) : null,
      items: items.map(i => ({
        id: i.id, name: i.name, price: i.price, qty: i.qty,
        img: i.img, via: i.via, category: i.category,
        bundle_price: i.bundle_price, bundle_label: i.bundle_label,
      })),
      total,
      discount_amount: discount_amount ?? 0,
      coupon_code: coupon_code ?? null,
      status: 'pending_payment',
      order_number: Math.floor(10000 + Math.random() * 90000),
    })
    .select()
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // Convert to PHP centavos (PayMongo requires PHP)
  const amountPhpCentavos = Math.round(total * USD_TO_PHP * 100)

  const itemLabel = items.length === 1
    ? items[0].name.slice(0, 200)
    : `${items.length} items from KRSELLIFY`

  const pmRes = await fetch(`${PAYMONGO_BASE}/checkout_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': pmAuth(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          reference_number: order.id,
          line_items: [
            {
              currency: 'PHP',
              amount: amountPhpCentavos,
              name: itemLabel,
              quantity: 1,
            },
          ],
          payment_method_types: ['gcash', 'paymaya', 'card'],
          success_url: `${origin}/order-success`,
          cancel_url: `${origin}/checkout`,
          metadata: { order_id: order.id },
        },
      },
    }),
  })

  const pmData = await pmRes.json()
  const checkoutUrl = pmData?.data?.attributes?.checkout_url

  if (!checkoutUrl) {
    // Clean up the pending order if PayMongo session creation failed
    await admin.from('orders').delete().eq('id', order.id)
    const pmError = pmData?.errors?.[0]?.detail ?? 'Failed to create payment session'
    return NextResponse.json({ error: pmError }, { status: 500 })
  }

  return NextResponse.json({
    checkout_url: checkoutUrl,
    order_id: order.id,
  })
}
