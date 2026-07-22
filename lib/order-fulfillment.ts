import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Rewards granted once an order is actually paid. Shared by the PayPal capture
 * flow and the wire-transfer "mark as paid" flow so both payment methods treat
 * customers identically:
 *   - Gift-card / discount-card buyers receive a reusable THEMAGA10 (10% off).
 *   - Logged-in customers crossing a lifetime-spend threshold receive a
 *     one-time loyalty coupon for their tier.
 *
 * Idempotent: existing coupons are detected and never duplicated, so it is safe
 * to call more than once for the same order.
 */

const TIERS = [
  { min: 2000, tier: 'platinum', pct: 50, label: 'PLATINUM50' },
  { min: 1000, tier: 'gold',     pct: 50, label: 'GOLD50' },
  { min: 500,  tier: 'silver',   pct: 30, label: 'SILVER30' },
]

/** True if any purchased item is a gift/discount card (issues THEMAGA10). */
export function itemsHaveGiftCard(items: { name?: string | null }[]): boolean {
  return items.some(i => {
    const n = (i.name ?? '').toLowerCase()
    return n.includes('gift card') || n.includes('discount card')
  })
}

export async function applyPostPaymentRewards(
  admin: SupabaseClient,
  { userId, hasGiftCard }: { userId: string | null; hasGiftCard: boolean },
): Promise<void> {
  // Gift-card purchasers get a THEMAGA10 coupon
  if (hasGiftCard) {
    if (userId) {
      const { data: existing } = await admin
        .from('coupons').select('id')
        .eq('code', 'THEMAGA10').eq('user_id', userId).maybeSingle()
      if (!existing) {
        await admin.from('coupons').insert({
          code: 'THEMAGA10', discount_pct: 10, min_spend: 0, user_id: userId, tier: 'gift_card',
        })
      }
    } else {
      const { data: existing } = await admin
        .from('coupons').select('id')
        .eq('code', 'THEMAGA10').is('user_id', null).eq('is_used', false).maybeSingle()
      if (!existing) {
        await admin.from('coupons').insert({
          code: 'THEMAGA10', discount_pct: 10, min_spend: 0, user_id: null, tier: 'gift_card',
        })
      }
    }
  }

  // Loyalty tier coupons for logged-in customers, based on lifetime paid spend.
  // Only count orders that were actually paid/fulfilled — never pending_payment
  // (abandoned or not-yet-wired) or cancelled orders.
  if (userId) {
    const { data: userOrders } = await admin
      .from('orders')
      .select('total, discount_amount')
      .eq('user_id', userId)
      .not('status', 'in', '(cancelled,pending_payment)')
    const totalSpent = (userOrders ?? []).reduce(
      (sum, o) => sum + Number(o.total) - Number(o.discount_amount ?? 0), 0,
    )
    for (const { min, tier, pct, label } of TIERS) {
      if (totalSpent >= min) {
        const { data: existing } = await admin
          .from('coupons').select('id')
          .eq('user_id', userId).eq('tier', tier).maybeSingle()
        if (!existing) {
          const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
          await admin.from('coupons').insert({
            code: `${label}-${suffix}`, discount_pct: pct, min_spend: 0, user_id: userId, tier,
          })
        }
        break
      }
    }
  }
}
