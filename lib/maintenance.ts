/**
 * SITE-WIDE MAINTENANCE SWITCH
 * ----------------------------
 * While this is ON the public storefront is unreachable and unindexable:
 * every public page returns HTTP 503 with a "back soon" screen, carries
 * `X-Robots-Tag: noindex, nofollow`, and robots.txt disallows everything.
 *
 * 503 (rather than 404 or a 200 holding page) is what tells a crawler the
 * outage is temporary, so the site's existing ranking is held rather than
 * de-indexed as gone.
 *
 * To bring the site back:
 *   - set MAINTENANCE_MODE=false in the host's env vars (no redeploy of
 *     code needed — just a restart), or
 *   - flip the fallback below to false and deploy.
 *
 * Default is ON, so an unset variable keeps the site down rather than
 * quietly publishing it.
 */
export const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'false' ? false : true

/**
 * Paths that stay reachable while the site is down.
 *
 * Two groups, and both matter:
 *
 *   Admin — so the owner can still work the orders, and above all can still
 *   get back in to turn this off. A blanket block locks you out of your own
 *   dashboard and needs a redeploy to undo.
 *
 *   Payment callbacks — a gateway posting the result of a payment that was
 *   already in flight must not be met with a 503. The gateway would record a
 *   delivery failure and the order would never be marked paid, so money
 *   would land with nothing in the database to show for it.
 */
const OPEN_PREFIXES = [
  '/maintenance',
  '/admin',
  '/login',
  '/agent-login',
  '/api/admin',
  '/api/paypal',          // create-order + capture-order
  '/api/stripe/webhook',
  '/api/paymongo/webhook',
]

export function isOpenDuringMaintenance(pathname: string): boolean {
  return OPEN_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))
}
