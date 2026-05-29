import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

export async function POST(request: Request) {
  const admin = getAdminSupabase()
  const auth = getBrowserSupabase()

  const body = await request.json()
  const { display_name, phone, notes } = body

  if (!display_name || !phone) {
    return NextResponse.json({ error: 'display_name and phone are required' }, { status: 400 })
  }

  // Identify user from Authorization header
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  let userId: string | undefined

  if (token) {
    const { data: { user } } = await auth.auth.getUser(token)
    userId = user?.id
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await admin
    .from('agent_profiles')
    .select('id, status')
    .eq('user_id', userId)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: `You already have an application with status: ${existing.status}` },
      { status: 409 }
    )
  }

  const { data, error } = await admin
    .from('agent_profiles')
    .insert({ user_id: userId, display_name, phone, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
