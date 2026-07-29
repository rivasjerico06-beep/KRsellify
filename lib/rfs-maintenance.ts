/**
 * TEMPORARY RFS PORTAL TOGGLE
 * ---------------------------
 * While this is ON, the /rfs portal shows a "temporarily unavailable" notice
 * instead of the sign-in form, and /api/rfs/auth refuses to look anyone up.
 *
 * Both sides matter: turning off only the page would leave the API answering
 * profile lookups to anyone who called it directly, which is the part that
 * actually returns customer data.
 *
 * TO BRING THE PORTAL BACK:
 *   • Set env var  NEXT_PUBLIC_RFS_MAINTENANCE=off  and redeploy, OR
 *   • Change the fallback below to `false`.
 *
 * Default is ON when the env var is unset — same convention as
 * payments-maintenance.ts. Accepted "off" values: off, false, 0, no
 * (case-insensitive).
 *
 * Admin → RFS Portal is deliberately unaffected, so reward profiles can still
 * be managed while the customer-facing side is down.
 */
const flag = process.env.NEXT_PUBLIC_RFS_MAINTENANCE
export const RFS_UNDER_MAINTENANCE = flag
  ? !/^(off|false|0|no)$/i.test(flag.trim())
  : true
