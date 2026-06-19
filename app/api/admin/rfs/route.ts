import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('rfs_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const { gmail, display_name, benefit_title, benefit_amount, activation_pct,
          deduction_pct, minimized_deduction_pct, required_product_ids,
          required_product_quantities, completed_product_ids,
          status, deadline, custom_message, admin_notes } = body

  if (!gmail) return NextResponse.json({ error: 'gmail is required' }, { status: 400 })

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('rfs_profiles')
    .insert({
      gmail: gmail.toLowerCase().trim(),
      display_name: display_name || 'Valued Customer',
      benefit_title: benefit_title || 'Cash-Out Amount',
      benefit_amount: benefit_amount ?? 0,
      activation_pct: activation_pct ?? 0,
      deduction_pct: deduction_pct ?? 0,
      minimized_deduction_pct: minimized_deduction_pct ?? null,
      required_product_ids: required_product_ids ?? [],
      required_product_quantities: required_product_quantities ?? {},
      completed_product_ids: completed_product_ids ?? [],
      status: status || 'under_review',
      deadline: deadline || null,
      custom_message: custom_message || null,
      admin_notes: admin_notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
