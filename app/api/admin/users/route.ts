import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

const VALID_ROLES = ['customer', 'admin', 'agent']

function getTier(spent: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (spent >= 2000) return 'platinum'
  if (spent >= 1000) return 'gold'
  if (spent >= 500)  return 'silver'
  return 'bronze'
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()

  const [profilesRes, ordersRes, authRes] = await Promise.all([
    admin.from('profiles').select('*').order('created_at', { ascending: false }),
    admin.from('orders').select('user_id,total,status'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 })

  const emailMap: Record<string, string> = {}
  for (const u of authRes.data?.users ?? []) emailMap[u.id] = u.email ?? ''

  const spendMap: Record<string, number> = {}
  const orderCountMap: Record<string, number> = {}
  for (const o of ordersRes.data ?? []) {
    if (!o.user_id || o.status === 'cancelled') continue
    spendMap[o.user_id]      = (spendMap[o.user_id] ?? 0) + Number(o.total)
    orderCountMap[o.user_id] = (orderCountMap[o.user_id] ?? 0) + 1
  }

  const enriched = (profilesRes.data ?? []).map(p => ({
    ...p,
    email:       emailMap[p.id] ?? null,
    order_count: orderCountMap[p.id] ?? 0,
    total_spent: spendMap[p.id] ?? 0,
    tier:        getTier(spendMap[p.id] ?? 0),
  }))

  return NextResponse.json(enriched)
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
