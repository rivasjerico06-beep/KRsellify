import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const { id } = await params
  const body = await request.json()
  const admin = getAdminSupabase()

  // Strip immutable fields; only include optional columns if explicitly set
  const {
    id: _id, gmail: _gmail, created_at: _ca,
    portal_texts, required_product_quantities,
    ...core
  } = body
  const update: Record<string, unknown> = { ...core }
  if (portal_texts && Object.keys(portal_texts).length > 0) update.portal_texts = portal_texts
  if (required_product_quantities) update.required_product_quantities = required_product_quantities

  const { data, error } = await admin
    .from('rfs_profiles')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const { id } = await params
  const admin = getAdminSupabase()
  const { error } = await admin.from('rfs_profiles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
