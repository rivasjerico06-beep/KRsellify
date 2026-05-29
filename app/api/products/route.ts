import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search   = searchParams.get('search')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)

  const admin = getAdminSupabase()
  let query = admin.from('products').select('*')

  if (category && category !== 'all') query = query.eq('category', category)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
