import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

// GET /api/coupons — list the authenticated user's unused coupons
export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = getBrowserSupabase()
  const { data: { user } } = await auth.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('coupons')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_used', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/coupons/validate — { code, cart_total } → { valid, discount_pct, message }
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  const { code, cart_total } = await request.json()
  if (!code) return NextResponse.json({ valid: false, message: 'No code provided' })

  // Resolve the authenticated user if a token is present — user_id is never trusted from the body
  let userId: string | undefined
  if (token) {
    const auth = getBrowserSupabase()
    const { data: { user } } = await auth.auth.getUser(token)
    userId = user?.id
  }

  const admin = getAdminSupabase()
  const { data: coupons } = await admin.from('coupons').select('*').eq('code', code.toUpperCase().trim()).eq('is_used', false)

  // Match user-specific coupon (only for the authenticated user) or a global coupon (no user_id)
  const coupon = coupons?.find(c =>
    (userId && c.user_id === userId) || !c.user_id
  )

  if (!coupon) {
    return NextResponse.json({ valid: false, message: 'Invalid or already used coupon' })
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, message: 'This coupon has expired' })
  }
  if (cart_total !== undefined && Number(coupon.min_spend) > cart_total) {
    return NextResponse.json({
      valid: false,
      message: `Minimum spend of $${Number(coupon.min_spend).toFixed(2)} required`,
    })
  }

  return NextResponse.json({
    valid: true,
    discount_pct: coupon.discount_pct,
    message: `${coupon.discount_pct}% discount applied!`,
  })
}
