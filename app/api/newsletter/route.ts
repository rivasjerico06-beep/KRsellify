import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const normalised = email.toLowerCase().trim()
  const admin = getAdminSupabase()

  const { error } = await admin
    .from('newsletter_subscribers')
    .insert({ email: normalised })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ message: 'Already subscribed!' }, { status: 200 })
    }
    return NextResponse.json({ error: 'Subscription failed. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Subscribed successfully!' }, { status: 201 })
}
