/**
 * TELEGRAM ALERTS
 * ---------------
 * Pings a Telegram chat when a customer writes in on support.
 *
 * Telegram rather than web push because Telegram runs as its own app on
 * Android, iPhone, Windows and Mac — the alert arrives with sound whether or
 * not a browser is open, on every device signed into the account. Web push
 * can't match that: on iPhone it only works once the site is installed to the
 * Home Screen, and on desktop it stops when the browser is fully quit.
 *
 * Setup (values go in Vercel → Environment Variables, never in this repo):
 *
 *   TELEGRAM_BOT_TOKEN   from @BotFather when you create the bot
 *   TELEGRAM_CHAT_ID     your chat id — message the bot, then open
 *                        https://api.telegram.org/bot<TOKEN>/getUpdates
 *                        and read result[0].message.chat.id
 *
 * With either unset, alerts are simply skipped — support still works.
 */

const TELEGRAM_API = 'https://api.telegram.org'

export function isTelegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN?.trim() && !!process.env.TELEGRAM_CHAT_ID?.trim()
}

/**
 * Message bodies are customer-supplied and rendered with parse_mode HTML, so
 * the five characters Telegram treats as markup have to be escaped or a stray
 * "<" silently drops the rest of the alert.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Fire-and-forget: never throws and never blocks the caller. A support message
 * must be saved and acknowledged even if Telegram is down or misconfigured —
 * losing the alert is an annoyance, losing the message is not acceptable.
 */
export async function sendTelegramAlert(html: string): Promise<boolean> {
  if (!isTelegramConfigured()) return false
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** The alert for a customer support message. */
export function supportMessageAlert(opts: {
  email: string
  body: string
  origin: string
  isFirstMessage: boolean
}): string {
  const { email, body, origin, isFirstMessage } = opts
  // Long messages are trimmed — the alert is a nudge to go and read it, and
  // Telegram caps a message at 4096 characters anyway.
  const preview = body.length > 500 ? `${body.slice(0, 500)}…` : body

  return [
    isFirstMessage ? '💬 <b>New support chat</b>' : '💬 <b>New support message</b>',
    '',
    `<b>From:</b> ${escapeHtml(email)}`,
    '',
    escapeHtml(preview),
    '',
    `<a href="${origin}/admin">Open the Support tab →</a>`,
  ].join('\n')
}
