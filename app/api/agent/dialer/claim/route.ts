import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAgent, isNextResponse } from '@/lib/require-agent'

export async function POST(request: Request) {
  const auth = await requireAgent(request)
  if (isNextResponse(auth)) return auth

  const { lead_id } = await request.json()
  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

  // Atomic: only succeeds if claimed_by is still NULL
  const { data, error } = await getAdminSupabase()
    .from('leads')
    .update({
      claimed_by: auth.userId,
      claimed_at: new Date().toISOString(),
      agent_id: auth.userId,
      status: 'assigned',
    })
    .eq('id', lead_id)
    .is('claimed_by', null)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'already_claimed' }, { status: 409 })
  }

  return NextResponse.json(data)
}
