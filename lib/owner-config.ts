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
 * able to crash a page. Rows that lose their required fields are dropped
 * rather than rendered empty, and a footer list that ends up empty falls back
 * to the defaults. The header nav and the category cards are different: the
 * owner may remove every item, so those lists are kept even when nothing is
 * left in them, and only a value that was never saved falls back.
 */

import type { Product } from './types'

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
  // Matches the business address registered with Airwallex. Customers wiring
  // money compare the site against the payee details, so a mismatch here
  // reads as a red flag on the one page where trust matters most.
  address: '24 M Jayme St., Our Lady of Fatima, Jaro, City of Iloilo, Iloilo 5000, Philippines',
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
    { label: 'About PATRIOT’S ONLINE SHOP', href: '/about' },
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
  copyright: '© 2026 PATRIOT’S ONLINE SHOP. All rights reserved. Made with',
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

// ── Shop page sidebar ─────────────────────────────────────────
/**
 * The panel beside the products on /shop. Its rows are fixed here rather than
 * typed in by the owner because each one counts real products — an editable
 * label could end up reading "Under $100" over a count of everything under
 * $200. What the owner controls is which rows show.
 */
export interface ShopSidebarRow {
  id: string
  label: string
}

export interface ShopSidebarCountRow extends ShopSidebarRow {
  /** The products this row counts */
  test: (p: Product) => boolean
}

/** Category buttons. The id is the category slug; "all" is every product. */
export const SHOP_SIDEBAR_CATEGORIES: ShopSidebarRow[] = [
  { id: 'all',          label: 'All Products' },
  { id: 'medallions',   label: 'Medallions' },
  { id: 'collectibles', label: 'Collectibles' },
  { id: 'crypto',       label: 'Crypto' },
]

export const SHOP_SIDEBAR_PRICES: ShopSidebarCountRow[] = [
  { id: 'under-200', label: 'Under $200',  test: p => p.price < 200 },
  { id: '200-400',   label: '$200 – $400', test: p => p.price >= 200 && p.price <= 400 },
  { id: 'over-400',  label: 'Over $400',   test: p => p.price > 400 },
]

export const SHOP_SIDEBAR_AVAILABILITY: ShopSidebarCountRow[] = [
  { id: 'on-sale',      label: 'On Sale',      test: p => p.is_sale },
  { id: 'new-arrivals', label: 'New Arrivals', test: p => p.is_new },
  { id: 'in-stock',     label: 'In Stock',     test: p => p.in_stock },
]

/**
 * Stored as the rows to leave out rather than the rows to show, so a shop
 * that has never saved this — or a row added above later — shows everything
 * without anyone having to switch it on.
 */
export interface SiteShopSidebarConfig {
  /** Ids from SHOP_SIDEBAR_CATEGORIES */
  hiddenCategories: string[]
  /** Ids from SHOP_SIDEBAR_PRICES */
  hiddenPrices: string[]
  /** Ids from SHOP_SIDEBAR_AVAILABILITY */
  hiddenAvailability: string[]
}

export const DEFAULT_SHOP_SIDEBAR_CONFIG: SiteShopSidebarConfig = {
  hiddenCategories:   [],
  hiddenPrices:       [],
  hiddenAvailability: [],
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
  brandName: "PATRIOT'S ONLINE SHOP",
  title: 'PATRIOT’S ONLINE SHOP — Premium Collectibles & Patriot Merchandise',
  description: 'Authentic limited-edition patriot collectibles. Verified, premium quality, and ready to own.',
  freeShippingText: '$399',
}

// ── Payments switch ───────────────────────────────────────────
export interface SitePaymentsConfig {
  /**
   * When true every online payment button is replaced with an "under
   * maintenance" notice: the Airwallex card button at checkout, the PayPal
   * button, and the card button on VIP. Previously an environment variable, so
   * flipping it needed a redeploy.
   *
   * Note this defaults to TRUE — a shop that has never saved this setting is
   * in maintenance, so a fresh Airwallex install shows no card button until
   * it is explicitly turned off in admin → Owner Console → Payments.
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
  // Kept even when empty: that is the owner removing every tab, and falling
  // back here is what used to make them all come back.
  return { links }
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
  // Kept even when empty, for the same reason as the nav: removing every card
  // is a choice the owner can make.
  return { items }
}

export function normalizeShopSidebarConfig(value: unknown): SiteShopSidebarConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const ids = (x: unknown) => (Array.isArray(x) ? x.map(i => str(i)).filter(i => i !== '') : [])
  return {
    hiddenCategories:   ids(v.hiddenCategories),
    hiddenPrices:       ids(v.hiddenPrices),
    hiddenAvailability: ids(v.hiddenAvailability),
  }
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
