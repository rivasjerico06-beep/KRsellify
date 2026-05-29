import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin.from('site_config').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { key, value } = await request.json()
  if (!key || value === undefined) return NextResponse.json({ error: 'key and value required' }, { status: 400 })

  const { data, error } = await admin
    .from('site_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/')
  return NextResponse.json(data)
}
