import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

const VALID_DISPOSITIONS = [
  'interested', 'follow_up', 'voicemail', 'no_answer',
  'not_interested', 'wrong_number', 'converted', 'do_not_call', 'hung_up',
]

const DISPOSITION_STATUS: Record<string, string> = {
  interested:      'interested',
  follow_up:       'follow_up',
  voicemail:       'attempted',
  no_answer:       'attempted',
  hung_up:         'attempted',
  not_interested:  'not_interested',
  wrong_number:    'not_interested',
  converted:       'converted',
  do_not_call:     'do_not_contact',
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const { lead_id, disposition, agent_name, notes } = body

  if (!lead_id || !disposition) {
    return NextResponse.json({ error: 'lead_id and disposition required' }, { status: 400 })
  }
  if (!VALID_DISPOSITIONS.includes(disposition)) {
    return NextResponse.json({ error: 'Invalid disposition' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  // Log call history
  await admin.from('call_logs').insert({
    lead_id,
    agent_name: agent_name || null,
    disposition,
    notes: notes || null,
  })

  // Get current call count then increment
  const { data: lead } = await admin
    .from('leads')
    .select('call_count')
    .eq('id', lead_id)
    .single()

  const newCount = (lead?.call_count ?? 0) + 1

  const { error } = await admin.from('leads').update({
    disposition,
    status: DISPOSITION_STATUS[disposition] ?? 'attempted',
    last_called_at: new Date().toISOString(),
    call_count: newCount,
  }).eq('id', lead_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
