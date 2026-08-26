/**
 * AIRWALLEX — TURNING A SUCCEEDED INTENT INTO A PAID ORDER
 * --------------------------------------------------------
 * Shared by both things that can tell us a payment landed:
 *   - the shopper returning to /order-success from the hosted page
 *   - the payment_intent webhook
 *
 * They race, they retry, and either can arrive first (or twice, or never — a
 * shopper who closes the tab leaves only the webhook). So this function is
 * written to be safe to call any number of times for the same intent, and to
 * do the side effects — rewards, coupon burn, confirmation email — exactly
 * once no matter who gets there first.
 *
 * Nothing the caller says about the payment is believed. The intent is
 * re-read from Airwallex and only `SUCCEEDED` counts.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { retrievePaymentIntent } from './airwallex'
import { applyPostPaymentRewards, itemsHaveGiftCard } from './order-fulfillment'
import { sendOrderConfirmation } from './email'
import type { CartItem } from './types'

export type FulfillResult =
  | { ok: true; orderId: string; orderNumber: number | null; alreadyPaid: boolean; total: number }
  | { ok: false; reason: 'not_succeeded' | 'order_not_found' | 'amount_mismatch' | 'not_payable'; status?: string }

export async function fulfillAirwallexIntent(
  admin: SupabaseClient,
  intentId: string,
): Promise<FulfillResult> {
  // Authoritative: ask Airwallex, don't trust the caller.
  const intent = await retrievePaymentIntent(intentId)
  if (intent.status !== 'SUCCEEDED')
    return { ok: false, reason: 'not_succeeded', status: intent.status }

  // merchant_order_id is our own orders.id — set when the intent was created.
  const orderId = intent.merchant_order_id
  if (!orderId) return { ok: false, reason: 'order_not_found' }

  const { data: order } = await admin
    .from('orders')
    .select('id, order_number, status, total, discount_amount, items, user_id, guest_email, coupon_code, shipping_address')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return { ok: false, reason: 'order_not_found' }

  // Airwallex amounts are major units, same as orders.total, so these compare
  // directly. A mismatch means the intent and the order drifted apart — bail
  // rather than shipping goods against the wrong sum.
  if (Math.abs(Number(intent.amount) - Number(order.total)) > 0.005)
    return { ok: false, reason: 'amount_mismatch' }

  if (order.status === 'paid')
    return { ok: true, orderId: order.id, orderNumber: order.order_number, alreadyPaid: true, total: Number(order.total) }

  // Compare-and-swap. Postgres decides the winner: whichever of the webhook
  // and the browser return gets here first updates a row and gets it back,
  // the loser matches nothing and skips the side effects below. Without the
  // status guard both would email the customer.
  const paidPayload: Record<string, unknown> = {
    status: 'paid',
    payment_method: 'airwallex',
    airwallex_intent_id: intent.id,
  }
  let { data: claimed, error: claimError } = await admin
    .from('orders')
    .update(paidPayload)
    .eq('id', order.id)
    .eq('status', 'pending_payment')
    .select('id')

  // Same graceful-degradation pattern the rest of the codebase uses: the
  // optional column may not exist on a database that hasn't run the migration.
  if (claimError?.code === '42703') {
    const { airwallex_intent_id: _ai, ...base } = paidPayload
    ;({ data: claimed, error: claimError } = await admin
      .from('orders')
      .update(base)
      .eq('id', order.id)
      .eq('status', 'pending_payment')
      .select('id'))
  }

  if (claimError) throw new Error(`Failed to mark order paid: ${claimError.message}`)

  const total = Number(order.total)
  if (!claimed?.length) {
    // Either someone else claimed it between our read and our write, or the
    // order was never in a payable state (cancelled, refunded). Re-read rather
    // than assuming the first case — reporting a cancelled order as paid would
    // put a "Payment Confirmed" screen in front of a shopper we owe a refund.
    const { data: fresh } = await admin
      .from('orders').select('status').eq('id', order.id).maybeSingle()
    if (fresh?.status === 'paid')
      return { ok: true, orderId: order.id, orderNumber: order.order_number, alreadyPaid: true, total }
    return { ok: false, reason: 'not_payable', status: fresh?.status }
  }

  const items = Array.isArray(order.items) ? (order.items as CartItem[]) : []

  // Burn a single-use coupon only now that the money is actually in. Doing it
  // at intent-creation time would eat the customer's coupon every time they
  // opened the payment page and changed their mind.
  if (order.coupon_code && order.user_id) {
    await admin
      .from('coupons')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('code', String(order.coupon_code).toUpperCase().trim())
      .eq('user_id', order.user_id)
      .eq('is_used', false)
  }

  await applyPostPaymentRewards(admin, {
    userId: order.user_id ?? null,
    hasGiftCard: itemsHaveGiftCard(items),
  })

  const to = order.guest_email
    ?? (order.user_id
      ? await admin.auth.admin.getUserById(order.user_id).then(r => r.data?.user?.email ?? null).catch(() => null)
      : null)

  if (to) {
    const shipping = (order.shipping_address ?? null) as Record<string, string> | null
    const discount = Number(order.discount_amount ?? 0)
    sendOrderConfirmation({
      to,
      name: shipping?.firstName?.trim() || to.split('@')[0],
      orderId: order.id,
      orderNumber: order.order_number,
      items,
      total,
      discountAmount: discount > 0 ? discount : undefined,
      shippingAddress: shipping,
    }).catch(() => {})
  }

  return { ok: true, orderId: order.id, orderNumber: order.order_number, alreadyPaid: false, total }
}
