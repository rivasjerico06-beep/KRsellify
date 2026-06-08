import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.toLowerCase().trim()
  if (!email) return NextResponse.json({ is_vip: false })

  const admin = getAdminSupabase()
  const { data } = await admin
    .from('vip_subscriptions')
    .select('id')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()

  return NextResponse.json({ is_vip: !!data })
}
