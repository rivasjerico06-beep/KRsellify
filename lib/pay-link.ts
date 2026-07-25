/**
 * HOSTED PAY LINK (e.g. Wise "request money" link)
 * ------------------------------------------------
 * A single external checkout URL the customer is sent to in order to pay.
 * Stored in `site_config` under the key "pay_link" and edited from the admin
 * Settings tab, so the URL can be rotated without a redeploy.
 *
 * These links carry a FIXED amount, so they are only safe for one specific
 * product at one specific price. `payLinkMatches` is the guard that enforces
 * that — it is used on the client (to decide whether to show the Pay button)
 * and again on the server (so a crafted request can't bypass it).
 */

export interface SitePayLinkConfig {
  enabled: boolean
  url: string // the external checkout URL
  productId: string // only carts made up entirely of this product qualify ('' = any)
  amount: number // the exact total the link collects (0 = don't check)
  label: string // button text
  note: string // extra instruction shown under the button
}

export const DEFAULT_PAY_LINK_CONFIG: SitePayLinkConfig = {
  enabled: false,
  url: '',
  productId: '',
  amount: 0,
  label: 'Pay',
  note: '',
}

export function normalizePayLinkConfig(value: unknown): SitePayLinkConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const str = (x: unknown, fallback = '') => (typeof x === 'string' ? x.trim() : fallback)
  const num = Number(v.amount)
  return {
    enabled: v.enabled === true,
    url: str(v.url),
    productId: str(v.productId),
    amount: Number.isFinite(num) && num > 0 ? num : 0,
    label: str(v.label, DEFAULT_PAY_LINK_CONFIG.label) || DEFAULT_PAY_LINK_CONFIG.label,
    note: str(v.note),
  }
}

// Only http(s) links are ever rendered as a destination, so a stored value can't
// become a javascript: or data: URL vector in the admin panel.
export function isSafePayLinkUrl(url: string): boolean {
  try {
    const p = new URL(url)
    return p.protocol === 'https:' || p.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * True when this cart can actually be paid with the fixed-amount link.
 *
 * Guards against the ways a total can drift away from the link's amount:
 * a VIP discount, a coupon, a quantity above 1, or extra products in the cart.
 * When any of those apply the caller falls back to bank transfer instead of
 * sending the customer to a link that would collect the wrong amount.
 */
export function payLinkMatches(
  cfg: SitePayLinkConfig,
  items: { id: string }[],
  total: number,
): boolean {
  if (!cfg.enabled || !cfg.url || !isSafePayLinkUrl(cfg.url)) return false
  if (!items.length) return false
  if (cfg.productId && !items.every(i => i.id === cfg.productId)) return false
  if (cfg.amount > 0 && Math.abs(total - cfg.amount) > 0.005) return false
  return true
}
