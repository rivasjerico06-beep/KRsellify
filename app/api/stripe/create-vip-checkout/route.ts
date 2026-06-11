import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const stripe = getStripe()
    const origin = request.headers.get('origin') ?? 'https://themagaoffers.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email.trim().toLowerCase(),
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Maga Offers VIP Membership',
            description: '30% off every order, exclusive access & early releases',
          },
          unit_amount: 2000,
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
