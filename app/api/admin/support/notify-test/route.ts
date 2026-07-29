import { NextResponse } from 'next/server'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import { verifySupportToken } from '@/lib/support-gate'
import { sendNtfyAlert, isNtfyConfigured, testAlert } from '@/lib/notify'

/**
 * Sends a test alert so ntfy setup can be confirmed from the dashboard,
 * rather than by waiting for a real customer and hoping.
 *
 * Distinguishes "not configured" from "configured but ntfy rejected it",
 * because those need different fixes — a missing or malformed topic versus a
 * server that refused the publish.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth
  if (!verifySupportToken(request.headers.get('x-support-token')))
    return NextResponse.json({ error: 'Support chat is locked.' }, { status: 403 })

  if (!isNtfyConfigured())
    return NextResponse.json(
      { error: 'Not set up. Add NTFY_TOPIC in Vercel, then redeploy.' },
      { status: 503 },
    )

  const sent = await sendNtfyAlert(testAlert(new URL(request.url).origin))

  if (!sent)
    return NextResponse.json(
      { error: 'ntfy refused the message. Check NTFY_TOPIC, and NTFY_TOKEN if the topic is reserved.' },
      { status: 502 },
    )

  return NextResponse.json({ ok: true })
}
