/**
 * HOSTED PAY LINKS (e.g. Wise "request money" links)
 * --------------------------------------------------
 * External checkout URLs the customer is sent to in order to pay. Stored in
 * `site_config` under the key "pay_link" and edited from the admin Settings
 * tab, so links can be added or rotated without a redeploy.
 *
 * Each link carries a FIXED amount, so there is one link per (product, price)
 * pair — a product with 1 / 3 / 10-piece bundles needs three links. `findPayLink`
 * is the guard that picks the right one, and refuses when nothing matches
 * exactly. It runs on the client (to decide whether to show the Pay button)
 * and again on the server (so a crafted request can't bypass it).
 */

export interface PayLinkEntry {
  productId: string
  amount: number // the exact order total this link collects
  url: string
}

export interface SitePayLinkConfig {
  enabled: boolean
  hideAddToCart: boolean // one-product-at-a-time mode: Buy Now only, no cart stacking or cart icon
  hidePromos: boolean // hide every coupon and VIP mention across the storefront
  links: PayLinkEntry[]
  label: string // button text
  note: string // extra instruction shown under the button
}

export const DEFAULT_PAY_LINK_CONFIG: SitePayLinkConfig = {
  enabled: false,
  hideAddToCart: false,
  hidePromos: false,
  links: [],
  label: 'Pay',
  note: '',
}

// Only http(s) links are ever rendered as a destination, so a stored value
// can't become a javascript: or data: URL vector.
export function isSafePayLinkUrl(url: string): boolean {
  try {
    const p = new URL(url)
    return p.protocol === 'https:' || p.protocol === 'http:'
  } catch {
    return false
  }
}

function normalizeEntry(value: unknown): PayLinkEntry | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const url = typeof v.url === 'string' ? v.url.trim() : ''
  const productId = typeof v.productId === 'string' ? v.productId.trim() : ''
  const amount = Number(v.amount)
  if (!url || !isSafePayLinkUrl(url)) return null
  if (!Number.isFinite(amount) || amount <= 0) return null
  return { productId, amount, url }
}

export function normalizePayLinkConfig(value: unknown): SitePayLinkConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const str = (x: unknown, fallback = '') => (typeof x === 'string' ? x.trim() : fallback)

  // Accept the original single-link shape ({url, productId, amount}) so a
  // config saved before multi-link support keeps working after deploy.
  const rawLinks = Array.isArray(v.links)
    ? v.links
    : (typeof v.url === 'string' && v.url.trim() ? [v] : [])

  return {
    enabled: v.enabled === true,
    hideAddToCart: v.hideAddToCart === true,
    hidePromos: v.hidePromos === true,
    links: rawLinks.map(normalizeEntry).filter((e): e is PayLinkEntry => e !== null),
    label: str(v.label, DEFAULT_PAY_LINK_CONFIG.label) || DEFAULT_PAY_LINK_CONFIG.label,
    note: str(v.note),
  }
}

/**
 * The link that can actually settle this cart, or null.
 *
 * A link only applies when the cart is made up entirely of its product AND the
 * total matches its amount to the cent. That is what keeps a VIP discount, a
 * coupon, an unexpected quantity or a mixed cart from being sent to a link that
 * would collect the wrong sum — those cases fall back to bank transfer instead.
 */
export function findPayLink(
  cfg: SitePayLinkConfig,
  items: { id: string }[],
  total: number,
): PayLinkEntry | null {
  if (!cfg.enabled || !items.length) return null
  return cfg.links.find(entry => {
    if (entry.productId && !items.every(i => i.id === entry.productId)) return false
    return Math.abs(total - entry.amount) <= 0.005
  }) ?? null
}
