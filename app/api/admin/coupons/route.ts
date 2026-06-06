import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('coupons')
    .select('*')
    .is('user_id', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const { code, discount_pct, min_spend } = await request.json()
  if (!code?.trim() || !discount_pct) {
    return NextResponse.json({ error: 'code and discount_pct required' }, { status: 400 })
  }
  if (discount_pct < 1 || discount_pct > 100) {
    return NextResponse.json({ error: 'discount_pct must be 1–100' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('coupons')
    .upsert({
      code: code.trim().toUpperCase(),
      discount_pct: Number(discount_pct),
      min_spend: Number(min_spend ?? 0),
      user_id: null,
      is_used: false,
      expires_at: null,
    }, { onConflict: 'code' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = getAdminSupabase()
  const { error } = await admin.from('coupons').delete().eq('id', id).is('user_id', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
