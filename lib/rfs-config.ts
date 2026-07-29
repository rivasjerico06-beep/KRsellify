/**
 * RFS PORTAL SWITCH
 * -----------------
 * Whether the customer-facing /rfs portal is open, stored in the `site_config`
 * table under the key "rfs_config" and toggled from admin → Settings. It lives
 * in the database rather than an environment variable so the portal can be
 * taken down and brought back WITHOUT a redeploy.
 *
 * Off by default, and off whenever the stored value can't be read. Failing
 * closed matters here: /api/rfs/auth returns a customer's benefit amount,
 * activation percentage and required products, so a database hiccup must not
 * be what re-opens it.
 *
 * Admin → RFS Portal is unaffected either way — reward profiles can still be
 * managed while the customer side is down.
 */

/**
 * Only this account may open or close the portal. Other admins don't see the
 * control at all, and are refused if they call the config route directly.
 *
 * A plain constant rather than an environment variable on purpose: the same
 * value has to be true for the admin page (which runs in the browser) and for
 * the API route (which doesn't). A server-only variable would leave those two
 * disagreeing, showing a button that then fails. This is an identity to match,
 * not a secret to protect — the password behind the account is the secret.
 */
export const RFS_OWNER_EMAIL = 'rivasjerico06@gmail.com'

export function isRfsOwner(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === RFS_OWNER_EMAIL
}

export interface SiteRfsConfig {
  enabled: boolean
}

export const DEFAULT_RFS_CONFIG: SiteRfsConfig = {
  enabled: false,
}

// Coerce an unknown stored value into a complete SiteRfsConfig. Anything that
// isn't an explicit `true` leaves the portal closed.
export function normalizeRfsConfig(value: unknown): SiteRfsConfig {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return { enabled: v.enabled === true }
}
