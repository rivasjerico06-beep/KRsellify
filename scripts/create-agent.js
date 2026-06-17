// One-time: creates an agent account in Supabase auth + profiles + agent_profiles
const { createClient } = require('@supabase/supabase-js')
const { randomBytes } = require('crypto')

const SUPABASE_URL = 'https://ewwrpldcdwzwoodbsrzf.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = 'maryhernandez@magaoffers.net'
const PASSWORD = 'maganet'
const DISPLAY_NAME = 'Mary Hernandez'

async function main() {
  // 1. Create auth user
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  if (createError) { console.error('Auth error:', createError.message); process.exit(1) }

  const userId = created.user.id
  console.log('Auth user created:', userId)

  // 2. Set profile with agent role
  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    full_name: DISPLAY_NAME,
    role: 'agent',
  })
  if (profileError) { console.error('Profile error:', profileError.message); process.exit(1) }
  console.log('Profile set with role: agent')

  // 3. Create agent_profile (auto-approved)
  const referral_code = `KRS-${randomBytes(6).toString('hex').toUpperCase()}`
  const { data: agentProfile, error: agentError } = await admin
    .from('agent_profiles')
    .insert({
      user_id: userId,
      display_name: DISPLAY_NAME,
      status: 'approved',
      referral_code,
      phone: '',
    })
    .select()
    .single()

  if (agentError) { console.error('Agent profile error:', agentError.message); process.exit(1) }

  console.log('\n✓ Agent account created successfully!')
  console.log('  Email:', EMAIL)
  console.log('  Display name:', DISPLAY_NAME)
  console.log('  Referral code:', referral_code)
  console.log('  Agent profile ID:', agentProfile.id)
}

main().catch(e => { console.error(e); process.exit(1) })
