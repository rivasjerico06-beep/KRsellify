/**
 * NTFY ALERTS
 * -----------
 * Pings your phone and laptop when a customer writes in on support.
 *
 * ntfy rather than web push because it reaches every device without
 * per-device work: its apps on iPhone, Android and desktop ring with sound
 * whether or not a browser is running. Web push can't match that — on iPhone
 * it only works once the site is installed to the Home Screen, and on desktop
 * it stops when the browser is fully quit.
 *
 * Setup (values go in Vercel → Environment Variables, never in this repo):
 *
 *   NTFY_TOPIC    the topic to publish to. On the public ntfy.sh this name is
 *                 the ONLY thing protecting the feed — anyone who knows it can
 *                 read every alert and post fakes. It must stay long and
 *                 random, and must not be renamed to something memorable.
 *   NTFY_TOKEN    optional. Set this once the topic is reserved and made
 *                 private under an ntfy account, which replaces the guessing
 *                 game with a real credential. No code change needed.
 *   NTFY_SERVER   optional, defaults to https://ntfy.sh. For self-hosting.
 */

export interface NtfyMessage {
  title: string
  message: string
  /** 3 = default, 4 = high (bypasses some quiet settings), 5 = max */
  priority?: number
  tags?: string[]
  /** URL opened when the notification is tapped */
  click?: string
}

const DEFAULT_SERVER = 'https://ntfy.sh'

/** Topics are a URL path segment, so keep them to characters that can't escape it. */
const TOPIC_RE = /^[A-Za-z0-9_-]{8,64}$/

function server(): string | null {
  const raw = process.env.NTFY_SERVER?.trim() || DEFAULT_SERVER
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return null
    return raw.replace(/\/+$/, '')
  } catch {
    return null
  }
}

function topic(): string | null {
  const t = process.env.NTFY_TOPIC?.trim()
  if (!t || !TOPIC_RE.test(t)) return null
  return t
}

export function isNtfyConfigured(): boolean {
  return topic() !== null && server() !== null
}

/**
 * Fire-and-forget: never throws, never blocks the caller. A support message
 * must be saved and acknowledged even if ntfy is down or misconfigured —
 * losing the alert is an annoyance, losing the message is not.
 */
export async function sendNtfyAlert(msg: NtfyMessage): Promise<boolean> {
  const host = server()
  const t = topic()
  if (!host || !t) return false

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = process.env.NTFY_TOKEN?.trim()
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    // Published as a JSON body rather than ntfy's header form: titles and
    // messages carry customer text, and non-ASCII characters can't travel
    // safely in HTTP headers.
    const res = await fetch(host, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        topic: t,
        title: msg.title,
        message: msg.message,
        priority: msg.priority ?? 4,
        tags: msg.tags ?? [],
        ...(msg.click ? { click: msg.click } : {}),
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
}): NtfyMessage {
  const { email, body, origin, isFirstMessage } = opts
  // A nudge to go and read the thread, not a copy of it
  const preview = body.length > 400 ? `${body.slice(0, 400)}…` : body

  return {
    title: isFirstMessage ? `New support chat — ${email}` : `New message — ${email}`,
    message: preview,
    priority: 4,
    tags: ['speech_balloon'],
    click: `${origin}/admin`,
  }
}

/** The alert sent by the Test button on the Support tab. */
export function testAlert(origin: string): NtfyMessage {
  return {
    title: 'Test alert from KRSELLIFY',
    message: 'Notifications are working. This is what a customer message will look like.',
    priority: 4,
    tags: ['white_check_mark'],
    click: `${origin}/admin`,
  }
}
