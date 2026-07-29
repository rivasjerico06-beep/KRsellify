import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import {
  normalizeMessageBody,
  SupportConversationRow,
  SupportMessage,
} from '@/lib/support'

/**
 * Admin side of the support chat. Everything here is behind requireAdmin.
 *
 * GET  — the conversation list, or one thread's messages with ?conversation_id=
 * POST — send a reply
 * PATCH— open / close a thread
 */

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')?.trim()

  // One thread — opening it clears the admin's unread badge
  if (conversationId) {
    const { data: conversation } = await admin
      .from('support_conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (!conversation)
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    const { data: messages } = await admin
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (conversation.admin_unread > 0) {
      await admin
        .from('support_conversations')
        .update({ admin_unread: 0 })
        .eq('id', conversationId)
      conversation.admin_unread = 0
    }

    return NextResponse.json({ conversation, messages: messages ?? [] })
  }

  // The list. Newest activity first so anything waiting is at the top.
  const { data: conversations, error } = await admin
    .from('support_conversations')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (conversations ?? []).map(c => c.id)
  if (!ids.length) return NextResponse.json([])

  // One query for every message in the listed threads, folded into previews
  // here rather than N round trips.
  const { data: messages } = await admin
    .from('support_messages')
    .select('conversation_id, sender, body, created_at')
    .in('conversation_id', ids)
    .order('created_at', { ascending: true })

  const lastByConversation: Record<string, { body: string; sender: string }> = {}
  const countByConversation: Record<string, number> = {}
  for (const m of (messages ?? []) as Pick<SupportMessage, 'conversation_id' | 'sender' | 'body'>[]) {
    lastByConversation[m.conversation_id] = { body: m.body, sender: m.sender }
    countByConversation[m.conversation_id] = (countByConversation[m.conversation_id] ?? 0) + 1
  }

  const rows: SupportConversationRow[] = (conversations ?? []).map(c => ({
    ...c,
    last_message:  lastByConversation[c.id]?.body ?? null,
    last_sender:   (lastByConversation[c.id]?.sender as SupportConversationRow['last_sender']) ?? null,
    message_count: countByConversation[c.id] ?? 0,
  }))

  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const { conversation_id, body } = await request.json()
  const messageBody = normalizeMessageBody(body)

  if (!conversation_id || !messageBody)
    return NextResponse.json({ error: 'conversation_id and a message body are required' }, { status: 400 })

  const admin = getAdminSupabase()
  const { data: conversation } = await admin
    .from('support_conversations')
    .select('customer_unread')
    .eq('id', conversation_id)
    .maybeSingle()

  if (!conversation)
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const { data: message, error } = await admin
    .from('support_messages')
    .insert({ conversation_id, sender: 'admin', body: messageBody })
    .select()
    .single()

  if (error || !message)
    return NextResponse.json({ error: error?.message ?? 'Failed to send' }, { status: 500 })

  await admin
    .from('support_conversations')
    .update({
      customer_unread: conversation.customer_unread + 1,
      last_message_at: message.created_at,
      status: 'open',
    })
    .eq('id', conversation_id)

  return NextResponse.json({ message })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const { conversation_id, status } = await request.json()
  if (!conversation_id || (status !== 'open' && status !== 'closed'))
    return NextResponse.json({ error: 'conversation_id and a valid status are required' }, { status: 400 })

  const { data, error } = await getAdminSupabase()
    .from('support_conversations')
    .update({ status })
    .eq('id', conversation_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
