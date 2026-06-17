import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const normalised = email.toLowerCase().trim()
  if (!EMAIL_REGEX.test(normalised) || normalised.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  const { data: profile, error } = await admin
    .from('rfs_profiles')
    .select('*')
    .eq('gmail', normalised)
    .single()

  if (error || !profile) {
    return NextResponse.json({
      error: 'No profile found for this email. Please contact your representative.',
    }, { status: 404 })
  }

  let required_products: object[] = []
  if (profile.required_product_ids?.length > 0) {
    const { data: products } = await admin
      .from('products')
      .select('id, name, price, img')
      .in('id', profile.required_product_ids)
    required_products = products ?? []
  }

  return NextResponse.json({ profile: { ...profile, required_products }, email: normalised })
}
