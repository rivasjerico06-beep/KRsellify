import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { isValidSupportEmail, normalizeSupportEmail } from '@/lib/support'

/**
 * Opens the customer's support thread.
 *
 * There is no sign-up: the email address is the key, so entering the same
 * address on any device reopens the same conversation with its full history.
 * A conversation is created the first time an address is seen.
 *
 * Runs on the service-role key because RLS on these tables denies everything —
 * the browser can never read a thread except through this route, and this
 * route only ever returns the thread belonging to the address it was given.
 */
export async function POST(request: Request) {
  let body: { email?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!isValidSupportEmail(body.email))
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })

  const email = normalizeSupportEmail(body.email)
  const admin = getAdminSupabase()

  // If they happen to be signed in, record it — informational only, the email
  // is still what identifies the thread.
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  let userId: string | null = null
  if (token) {
    const { data: { user } } = await getBrowserSupabase().auth.getUser(token)
    if (user) userId = user.id
  }

  const { data: existing } = await admin
    .from('support_conversations')
    .select('*')
    .ilike('email', email)
    .maybeSingle()

  let conversation = existing

  if (!conversation) {
    const { data: created, error } = await admin
      .from('support_conversations')
      .insert({ email, user_id: userId })
      .select()
      .single()

    if (error || !created)
      return NextResponse.json({ error: 'Could not start the chat. Please try again.' }, { status: 500 })

    conversation = created
  } else if (userId && !conversation.user_id) {
    await admin.from('support_conversations').update({ user_id: userId }).eq('id', conversation.id)
  }

  const { data: messages } = await admin
    .from('support_messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })

  // They're looking at the thread right now, so nothing in it is unread
  if (conversation.customer_unread > 0) {
    await admin
      .from('support_conversations')
      .update({ customer_unread: 0 })
      .eq('id', conversation.id)
    conversation.customer_unread = 0
  }

  return NextResponse.json({ conversation, messages: messages ?? [] })
}
