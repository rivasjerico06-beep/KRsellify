import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

export async function GET(request: Request) {
  const supabase = getAdminSupabase()
  const auth = getBrowserSupabase()
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await auth.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = getAdminSupabase()
  const auth = getBrowserSupabase()
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await auth.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = ['full_name', 'phone', 'address', 'city', 'province', 'postal_code', 'profile_photo_url']
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
