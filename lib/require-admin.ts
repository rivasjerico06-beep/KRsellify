import { NextResponse } from 'next/server'
import { getAdminSupabase } from './supabase-admin'
import { getBrowserSupabase } from './supabase-browser'

// The email comes along so routes can apply owner-only rules on top of the
// role check (see RFS_OWNER_EMAIL).
type AdminCheckResult = { userId: string; email: string | null } | NextResponse

export async function requireAdmin(request: Request): Promise<AdminCheckResult> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error } = await getBrowserSupabase().auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await getAdminSupabase()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return { userId: user.id, email: user.email ?? null }
}

export function isNextResponse(v: AdminCheckResult): v is NextResponse {
  return v instanceof NextResponse
}
