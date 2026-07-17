import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const { email, password, display_name } = await request.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  // Create auth user
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
  })
  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

  const userId = created.user.id

  // Upsert profile with agent role
  await admin.from('profiles').upsert({
    id: userId,
    full_name: display_name?.trim() || email.split('@')[0],
    role: 'agent',
  })

  // Next sequential 5-digit agent code (10001, 10002, …)
  let agent_code: string | null = null
  const { data: existingCodes } = await admin
    .from('agent_profiles')
    .select('agent_code')
    .not('agent_code', 'is', null)
  let maxCode = 10000
  for (const row of existingCodes ?? []) {
    const n = parseInt((row as { agent_code?: string }).agent_code ?? '', 10)
    if (!Number.isNaN(n) && n > maxCode) maxCode = n
  }
  agent_code = String(maxCode + 1)

  // Create approved agent_profile
  const referral_code = `KRS-${randomBytes(6).toString('hex').toUpperCase()}`
  const basePayload = {
    user_id: userId,
    display_name: display_name?.trim() || email.split('@')[0],
    status: 'approved',
    referral_code,
    phone: '',
  }

  // Try with agent_code; if the column doesn't exist yet (migration not run), retry without it
  let { data: agentProfile, error: profileError } = await admin
    .from('agent_profiles')
    .insert({ ...basePayload, agent_code })
    .select()
    .single()
  if (profileError) {
    ;({ data: agentProfile, error: profileError } = await admin
      .from('agent_profiles')
      .insert(basePayload)
      .select()
      .single())
  }

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ ...agentProfile, email: created.user.email }, { status: 201 })
}
