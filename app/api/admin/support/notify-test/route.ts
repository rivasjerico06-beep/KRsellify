import { NextResponse } from 'next/server'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import { verifySupportToken } from '@/lib/support-gate'
import { sendTelegramAlert, isTelegramConfigured } from '@/lib/notify'

/**
 * Sends a test alert so Telegram setup can be confirmed from the dashboard,
 * rather than by waiting for a real customer and hoping.
 *
 * Distinguishes "not configured" from "configured but Telegram rejected it",
 * because those need different fixes — a missing variable versus a bad token
 * or the wrong chat id.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth
  if (!verifySupportToken(request.headers.get('x-support-token')))
    return NextResponse.json({ error: 'Support chat is locked.' }, { status: 403 })

  if (!isTelegramConfigured())
    return NextResponse.json(
      { error: 'Not set up. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel, then redeploy.' },
      { status: 503 },
    )

  const origin = new URL(request.url).origin
  const sent = await sendTelegramAlert(
    [
      '✅ <b>Test alert from KRSELLIFY</b>',
      '',
      'Notifications are working. This is what a customer message will look like.',
      '',
      `<a href="${origin}/admin">Open the Support tab →</a>`,
    ].join('\n'),
  )

  if (!sent)
    return NextResponse.json(
      { error: 'Telegram rejected the message. Check the bot token and chat id.' },
      { status: 502 },
    )

  return NextResponse.json({ ok: true })
}
