/**
 * BANK WIRE TRANSFER CONFIG
 * -------------------------
 * The public bank-account details customers wire their payment into, plus a
 * feature flag. These are read from NEXT_PUBLIC_ env vars so both the checkout
 * UI (client) and the instructions email (server) can display them.
 *
 * TO ENABLE WIRE TRANSFER AT CHECKOUT:
 *   1. Fill in the NEXT_PUBLIC_WIRE_* env vars below with your real account.
 *   2. Set  NEXT_PUBLIC_WIRE_ENABLED=on  and redeploy.
 *
 * It is intentionally OFF by default so placeholder account numbers are never
 * shown to real customers before you've configured your own.
 */

export interface WireBankDetails {
  bankName: string
  bankAddress: string
  accountName: string
  accountNumber: string
  accountType: string
  routingNumber: string
  swift: string
  memoNote: string
}

export const WIRE_BANK_DETAILS: WireBankDetails = {
  bankName:      process.env.NEXT_PUBLIC_WIRE_BANK_NAME      ?? 'Your Bank Name',
  bankAddress:   process.env.NEXT_PUBLIC_WIRE_BANK_ADDRESS   ?? '',
  accountName:   process.env.NEXT_PUBLIC_WIRE_ACCOUNT_NAME   ?? 'Account Holder Name',
  accountNumber: process.env.NEXT_PUBLIC_WIRE_ACCOUNT_NUMBER ?? '0000000000',
  accountType:   process.env.NEXT_PUBLIC_WIRE_ACCOUNT_TYPE   ?? '',
  routingNumber: process.env.NEXT_PUBLIC_WIRE_ROUTING_NUMBER ?? '000000000',
  swift:         process.env.NEXT_PUBLIC_WIRE_SWIFT          ?? 'XXXXXXXX',
  memoNote:      process.env.NEXT_PUBLIC_WIRE_MEMO_NOTE
    ?? 'Include your order reference number in the transfer memo so we can match your payment.',
}

const flag = process.env.NEXT_PUBLIC_WIRE_ENABLED
export const WIRE_ENABLED = flag ? /^(on|true|1|yes)$/i.test(flag.trim()) : false
