import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

const VALID_STATUSES = ['approved', 'rejected', 'suspended', 'pending']

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('agent_profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
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
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
    updates.referral_code = `KRS-${suffix}`
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
  }

  return NextResponse.json(data)
}
