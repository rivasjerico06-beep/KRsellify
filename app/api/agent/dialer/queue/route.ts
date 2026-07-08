import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAgent, isNextResponse } from '@/lib/require-agent'

export async function GET(request: Request) {
  const auth = await requireAgent(request)
  if (isNextResponse(auth)) return auth

  const { data, error } = await getAdminSupabase()
    .from('leads')
    .select('id, customer_name, customer_phone, product_interest, status, created_at')
    .is('claimed_by', null)
    .is('agent_id', null)
    .in('status', ['new', 'attempted', 'follow_up', 'interested'])
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Shuffle so different agents see different leads at the top
  const leads = data ?? []
  for (let i = leads.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[leads[i], leads[j]] = [leads[j], leads[i]]
  }

  return NextResponse.json(leads)
}
