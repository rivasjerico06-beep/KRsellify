import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

export const revalidate = 0

export async function GET() {
  const admin = getAdminSupabase()
  const { data, error } = await admin.from('site_config').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
