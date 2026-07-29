/**
 * BANK WIRE TRANSFER CONFIG
 * -------------------------
 * The bank-account details customers wire their payment into, plus the on/off
 * switch, now live in the `site_config` table under the key "wire_config" and
 * are edited from the admin Settings tab — so they can be changed at any time
 * WITHOUT a redeploy.
 *
 * This module only defines the shape, safe defaults, a normalizer, and a render
 * helper. Actual values are loaded via getSiteConfig() on the server, or
 * /api/site-config on the client. It's OFF by default so nothing is shown to
 * customers until an admin fills in the details and enables it.
 */

export interface SiteWireConfig {
  enabled: boolean
  maintenance: boolean // when true, bank transfer shows but the Place Order button is paused
  bankName: string
  bankAddress: string
  accountName: string // beneficiary
  accountNumber: string
  accountType: string
  routingNumber: string
  swift: string
  memoNote: string
}

export const DEFAULT_WIRE_CONFIG: SiteWireConfig = {
  enabled: false,
  maintenance: false,
  bankName: '',
  bankAddress: '',
  accountName: '',
  accountNumber: '',
  accountType: '',
  routingNumber: '',
  swift: '',
  memoNote: 'Include your order reference number in the transfer memo so we can match your payment.',
}

// Coerce an unknown stored value into a complete SiteWireConfig, so missing or
// malformed keys can never crash a consumer.
export function normalizeWireConfig(value: unknown): SiteWireConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const str = (x: unknown, fallback = '') => (typeof x === 'string' ? x.trim() : fallback)
  return {
    enabled:       v.enabled === true,
    maintenance:   v.maintenance === true,
    bankName:      str(v.bankName),
    bankAddress:   str(v.bankAddress),
    accountName:   str(v.accountName),
    accountNumber: str(v.accountNumber),
    accountType:   str(v.accountType),
    routingNumber: str(v.routingNumber),
    swift:         str(v.swift),
    memoNote:      str(v.memoNote, DEFAULT_WIRE_CONFIG.memoNote),
  }
}

/**
 * The bank rows shown to a customer, in the exact order and wording the bank
 * itself lists them — so what's on the checkout page, the order-success page
 * and the instructions email can be compared line-for-line against the
 * account details without anyone having to translate field names.
 *
 * This is the ONE place the wire format is defined; all three render sites
 * call it. Blank fields are dropped so a half-configured setup never shows an
 * empty "Swift/BIC: —" row.
 *
 * `memoNote` is deliberately not here — it's an instruction, not a bank
 * detail, and each surface renders it as its own "Important:" callout.
 */
export function wireFieldList(cfg?: SiteWireConfig | null): [string, string][] {
  if (!cfg) return []
  return ([
    ['Account Name',                      cfg.accountName],
    ['Account type',                      cfg.accountType],
    ['Routing number (for wire and ACH)', cfg.routingNumber],
    ['Account number',                    cfg.accountNumber],
    ['Address',                           cfg.bankAddress],
    ['Swift/BIC',                         cfg.swift],
  ] as [string, string][]).filter(([, v]) => v && v.trim() !== '')
}
