import { NextResponse } from 'next/server'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import {
  verifySupportCredentials,
  issueSupportToken,
  isSupportGateConfigured,
} from '@/lib/support-gate'

/**
 * Unlocks the admin Support Chat tab.
 *
 * Still behind requireAdmin — this is a second factor on top of the admin
 * role, not a way in on its own. On success it returns a short-lived signed
 * token that /api/admin/support then requires; the password itself never
 * leaves the server.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  if (!isSupportGateConfigured()) {
    return NextResponse.json(
      { error: 'Support access is not configured. Set SUPPORT_TAB_EMAIL and SUPPORT_TAB_PASSWORD.' },
      { status: 503 },
    )
  }

  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!verifySupportCredentials(body.email, body.password))
    return NextResponse.json({ error: 'Wrong email or password.' }, { status: 401 })

  return NextResponse.json({ token: issueSupportToken() })
}

// Lets the tab show the right thing on load: the password form, or the
// "not configured yet" notice.
export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth
  return NextResponse.json({ configured: isSupportGateConfigured() })
}
