import { NextResponse } from 'next/server'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import { verifySupportToken } from '@/lib/support-gate'
import { sendDiscordAlert, isDiscordConfigured, testAlert } from '@/lib/notify'

/**
 * Sends a test alert so Discord setup can be confirmed from the dashboard,
 * rather than by waiting for a real customer and hoping.
 *
 * Distinguishes "not configured" from "configured but Discord rejected it",
 * because those need different fixes — a missing or malformed webhook URL
 * versus one that has since been deleted in Discord.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth
  if (!verifySupportToken(request.headers.get('x-support-token')))
    return NextResponse.json({ error: 'Support chat is locked.' }, { status: 403 })

  if (!isDiscordConfigured())
    return NextResponse.json(
      { error: 'Not set up. Add a valid DISCORD_WEBHOOK_URL in Vercel, then redeploy.' },
      { status: 503 },
    )

  const sent = await sendDiscordAlert(testAlert(new URL(request.url).origin))

  if (!sent)
    return NextResponse.json(
      { error: 'Discord rejected the message. The webhook may have been deleted — try creating a new one.' },
      { status: 502 },
    )

  return NextResponse.json({ ok: true })
}
