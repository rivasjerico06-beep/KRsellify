import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAdminSupabase } from '@/lib/supabase-admin'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(key)
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  try {
    switch (event.type) {
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await admin
          .from('vip_subscriptions')
          .update({ status: 'cancelled' })
          .eq('paypal_subscription_id', sub.id)
        console.log(`[stripe/webhook] VIP cancelled for subscription ${sub.id}`)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const status =
          sub.status === 'active' ? 'active' :
          sub.status === 'past_due' ? 'past_due' :
          sub.status === 'canceled' ? 'cancelled' :
          sub.status === 'unpaid' ? 'cancelled' : null

        if (status) {
          await admin
            .from('vip_subscriptions')
            .update({ status })
            .eq('paypal_subscription_id', sub.id)
          console.log(`[stripe/webhook] VIP status → ${status} for subscription ${sub.id}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
        if (subId) {
          await admin
            .from('vip_subscriptions')
            .update({ status: 'past_due' })
            .eq('paypal_subscription_id', subId)
          console.log(`[stripe/webhook] VIP set past_due for subscription ${subId}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        // Only reactivate on subscription renewal cycles (not the initial payment)
        if (invoice.billing_reason === 'subscription_cycle') {
          const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
          if (subId) {
            await admin
              .from('vip_subscriptions')
              .update({ status: 'active' })
              .eq('paypal_subscription_id', subId)
            console.log(`[stripe/webhook] VIP reactivated for subscription ${subId}`)
          }
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
