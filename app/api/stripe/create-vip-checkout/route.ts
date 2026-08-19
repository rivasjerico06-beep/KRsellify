import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { DEFAULT_CONFIG } from '@/lib/site-config'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

async function getVipPrice(): Promise<number> {
  try {
    const admin = getAdminSupabase()
    const { data } = await admin
      .from('site_config')
      .select('value')
      .eq('key', 'vip_price')
      .maybeSingle()
    return typeof data?.value === 'number' ? data.value : DEFAULT_CONFIG.vip_price
  } catch {
    return DEFAULT_CONFIG.vip_price
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const [stripe, vipPrice] = await Promise.all([
      Promise.resolve(getStripe()),
      getVipPrice(),
    ])
    const origin = request.headers.get('origin') ?? 'https://themagaoffers.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email.trim().toLowerCase(),
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'PATRIOT’S ONLINE SHOP VIP Membership',
            description: '30% off every order, exclusive access & early releases',
          },
          unit_amount: Math.round(vipPrice * 100),
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: `${origin}/vip/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/vip`,
      metadata: { email: email.trim().toLowerCase() },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/create-vip-checkout]', err)
    const message = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
