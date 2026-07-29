import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import { isRfsOwner } from '@/lib/rfs-config'

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin.from('site_config').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { key, value } = await request.json()
  if (!key || value === undefined) return NextResponse.json({ error: 'key and value required' }, { status: 400 })

  // Opening or closing the RFS portal is reserved to its owner. Enforced here
  // and not only by hiding the control, because this route takes an arbitrary
  // key from any admin — hiding a button stops nobody who calls it directly.
  if (key === 'rfs_config' && !isRfsOwner(auth.email))
    return NextResponse.json(
      { error: 'Only the portal owner can change the RFS setting.' },
      { status: 403 },
    )

  const { data, error } = await admin
    .from('site_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/')
  return NextResponse.json(data)
}
