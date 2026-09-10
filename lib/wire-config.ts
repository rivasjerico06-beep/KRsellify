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

/**
 * Bank transfer is the only payment method customers are shown.
 *
 * The checkout still contains the card, PayPal and pay-link branches, and
 * they still work — this forces the two values that select between them, so
 * every one of those branches resolves to bank transfer without any of them
 * being deleted. Set to false to hand the choice back to configuration:
 * Airwallex credentials bring back the card, a live pay_link brings back the
 * hosted link, and neither falls through to PayPal.
 *
 * Deliberately not a database setting. Which methods a shop accepts is a
 * decision that should need a deploy behind it, not a checkbox that can
 * silently start routing customers somewhere unintended.
 */
export const WIRE_ONLY = true

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
  // Singapore-style local clearing details. A US account identifies itself
  // with one routing number; a Singapore one uses a bank code plus a branch
  // code, so both shapes have to be expressible.
  bankCode: string
  branchCode: string
  /** Country the receiving bank sits in — the sender's bank asks for it */
  location: string
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
  bankCode: '',
  branchCode: '',
  location: '',
  // Says SWIFT explicitly, because that is the only rail this account
  // accepts, and tells the sender to leave the intermediary field blank —
  // Airwallex lists no correspondent bank, and a customer guessing at one is
  // the most common way these transfers get misrouted.
  //
  // It asks for name and email rather than an order number on purpose: the
  // order does not exist until the receipt is uploaded at the end of
  // checkout, so at the moment of transfer the customer has no number to
  // quote. Email is what the order is keyed on anyway.
  memoNote: 'Send this as an International (SWIFT) transfer. If your bank asks for an intermediary or correspondent bank, leave it blank. Put your name and the email you are using for this order in the transfer reference so we can match your payment. Your bank will likely charge an international transfer fee.',
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
    bankCode:      str(v.bankCode),
    branchCode:    str(v.branchCode),
    location:      str(v.location),
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
    ['Bank account number',               cfg.accountNumber],
    ['Bank code',                         cfg.bankCode],
    ['Branch code',                       cfg.branchCode],
    ['SWIFT code',                        cfg.swift],
    ['Bank name',                         cfg.bankName],
    // Straight after the bank's name, because a sender filling in an
    // international wire is asked for the two together. A US bank rejects the
    // transfer outright without the branch address.
    ['Bank address',                      cfg.bankAddress],
    ['Location',                          cfg.location],
    // US-style rows, kept so switching to a US account needs no code change.
    // Blank on a Singapore account, and blanks are dropped below.
    ['Account type',                      cfg.accountType],
    ['Routing number (for wire and ACH)', cfg.routingNumber],
  ] as [string, string][]).filter(([, v]) => v && v.trim() !== '')
}
