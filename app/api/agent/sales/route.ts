import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAgent, isNextResponse } from '@/lib/require-agent'

// Returns the signed-in agent's own link-attributed sales (orders stamped
// with their 5-digit agent_code). Service-role read, scoped to the agent.
export async function GET(request: Request) {
  const auth = await requireAgent(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()

  const { data: profile } = await admin
    .from('agent_profiles')
    .select('agent_code')
    .eq('user_id', auth.userId)
    .single()

  const agentCode = (profile as { agent_code?: string } | null)?.agent_code
  if (!agentCode) {
    return NextResponse.json({ agent_code: null, revenue: 0, count: 0, units: 0, orders: [] })
  }

  const { data: orders, error } = await admin
    .from('orders')
    .select('id, order_number, total, discount_amount, items, status, created_at, guest_email')
    .eq('agent_code', agentCode)
    .neq('status', 'pending_payment')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = orders ?? []
  const revenue = list.reduce((s, o) => s + Number(o.total ?? 0), 0)
  const units = list.reduce((s, o) => {
    const items = Array.isArray(o.items) ? o.items : []
    return s + items.reduce((a: number, it: { qty?: number }) => a + (Number(it.qty) || 0), 0)
  }, 0)

  return NextResponse.json({
    agent_code: agentCode,
    revenue,
    count: list.length,
    units,
    orders: list,
  })
}
