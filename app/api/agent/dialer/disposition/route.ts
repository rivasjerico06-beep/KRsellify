import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAgent, isNextResponse } from '@/lib/require-agent'

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
  const auth = await requireAgent(request)
  if (isNextResponse(auth)) return auth

  const { lead_id, disposition, notes } = await request.json()

  if (!lead_id || !disposition) {
    return NextResponse.json({ error: 'lead_id and disposition required' }, { status: 400 })
  }
  if (!VALID_DISPOSITIONS.includes(disposition)) {
    return NextResponse.json({ error: 'Invalid disposition' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  // Verify this agent actually claimed this lead
  const { data: lead } = await admin
    .from('leads')
    .select('id, call_count')
    .eq('id', lead_id)
    .eq('claimed_by', auth.userId)
    .single()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not claimed by you' }, { status: 403 })
  }

  // Resolve display name so call logs show a real name, not a UUID
  const { data: profile } = await admin
    .from('agent_profiles')
    .select('display_name')
    .eq('user_id', auth.userId)
    .single()
  const agentDisplayName = profile?.display_name ?? auth.userId

  await admin.from('call_logs').insert({
    lead_id,
    agent_name: agentDisplayName,
    disposition,
    notes: notes || null,
  })

  // Keep the denormalised name on the lead itself so admin can filter by it
  await admin.from('leads').update({ assigned_agent_name: agentDisplayName }).eq('id', lead_id)

  const { error } = await admin.from('leads').update({
    disposition,
    status: DISPOSITION_STATUS[disposition] ?? 'attempted',
    last_called_at: new Date().toISOString(),
    call_count: (lead.call_count ?? 0) + 1,
  }).eq('id', lead_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
