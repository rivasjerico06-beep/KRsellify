import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAdminSupabase } from '@/lib/supabase-admin'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

export async function POST(request: Request) {
  try {
    const { session_id } = await request.json()
    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    const email = (session.customer_email ?? session.metadata?.email ?? '').toLowerCase().trim()
    if (!email) {
      return NextResponse.json({ error: 'No email on session' }, { status: 400 })
    }

    const admin = getAdminSupabase()

    // Check if already VIP for this email
    const { data: existing } = await admin
      .from('vip_subscriptions')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      await admin
        .from('vip_subscriptions')
        .update({ status: 'active', paypal_subscription_id: session.subscription as string })
        .eq('email', email)
    } else {
      await admin
        .from('vip_subscriptions')
        .insert({ email, paypal_subscription_id: session.subscription as string, status: 'active' })
    }

    return NextResponse.json({ ok: true, email })
  } catch (err) {
    console.error('[stripe/activate-vip]', err)
    const message = err instanceof Error ? err.message : 'Activation error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
