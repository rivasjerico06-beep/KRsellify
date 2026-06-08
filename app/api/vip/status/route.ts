import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ is_vip: false })

  const auth = getBrowserSupabase()
  const { data: { user } } = await auth.auth.getUser(token)
  if (!user) return NextResponse.json({ is_vip: false })

  const admin = getAdminSupabase()
  const { data: authUser } = await admin.auth.admin.getUserById(user.id)
  const email = authUser?.user?.email
  if (!email) return NextResponse.json({ is_vip: false })

  const { data } = await admin
    .from('vip_subscriptions')
    .select('status')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()

  return NextResponse.json({ is_vip: !!data, status: data?.status ?? null })
}
