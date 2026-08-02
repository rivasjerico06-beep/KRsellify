/**
 * OWNER-EDITABLE SITE CONTENT
 * ---------------------------
 * Content that used to be hardcoded in components — header links, footer
 * columns, socials, category cards, browser title, the payments switch — now
 * lives in the `site_config` table and is edited from admin → Owner Console.
 *
 * Every default below is the exact value the component previously hardcoded,
 * so an empty database renders the site as it looks today. Nothing changes
 * appearance until someone edits it.
 *
 * Normalizers coerce whatever is stored into a complete, safe shape: a
 * half-written row, a missing key or a value of the wrong type must never be
 * able to blank out the header or crash a page. Rows that lose their required
 * fields are dropped rather than rendered empty, and a list that ends up empty
 * falls back to the defaults.
 */

// ── Links ─────────────────────────────────────────────────────
export interface SiteLink {
  label: string
  href: string
}

export interface SiteSocial {
  /** Font Awesome brand icon name, e.g. "fa-facebook-f" */
  icon: string
  href: string
}

// ── Header ────────────────────────────────────────────────────
/**
 * Header nav items carry a category slug rather than a URL: clicking one
 * filters the homepage in place instead of navigating, so the slug is what the
 * component actually needs.
 */
export interface SiteNavItem {
  label: string
  /** Shop category slug, or "all" */
  cat: string
}

export interface SiteNavConfig {
  links: SiteNavItem[]
}

export const DEFAULT_NAV_CONFIG: SiteNavConfig = {
  links: [
    { label: 'Best Sellers', cat: 'all' },
    { label: 'Medallions',   cat: 'medallions' },
    { label: 'Collectibles', cat: 'collectibles' },
    { label: 'Apparel',      cat: 'apparel' },
    { label: 'Accessories',  cat: 'accessories' },
    { label: 'Crypto',       cat: 'crypto' },
  ],
}

// ── Footer ────────────────────────────────────────────────────
export interface SiteFooterConfig {
  blurb: string
  /** Business address shown under the blurb. Hidden when blank. */
  address: string
  shop: SiteLink[]
  support: SiteLink[]
  company: SiteLink[]
  socials: SiteSocial[]
  /** Card/wallet names shown as badges in the bottom bar */
  paymentBadges: string[]
  copyright: string
}

export const DEFAULT_FOOTER_CONFIG: SiteFooterConfig = {
  blurb: 'Premium collectibles, rare finds, and exclusive memorabilia — authenticated and shipped to your door.',
  address: '24M Jaime street Jalandoni Wilson Jaro iloilo',
  shop: [
    { label: 'All Products',   href: '/shop' },
    { label: 'Medallions',     href: '/shop?cat=medallions' },
    { label: 'Collectibles',   href: '/shop?cat=collectibles' },
    { label: 'Crypto Items',   href: '/shop?cat=crypto' },
    { label: 'Apparel',        href: '/shop?cat=apparel' },
    { label: 'Accessories',    href: '/shop?cat=accessories' },
  ],
  support: [
    { label: 'Track Your Order',    href: '/track-order' },
    { label: 'FAQ',                 href: '/faq' },
    { label: 'Shipping Info',       href: '/shipping' },
    { label: 'Returns & Exchanges', href: '/returns' },
    { label: 'Contact Us',          href: '/contact' },
  ],
  company: [
    { label: 'About Maga Offers', href: '/about' },
    { label: 'Privacy Policy',    href: '/privacy' },
    { label: 'Terms of Service',  href: '/terms' },
  ],
  socials: [
    { icon: 'fa-facebook-f', href: 'https://facebook.com/themagaoffers' },
    { icon: 'fa-x-twitter',  href: 'https://x.com/themagaoffers' },
    { icon: 'fa-instagram',  href: 'https://instagram.com/themagaoffers' },
    { icon: 'fa-youtube',    href: 'https://youtube.com/@themagaoffers' },
  ],
  paymentBadges: ['VISA', 'MC', 'AMEX', 'PayPal'],
  copyright: '© 2026 Maga Offers. All rights reserved. Made with',
}

// ── Category cards ────────────────────────────────────────────
export interface SiteCategory {
  name: string
  /** Slug passed to /shop?cat=… . "all" means every product. */
  cat: string
  /** Font Awesome icon name, e.g. "fa-medal" */
  icon: string
  /** true when the icon is a brand glyph (fa-brands) rather than fa-solid */
  brand: boolean
  /** CSS background for the icon tile */
  gradient: string
}

export interface SiteCategoriesConfig {
  items: SiteCategory[]
}

export const DEFAULT_CATEGORIES_CONFIG: SiteCategoriesConfig = {
  items: [
    { name: 'Medallions',   cat: 'medallions',   icon: 'fa-medal',        brand: false, gradient: 'linear-gradient(135deg, #CA8A04, #d97706)' },
    { name: 'Collectibles', cat: 'collectibles', icon: 'fa-gem',          brand: false, gradient: 'linear-gradient(135deg, #0e4a80, #2563eb)' },
    { name: 'Crypto',       cat: 'crypto',       icon: 'fa-bitcoin',      brand: true,  gradient: 'linear-gradient(135deg, #d97706, #ef4444)' },
    { name: 'All Items',    cat: 'all',          icon: 'fa-bag-shopping', brand: false, gradient: 'linear-gradient(135deg, #0a1e33, #093459)' },
  ],
}

