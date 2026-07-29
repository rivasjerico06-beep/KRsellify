/**
 * CUSTOMER SUPPORT CHAT
 * ---------------------
 * Shared shapes and validation for the support widget and the admin Support
 * tab. The customer's email address is the thread key: entering the same
 * address always reopens the same conversation, which is how history survives
 * across visits and devices without an account.
 *
 * Worth knowing about that design: email alone is an identifier, not proof of
 * identity. Anyone who types a known address sees that conversation. That is
 * the tradeoff for letting customers chat without signing up. If the threads
 * ever carry anything sensitive, mail a 6-digit code to the address and check
 * it before opening the thread — the storage side needs no changes for that.
 */

export type SupportSender = 'customer' | 'admin'
export type SupportStatus = 'open' | 'closed'

export interface SupportMessage {
  id: string
  conversation_id: string
  sender: SupportSender
  body: string
  created_at: string
}

export interface SupportConversation {
  id: string
  email: string
  user_id: string | null
  status: SupportStatus
  admin_unread: number
  customer_unread: number
  last_message_at: string
  created_at: string
}

/** A conversation plus the preview fields the admin list needs. */
export interface SupportConversationRow extends SupportConversation {
  last_message: string | null
  last_sender: SupportSender | null
  message_count: number
}

export const MAX_MESSAGE_LENGTH = 2000

/**
 * Deliberately loose — the goal is to reject obvious typos and junk, not to
 * police which providers are acceptable. The address is only ever used as a
 * thread key and as somewhere for support to reply.
 */
export function isValidSupportEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const email = value.trim()
  if (email.length < 5 || email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Thread key: same address in any casing is the same conversation. */
export function normalizeSupportEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Trims and length-caps a message. Returns null when nothing usable is left,
 * so callers can reject with one check.
 */
export function normalizeMessageBody(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const body = value.trim()
  if (!body) return null
  return body.slice(0, MAX_MESSAGE_LENGTH)
}
