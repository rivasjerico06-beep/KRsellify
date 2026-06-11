import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getBrowserSupabase } from '@/lib/supabase-browser'

export async function POST(request: Request) {
  try {
    const { choice } = await request.json() as { choice: 30 | 50 }

    if (choice !== 30 && choice !== 50)
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 })

    const authToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
    let userId: string | null = null
    if (authToken) {
      const { data: { user } } = await getBrowserSupabase().auth.getUser(authToken)
      if (user) userId = user.id
    }

    const admin = getAdminSupabase()
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
    const code = choice === 30 ? `BONUS30-${suffix}` : `BONUS50-${suffix}`

    await admin.from('coupons').insert({
      code,
      discount_pct: choice,
      min_spend: 0,
      user_id: userId ?? null,
      tier: 'gift_card_bonus',
    })

    return NextResponse.json({ code })
  } catch (err) {
    console.error('[coupons/gift-bonus]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
