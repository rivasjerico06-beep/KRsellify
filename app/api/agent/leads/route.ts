import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAgent, isNextResponse } from '@/lib/require-agent'

const VALID_STATUSES = ['new', 'assigned', 'attempted', 'interested', 'follow_up', 'converted', 'not_interested', 'do_not_contact']

export async function GET(request: Request) {
  const auth = await requireAgent(request)
  if (isNextResponse(auth)) return auth

  const { data, error } = await getAdminSupabase()
    .from('leads')
    .select('*')
    .eq('agent_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: Request) {
  const auth = await requireAgent(request)
  if (isNextResponse(auth)) return auth

  const { id, status, notes, follow_up_date } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (notes !== undefined) updates.notes = notes
  if (follow_up_date !== undefined) updates.follow_up_date = follow_up_date

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  // Resolve agent display name for audit log
  const { data: profile } = await admin
    .from('agent_profiles')
    .select('display_name')
    .eq('user_id', auth.userId)
    .single()
  const agentDisplayName = profile?.display_name ?? auth.userId

  if (status !== undefined) updates.assigned_agent_name = agentDisplayName

  // Enforce: agent can only update leads assigned to them
  const { data, error } = await admin
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('agent_id', auth.userId)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })

  // Log status change to call history
  if (status !== undefined) {
    await admin.from('call_logs').insert({
      lead_id: id,
      agent_name: agentDisplayName,
      disposition: 'status_updated',
      notes: `Status set to: ${status.replace(/_/g, ' ')}`,
    })
  }

  return NextResponse.json(data)
}
