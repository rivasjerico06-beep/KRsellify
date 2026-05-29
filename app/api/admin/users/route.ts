import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

const VALID_ROLES = ['customer', 'admin', 'agent']

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { id, role } = await request.json()
  if (!id || !role) return NextResponse.json({ error: 'id and role required' }, { status: 400 })
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const { data, error } = await admin.from('profiles').update({ role }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
