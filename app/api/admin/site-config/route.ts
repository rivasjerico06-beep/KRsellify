import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import { isRfsOwner } from '@/lib/rfs-config'

/**
 * Config keys only the owner may write. These change the whole storefront —
 * navigation, footer, categories, the browser title, whether payments are
 * accepted at all — so they sit above the ordinary admin role.
 */
const OWNER_ONLY_KEYS = new Set([
  'rfs_config',
  'nav_config',
  'footer_config',
  'categories_config',
  'site_identity',
  'payments_config',
])

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

  // Owner Console keys are reserved to the owner. Enforced here and not only
  // by hiding the controls, because this route takes an arbitrary key from any
  // admin — hiding a button stops nobody who calls it directly.
  if (OWNER_ONLY_KEYS.has(key) && !isRfsOwner(auth.email))
    return NextResponse.json(
      { error: 'Only the site owner can change this setting.' },
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
