import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import {
  isValidSupportEmail,
  normalizeSupportEmail,
  normalizeMessageBody,
} from '@/lib/support'
import { sendDiscordAlert, supportMessageAlert } from '@/lib/notify'

type Supa = ReturnType<typeof getAdminSupabase>

/**
 * Both handlers require the conversation id AND the email that owns it, and
 * check they belong together. A conversation id on its own is therefore not
 * enough to read or post to a thread — which matters because ids travel in
 * query strings and end up in logs and browser history.
 */
async function ownedConversation(admin: Supa, conversationId: unknown, rawEmail: unknown) {
  if (typeof conversationId !== 'string' || !conversationId.trim()) return null
  if (!isValidSupportEmail(rawEmail)) return null

  const { data } = await admin
    .from('support_conversations')
    .select('*')
    .eq('id', conversationId.trim())
    .ilike('email', normalizeSupportEmail(rawEmail))
    .maybeSingle()

  return data ?? null
}

// Poll for new messages while the widget is open.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const admin = getAdminSupabase()

  const conversation = await ownedConversation(
    admin,
    searchParams.get('conversation_id'),
    searchParams.get('email'),
  )
  if (!conversation)
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })

  const { data: messages } = await admin
    .from('support_messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })

  // The customer has the thread open, so replies are read as they arrive
  if (conversation.customer_unread > 0) {
    await admin
      .from('support_conversations')
      .update({ customer_unread: 0 })
      .eq('id', conversation.id)
  }

  return NextResponse.json({ messages: messages ?? [], status: conversation.status })
}

// Customer sends a message.
export async function POST(request: Request) {
  let payload: { conversation_id?: unknown; email?: unknown; body?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const messageBody = normalizeMessageBody(payload.body)
  if (!messageBody)
    return NextResponse.json({ error: 'Type a message first.' }, { status: 400 })

  const admin = getAdminSupabase()
  const conversation = await ownedConversation(admin, payload.conversation_id, payload.email)
  if (!conversation)
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })

  const { data: message, error } = await admin
    .from('support_messages')
    .insert({ conversation_id: conversation.id, sender: 'customer', body: messageBody })
    .select()
    .single()

  if (error || !message)
    return NextResponse.json({ error: 'Could not send. Please try again.' }, { status: 500 })

  // A customer writing in reopens a closed thread — otherwise their reply
  // would sit in a resolved conversation nobody looks at again.
  await admin
    .from('support_conversations')
    .update({
      admin_unread: conversation.admin_unread + 1,
      last_message_at: message.created_at,
      status: 'open',
    })
    .eq('id', conversation.id)

  // Ping Discord so a message doesn't sit unseen until someone happens to
  // open the dashboard. Deliberately not awaited: the customer's message is
  // already saved, and the reply must not wait on — or fail with — Discord.
  sendDiscordAlert(supportMessageAlert({
    email: conversation.email,
    body: messageBody,
    origin: new URL(request.url).origin,
    isFirstMessage: conversation.admin_unread === 0,
  })).catch(() => {})

  return NextResponse.json({ message })
}
