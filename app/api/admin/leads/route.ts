import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  // Join with agent_profiles for agent display name
  const { data, error } = await admin
    .from('leads')
    .select('*, agent_profiles(display_name, referral_code)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const admin = getAdminSupabase()
  // POST is intentionally public — customers can submit agent requests without being logged in
  const body = await request.json()
  const { customer_name, customer_phone, product_interest, agent_id, notes } = body

  if (!customer_name || !customer_phone) {
    return NextResponse.json({ error: 'customer_name and customer_phone are required' }, { status: 400 })
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
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await admin.from('leads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
