/**
 * DISCORD ALERTS
 * --------------
 * Pings a Discord channel when a customer writes in on support.
 *
 * Discord rather than web push because it reaches every device without
 * per-device work: its own apps on iPhone, Android, Mac and Windows all ring
 * with sound whether or not a browser is running. Web push can't match that —
 * on iPhone it only works once the site is installed to the Home Screen, and
 * on desktop it stops when the browser is fully quit.
 *
 * Setup (the URL goes in Vercel → Environment Variables, never in this repo):
 *
 *   DISCORD_WEBHOOK_URL   Server Settings → Integrations → Webhooks →
 *                         New Webhook → pick a channel → Copy Webhook URL
 *
 * Unset, alerts are skipped and support works exactly as before.
 *
 * MORE THAN ONE ADMIN
 * Everyone who can see the channel is notified, so extra admins only need an
 * invite to the server — no code or configuration change.
 *
 * That relies on each person leaving the channel on "All Messages" though.
 * Set DISCORD_MENTION_ROLE_ID to a role id and every alert pings that role
 * instead, which notifies its members regardless of their own settings:
 *
 *   Server Settings → Roles → create e.g. "support" → assign it to the admins
 *   Right-click the role → Copy Role ID (needs Developer Mode on)
 */

export interface DiscordPayload {
  content?: string
  embeds?: {
    title: string
    description?: string
    color?: number
    fields?: { name: string; value: string; inline?: boolean }[]
    url?: string
    timestamp?: string
  }[]
}

const TEAL = 0x58948f
const GREEN = 0x16a34a

/**
 * A webhook URL is a secret that makes this server POST wherever it points, so
 * only real Discord webhook endpoints are accepted. A mistyped or hostile
 * value can't turn this into a way of firing requests at arbitrary hosts.
 */
function webhookUrl(): string | null {
  const raw = process.env.DISCORD_WEBHOOK_URL?.trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase()
    const okHost = host === 'discord.com' || host === 'discordapp.com' || host.endsWith('.discord.com')
    if (u.protocol !== 'https:' || !okHost) return null
    if (!u.pathname.startsWith('/api/webhooks/')) return null
    return raw
  } catch {
    return null
  }
}

export function isDiscordConfigured(): boolean {
  return webhookUrl() !== null
}

/**
 * The role to ping, if one is configured. Discord ids are numeric snowflakes;
 * anything else is ignored rather than sent, so a malformed value degrades to
 * "no ping" instead of putting a stray "<@&oops>" in every alert.
 */
function mentionRoleId(): string | null {
  const id = process.env.DISCORD_MENTION_ROLE_ID?.trim()
  return id && /^\d{5,25}$/.test(id) ? id : null
}

/**
 * Customer text is rendered as Discord markdown, so the formatting characters
 * are escaped — otherwise a stray "**" or "```" mangles the rest of the alert.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_~|>])/g, '\\$1')
}

/**
 * Fire-and-forget: never throws, never blocks the caller. A support message
 * must be saved and acknowledged even if Discord is down or misconfigured —
 * losing the alert is an annoyance, losing the message is not.
 */
export async function sendDiscordAlert(payload: DiscordPayload): Promise<boolean> {
  const url = webhookUrl()
  if (!url) return false

  const roleId = mentionRoleId()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'KRSELLIFY Support',
        ...payload,
        // The ping lives in content, outside the embed — Discord doesn't
        // notify anyone for a mention that only appears inside an embed.
        ...(roleId ? { content: `<@&${roleId}>` } : {}),
        // parse: [] blocks @everyone, @here and every user mention, so text a
        // customer typed into the chat widget can never notify the server.
        // Only the one configured role is allowed through, and that string is
        // built here rather than taken from any customer input.
        allowed_mentions: roleId ? { parse: [], roles: [roleId] } : { parse: [] },
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
}): DiscordPayload {
  const { email, body, origin, isFirstMessage } = opts
  // Trimmed well under Discord's 4096-character embed limit — the alert is a
  // nudge to go and read the thread, not a copy of it.
  const preview = body.length > 900 ? `${body.slice(0, 900)}…` : body

  return {
    embeds: [{
      title: isFirstMessage ? '💬 New support chat' : '💬 New support message',
      description: escapeMarkdown(preview),
      color: TEAL,
      url: `${origin}/admin`,
      timestamp: new Date().toISOString(),
      fields: [{ name: 'From', value: escapeMarkdown(email), inline: true }],
    }],
  }
}

/** The alert sent by the Test button on the Support tab. */
export function testAlert(origin: string): DiscordPayload {
  return {
    embeds: [{
      title: '✅ Test alert from KRSELLIFY',
      description: 'Notifications are working. This is what a customer message will look like.',
      color: GREEN,
      url: `${origin}/admin`,
      timestamp: new Date().toISOString(),
    }],
  }
}
