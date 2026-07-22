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

// Ordered [label, value] pairs for rendering. Blank fields are omitted so a
// half-configured setup never shows an empty "SWIFT: —" row to a customer.
export function wireFieldList(
  cfg: SiteWireConfig = DEFAULT_WIRE_CONFIG,
): { label: string; value: string }[] {
  return [
    { label: 'Bank Name',                  value: cfg.bankName },
    { label: 'Bank Address',               value: cfg.bankAddress },
    { label: 'Beneficiary / Account Name', value: cfg.accountName },
    { label: 'Account Number',             value: cfg.accountNumber },
    { label: 'Account Type',               value: cfg.accountType },
    { label: 'Routing / ABA Number',       value: cfg.routingNumber },
    { label: 'SWIFT / BIC',                value: cfg.swift },
    { label: 'Memo / Note',                value: cfg.memoNote },
  ].filter(f => f.value !== '')
}
