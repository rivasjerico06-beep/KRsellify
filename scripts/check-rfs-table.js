const { createClient } = require('@supabase/supabase-js')
const admin = createClient('https://ewwrpldcdwzwoodbsrzf.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
admin.from('rfs_profiles').select('id').limit(1).then(r => {
  if (!r.error) console.log('Table EXISTS')
  else console.log('Table MISSING — error:', r.error.message)
}).catch(e => console.error(e))
