import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { verifyWebhookSignature } from '@/lib/airwallex'
import { fulfillAirwallexIntent } from '@/lib/airwallex-fulfill'

/**
 * Airwallex payment webhook — the authoritative path.
 *
 * The shopper's browser returning to /order-success is a convenience; this is
 * what guarantees an order still gets marked paid when they close the tab on
 * the payment page, lose signal, or the redirect is eaten by a bank's 3DS app.
 *
 * Register the endpoint in Airwallex → Developer → Webhooks, subscribe to the
 * payment_intent events, and put that subscription's secret in
 * AIRWALLEX_WEBHOOK_SECRET.
 */

// The signature covers the exact bytes Airwallex sent, so the body must be
// read as raw text. Parsing and re-serializing it reorders keys and the HMAC
// no longer matches.
export const dynamic = 'force-dynamic'

/** Pulls the payment intent id out of whichever event shape arrived. */
function readIntentId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const name = typeof b.name === 'string' ? b.name : ''
  const obj = (b.data as { object?: Record<string, unknown> } | undefined)?.object ?? {}

  // payment_intent.* events carry the intent itself; payment_attempt.* events
  // carry the attempt, which references its intent.
  if (name.startsWith('payment_intent'))
    return typeof obj.id === 'string' ? obj.id : null

  return typeof obj.payment_intent_id === 'string' ? obj.payment_intent_id : null
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  if (!verifyWebhookSignature({
    rawBody,
    timestamp: request.headers.get('x-timestamp'),
    signature: request.headers.get('x-signature'),
  })) {
    console.warn('[airwallex/webhook] rejected: bad signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const intentId = readIntentId(event)
  const eventName = (event as { name?: string })?.name ?? 'unknown'

  if (!intentId) {
    // An event we don't act on (a dispute, a refund, a payout). Acknowledge it
    // so Airwallex stops retrying — a 4xx here would queue redeliveries.
    return NextResponse.json({ received: true, ignored: eventName })
  }

  try {
    // fulfill re-reads the intent from Airwallex, so an event for an intent
    // that isn't SUCCEEDED yet simply no-ops and waits for the next one.
    const result = await fulfillAirwallexIntent(getAdminSupabase(), intentId)
    return NextResponse.json({ received: true, event: eventName, handled: result.ok })
  } catch (err) {
    console.error('[airwallex/webhook]', eventName, err)
    // 500 asks Airwallex to retry — the right call for a transient DB or
    // network failure, since the order is still sitting unpaid.
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
