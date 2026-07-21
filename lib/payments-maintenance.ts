/**
 * TEMPORARY PAYMENTS MAINTENANCE TOGGLE
 * -------------------------------------
 * While this is ON, the checkout PayPal button and the VIP "Debit or Credit
 * Card" (Stripe) button are replaced with an "under maintenance" notice and
 * cannot be used.
 *
 * TO RE-ENABLE PAYMENTS:
 *   • Set env var  NEXT_PUBLIC_PAYMENTS_MAINTENANCE=off  and redeploy, OR
 *   • Change the fallback below to `false`.
 *
 * Default is ON when the env var is unset. Accepted "off" values:
 * off, false, 0, no (case-insensitive).
 */
const flag = process.env.NEXT_PUBLIC_PAYMENTS_MAINTENANCE
export const PAYMENTS_UNDER_MAINTENANCE = flag
  ? !/^(off|false|0|no)$/i.test(flag.trim())
  : true
