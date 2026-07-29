import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

const VALID_STATUSES = ['approved', 'rejected', 'suspended', 'pending']

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()

  const [agentsRes, leadsRes, authRes] = await Promise.all([
    admin.from('agent_profiles').select('*').order('created_at', { ascending: false }),
    admin.from('leads').select('agent_id,status'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  if (agentsRes.error) return NextResponse.json({ error: agentsRes.error.message }, { status: 500 })

  const emailMap: Record<string, string> = {}
  for (const u of authRes.data?.users ?? []) emailMap[u.id] = u.email ?? ''

  const leadCountMap: Record<string, number> = {}
  const convertedCountMap: Record<string, number> = {}
  for (const l of leadsRes.data ?? []) {
    if (!l.agent_id) continue
    leadCountMap[l.agent_id]     = (leadCountMap[l.agent_id] ?? 0) + 1
    if (l.status === 'converted')
      convertedCountMap[l.agent_id] = (convertedCountMap[l.agent_id] ?? 0) + 1
  }

  const enriched = (agentsRes.data ?? []).map(a => ({
    ...a,
    email:           emailMap[a.user_id] ?? null,
    lead_count:      leadCountMap[a.user_id] ?? 0,
    converted_count: convertedCountMap[a.user_id] ?? 0,
  }))

  return NextResponse.json(enriched)
}

// Leads a suspended/rejected agent was working stay pinned to them otherwise:
// the pool queue only shows rows with claimed_by AND agent_id null, so nobody
// else can ever pick them up and those customers stop being called. Hand them
// back to the pool, keeping any disposition already earned — only 'assigned'
// has to reset to 'new', since it isn't a queue-visible status.
//
// Terminal outcomes ('converted', 'not_interested', 'do_not_contact') are left
// alone: they're finished, and requeuing them would put dead leads back in
// front of agents and detach converted sales from the agent who closed them.
const RELEASABLE_STATUSES = ['attempted', 'interested', 'follow_up']

async function releaseLeads(admin: ReturnType<typeof getAdminSupabase>, userId: string) {
  const cleared = {
    claimed_by: null,
    claimed_at: null,
    agent_id: null,
    assigned_agent_name: null,
  }

  await admin
    .from('leads')
    .update({ ...cleared, status: 'new' })
    .eq('agent_id', userId)
    .eq('status', 'assigned')

  await admin
    .from('leads')
    .update(cleared)
    .eq('agent_id', userId)
    .in('status', RELEASABLE_STATUSES)
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { user_id, status } = await request.json()
  if (!user_id || !status) return NextResponse.json({ error: 'user_id and status required' }, { status: 400 })
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const { data: existing } = await admin
    .from('agent_profiles')
    .select('referral_code, display_name')
    .eq('user_id', user_id)
    .single()

  const updates: Record<string, unknown> = { status }

  if (status === 'approved' && !existing?.referral_code) {
    updates.referral_code = `KRS-${randomBytes(6).toString('hex').toUpperCase()}`
  }

  const { data, error } = await admin
    .from('agent_profiles')
    .update(updates)
    .eq('user_id', user_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'approved') {
    await admin.from('profiles').update({ role: 'agent' }).eq('id', user_id)
  } else if (status === 'rejected' || status === 'suspended') {
    await admin.from('profiles').update({ role: 'customer' }).eq('id', user_id)
    await releaseLeads(admin, user_id)
  }

  return NextResponse.json(data)
}
