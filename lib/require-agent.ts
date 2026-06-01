import { NextResponse } from 'next/server'
import { getAdminSupabase } from './supabase-admin'
import { getBrowserSupabase } from './supabase-browser'

type AgentCheckResult = { userId: string } | NextResponse

export async function requireAgent(request: Request): Promise<AgentCheckResult> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error } = await getBrowserSupabase().auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agentProfile } = await getAdminSupabase()
    .from('agent_profiles')
    .select('status')
    .eq('user_id', user.id)
    .single()

  if (agentProfile?.status !== 'approved') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return { userId: user.id }
}

export function isNextResponse(v: AgentCheckResult): v is NextResponse {
  return v instanceof NextResponse
}
