import { createHmac, timingSafeEqual, createHash } from 'crypto'

/**
 * SUPPORT TAB LOCK
 * ----------------
 * A second sign-in in front of the admin Support Chat tab, on top of the admin
 * role check. Customer conversations are the most personal data in the admin
 * area, so reaching them takes a deliberate second step rather than being one
 * click away for anyone who leaves a dashboard open.
 *
 * The credentials live in environment variables, never in this repository:
 *
 *     SUPPORT_TAB_EMAIL      the address that unlocks the tab
 *     SUPPORT_TAB_PASSWORD   its password
 *
 * A password committed to source is published to everyone with repository
 * access and stays in git history after it is changed, and a password checked
 * in the browser is readable in view-source. So the check runs server-side and
 * the password is never sent to the client — the browser only ever holds the
 * short-lived token minted below.
 */

const SESSION_MS = 8 * 60 * 60 * 1000 // re-enter the password once a work day

function secret(): string {
  // Any stable server-only secret works as the signing key. The service-role
  // key is always present server-side and never reaches the browser.
  return process.env.SUPPORT_TAB_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? ''
}

/** Both variables must be set, or the tab stays shut. */
export function isSupportGateConfigured(): boolean {
  return !!process.env.SUPPORT_TAB_EMAIL?.trim()
    && !!process.env.SUPPORT_TAB_PASSWORD?.trim()
    && !!secret()
}

// Comparing digests keeps the comparison a fixed length and constant time, so
// a wrong password can't be narrowed down by how long the check took.
function sameSecret(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function verifySupportCredentials(email: unknown, password: unknown): boolean {
  if (!isSupportGateConfigured()) return false
  if (typeof email !== 'string' || typeof password !== 'string') return false

  const emailOk = sameSecret(
    email.trim().toLowerCase(),
    process.env.SUPPORT_TAB_EMAIL!.trim().toLowerCase(),
  )
  const passOk = sameSecret(password, process.env.SUPPORT_TAB_PASSWORD!)
  return emailOk && passOk
}

/** Signed "unlocked until" stamp. Carries no secret, and expires on its own. */
export function issueSupportToken(): string {
  const expiresAt = Date.now() + SESSION_MS
  const sig = createHmac('sha256', secret()).update(String(expiresAt)).digest('hex')
  return `${expiresAt}.${sig}`
}

export function verifySupportToken(token: unknown): boolean {
  if (!isSupportGateConfigured()) return false
  if (typeof token !== 'string' || !token.includes('.')) return false

  const [rawExpiry, sig] = token.split('.')
  const expiresAt = Number(rawExpiry)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false

  const expected = createHmac('sha256', secret()).update(rawExpiry).digest('hex')
  if (expected.length !== sig.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
}
