import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  // Join with agent_profiles for agent display name
  const { data: leadsData, error } = await admin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with agent display name from agent_profiles if agent_id is set
  const agentIds = [...new Set((leadsData ?? []).map(l => l.agent_id).filter(Boolean))]
  let agentMap: Record<string, string> = {}
  if (agentIds.length > 0) {
    const { data: profiles } = await admin
      .from('agent_profiles')
      .select('user_id, display_name, referral_code')
      .in('user_id', agentIds)
    for (const p of profiles ?? []) agentMap[p.user_id] = p.display_name
  }

  const enriched = (leadsData ?? []).map(l => ({
    ...l,
    agent_profiles: l.agent_id ? { display_name: agentMap[l.agent_id] ?? null } : null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(request: Request) {
  const admin = getAdminSupabase()
  // POST is intentionally public — customers can submit agent requests without being logged in
  const body = await request.json()
  const { customer_name, customer_phone, product_interest, agent_id, notes } = body

  if (!customer_name || !customer_phone) {
    return NextResponse.json({ error: 'customer_name and customer_phone are required' }, { status: 400 })
  }

  // Reject duplicate phone submissions within 1 hour to block spam
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recentLead } = await admin
    .from('leads')
    .select('id')
    .eq('customer_phone', customer_phone)
    .gte('created_at', oneHourAgo)
    .limit(1)
    .maybeSingle()
  if (recentLead) {
    return NextResponse.json({ error: 'A lead with this phone number was recently submitted. Please try again later.' }, { status: 429 })
  }

  if (agent_id) {
    const { data: agent } = await admin
      .from('agent_profiles')
      .select('user_id')
      .eq('user_id', agent_id)
      .eq('status', 'approved')
      .single()
    if (!agent) {
      return NextResponse.json({ error: 'Invalid agent' }, { status: 400 })
    }
  }

  const { data, error } = await admin
    .from('leads')
    .insert({ customer_name, customer_phone, product_interest, agent_id: agent_id || null, notes, status: agent_id ? 'assigned' : 'new' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // If assigning to agent, auto-set status to 'assigned'
  if (updates.agent_id && !updates.status) updates.status = 'assigned'
  if (updates.agent_id === null && !updates.status) updates.status = 'new'

  const { data, error } = await admin
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log status changes made by admin to call history
  if (updates.status) {
    await admin.from('call_logs').insert({
      lead_id: id,
      agent_name: 'Admin',
      disposition: 'status_updated',
      notes: `Status set to: ${(updates.status as string).replace(/_/g, ' ')}`,
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    // No id = clear all leads
    const { error } = await admin.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const { error } = await admin.from('leads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