// ── Site identity & shop-wide values ──────────────────────────
export interface SiteIdentityConfig {
  /** Brand name shown beside the logo in the header. Hidden when blank. */
  brandName: string
  /** Browser tab title and search-result title */
  title: string
  /** Meta description */
  description: string
  /**
   * Free-shipping threshold, as the text shown to customers (e.g. "$399").
   * One value on purpose: it used to be written separately in the announce
   * bar, the trust bar and the product page, and they had drifted apart —
   * "$399+" in one place against "over $75" in the others.
   */
  freeShippingText: string
}

export const DEFAULT_IDENTITY_CONFIG: SiteIdentityConfig = {
  brandName: 'MAGA OFFERS',
  title: 'Maga Offers — Premium Collectibles & Patriot Merchandise',
  description: 'Authentic limited-edition patriot collectibles. Verified, premium quality, and ready to own.',
  freeShippingText: '$399',
}

// ── Payments switch ───────────────────────────────────────────
export interface SitePaymentsConfig {
  /**
   * When true the PayPal button at checkout and the card button on VIP are
   * replaced with an "under maintenance" notice. Previously an environment
   * variable, so flipping it needed a redeploy.
   */
  maintenance: boolean
}

export const DEFAULT_PAYMENTS_CONFIG: SitePaymentsConfig = {
  maintenance: true,
}

// ── Normalizers ───────────────────────────────────────────────

const str = (x: unknown, fallback = '') =>
  typeof x === 'string' && x.trim() !== '' ? x.trim() : fallback

function normalizeLinks(value: unknown, fallback: SiteLink[]): SiteLink[] {
  if (!Array.isArray(value)) return fallback
  const out = value
    .map(v => {
      const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
      return { label: str(o.label), href: str(o.href) }
    })
    // A link with no label is invisible and one with no href goes nowhere;
    // dropping them beats rendering dead entries in the nav.
    .filter(l => l.label !== '' && l.href !== '')
  return out.length ? out : fallback
}

function normalizeSocials(value: unknown, fallback: SiteSocial[]): SiteSocial[] {
  if (!Array.isArray(value)) return fallback
  const out = value
    .map(v => {
      const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
      return { icon: str(o.icon), href: str(o.href) }
    })
    .filter(s => s.icon !== '' && s.href !== '')
  return out.length ? out : fallback
}

export function normalizeNavConfig(value: unknown): SiteNavConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  if (!Array.isArray(v.links)) return DEFAULT_NAV_CONFIG
  const links = v.links
    .map(x => {
      const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
      return { label: str(o.label), cat: str(o.cat) }
    })
    .filter(l => l.label !== '' && l.cat !== '')
  return links.length ? { links } : DEFAULT_NAV_CONFIG
}

export function normalizeFooterConfig(value: unknown): SiteFooterConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const badges = Array.isArray(v.paymentBadges)
    ? v.paymentBadges.map(b => str(b)).filter(b => b !== '')
    : []
  return {
    blurb:         str(v.blurb, DEFAULT_FOOTER_CONFIG.blurb),
    // Cleared on purpose means hidden, so only a never-set value falls back —
    // same rule as paymentBadges below.
    address:       typeof v.address === 'string' ? v.address.trim() : DEFAULT_FOOTER_CONFIG.address,
    shop:          normalizeLinks(v.shop,    DEFAULT_FOOTER_CONFIG.shop),
    support:       normalizeLinks(v.support,  DEFAULT_FOOTER_CONFIG.support),
    company:       normalizeLinks(v.company,  DEFAULT_FOOTER_CONFIG.company),
    socials:       normalizeSocials(v.socials, DEFAULT_FOOTER_CONFIG.socials),
    // Badges are decorative, so an intentionally empty list is respected —
    // only a non-array (never set) falls back.
    paymentBadges: Array.isArray(v.paymentBadges) ? badges : DEFAULT_FOOTER_CONFIG.paymentBadges,
    copyright:     str(v.copyright, DEFAULT_FOOTER_CONFIG.copyright),
  }
}

export function normalizeCategoriesConfig(value: unknown): SiteCategoriesConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  if (!Array.isArray(v.items)) return DEFAULT_CATEGORIES_CONFIG
  const items = v.items
    .map(x => {
      const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
      return {
        name:     str(o.name),
        cat:      str(o.cat),
        icon:     str(o.icon, 'fa-tag'),
        brand:    o.brand === true,
        gradient: str(o.gradient, 'linear-gradient(135deg, #0a1e33, #093459)'),
      }
    })
    .filter(c => c.name !== '' && c.cat !== '')
  return items.length ? { items } : DEFAULT_CATEGORIES_CONFIG
}

export function normalizeIdentityConfig(value: unknown): SiteIdentityConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    // Cleared on purpose means logo-only, so only a never-set value falls back.
    brandName:        typeof v.brandName === 'string' ? v.brandName.trim() : DEFAULT_IDENTITY_CONFIG.brandName,
    title:            str(v.title, DEFAULT_IDENTITY_CONFIG.title),
    description:      str(v.description, DEFAULT_IDENTITY_CONFIG.description),
    freeShippingText: str(v.freeShippingText, DEFAULT_IDENTITY_CONFIG.freeShippingText),
  }
}

export function normalizePaymentsConfig(value: unknown): SitePaymentsConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  // Anything other than an explicit false leaves payments in maintenance —
  // the same default the environment flag had, so nothing silently turns
  // live payment buttons back on.
  return { maintenance: v.maintenance !== false }
}
