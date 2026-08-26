import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { fulfillAirwallexIntent } from '@/lib/airwallex-fulfill'

/**
 * Called by /order-success when the shopper lands back from the Airwallex
 * hosted page. Its job is to make the success screen truthful *immediately*
 * rather than waiting on the webhook, which can take a few seconds.
 *
 * The intent id in the query string is attacker-controllable, so it is only
 * ever used as a lookup key: the real state comes from re-reading the intent
 * at Airwallex, and the order is only touched if that intent's
 * merchant_order_id points at it and the amount matches.
 */
export async function POST(request: Request) {
  try {
    const { intent_id } = await request.json() as { intent_id?: string }
    if (!intent_id?.trim())
      return NextResponse.json({ error: 'Missing intent_id' }, { status: 400 })

    const result = await fulfillAirwallexIntent(getAdminSupabase(), intent_id.trim())

    if (!result.ok) {
      // Not an error the shopper caused — the payment may simply still be
      // processing. The webhook will finish the job.
      return NextResponse.json({ paid: false, reason: result.reason, status: result.status ?? null })
    }

    return NextResponse.json({
      paid: true,
      order_id: result.orderId,
      order_number: result.orderNumber,
      total: result.total,
    })
  } catch (err) {
    console.error('[airwallex/confirm]', err)
    return NextResponse.json({ error: 'Could not confirm payment' }, { status: 500 })
  }
}
