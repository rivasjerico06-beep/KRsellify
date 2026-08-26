// Preflight for the Airwallex integration.
//
//   node scripts/check-airwallex.js
//
// Verifies the credentials in .env.local actually work, end to end, WITHOUT
// printing any secret. Every check reports pass/fail and, when it fails, the
// exact thing to go fix.
//
// Safe to run against production: the only thing it creates is a $1.00
// PaymentIntent that is never confirmed, so no money moves and it simply
// expires. Nothing is written to your database.

require('fs').readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=')
  if (k && k.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim()
})

const API_BASE = {
  demo: 'https://api.sandbox.airwallex.com',
  prod: 'https://api.airwallex.com',
}

const green = s => `\x1b[32m${s}\x1b[0m`
const red = s => `\x1b[31m${s}\x1b[0m`
const dim = s => `\x1b[2m${s}\x1b[0m`
const bold = s => `\x1b[1m${s}\x1b[0m`

let failures = 0
function pass(label, detail) { console.log(`${green('  PASS')}  ${label}${detail ? dim('  — ' + detail) : ''}`) }
function fail(label, detail) { failures++; console.log(`${red('  FAIL')}  ${label}${detail ? '\n        ' + red(detail) : ''}`) }
function info(label) { console.log(`${dim('  ····')}  ${dim(label)}`) }

/** Shows only enough of a secret to tell two apart. Never the whole thing. */
function fingerprint(v) {
  if (!v) return ''
  return v.length <= 8 ? `${v.length} chars` : `${v.slice(0, 4)}…${v.slice(-2)} (${v.length} chars)`
}

async function main() {
  console.log(bold('\nAirwallex preflight\n'))

  // ── 1. Environment variables ────────────────────────────────
  console.log(bold('1. Environment variables'))

  const clientId = process.env.AIRWALLEX_CLIENT_ID
  const apiKey = process.env.AIRWALLEX_API_KEY
  const webhookSecret = process.env.AIRWALLEX_WEBHOOK_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const rawEnv = process.env.AIRWALLEX_ENV
  const env = rawEnv === 'prod' ? 'prod' : 'demo'

  clientId
    ? pass('AIRWALLEX_CLIENT_ID', fingerprint(clientId))
    : fail('AIRWALLEX_CLIENT_ID is missing', 'Airwallex → Settings → Developer → API keys')
  apiKey
    ? pass('AIRWALLEX_API_KEY', fingerprint(apiKey))
    : fail('AIRWALLEX_API_KEY is missing', 'Airwallex → Settings → Developer → API keys')

  if (!rawEnv) {
    info(`AIRWALLEX_ENV not set — defaulting to "demo" (sandbox, no real money)`)
  } else if (rawEnv !== 'demo' && rawEnv !== 'prod') {
    fail(`AIRWALLEX_ENV is "${rawEnv}"`, 'Must be exactly "demo" or "prod". Anything else is treated as demo.')
  } else {
    pass('AIRWALLEX_ENV', rawEnv === 'prod' ? 'PRODUCTION — real cards will be charged' : 'demo (sandbox)')
  }

  webhookSecret
    ? pass('AIRWALLEX_WEBHOOK_SECRET', fingerprint(webhookSecret))
    : fail('AIRWALLEX_WEBHOOK_SECRET is missing',
        'Without it every webhook is rejected, so an order is only confirmed if\n        the shopper makes it back to the success page. Set it before going live.')

  if (!siteUrl) {
    fail('NEXT_PUBLIC_SITE_URL is missing', 'Airwallex needs an https URL to send the shopper back to.')
  } else if (!siteUrl.startsWith('https://')) {
    fail(`NEXT_PUBLIC_SITE_URL is "${siteUrl}"`, 'Airwallex requires https for the return URL.')
  } else {
    pass('NEXT_PUBLIC_SITE_URL', siteUrl)
  }

  if (!clientId || !apiKey) {
    console.log(red('\nCannot test the connection without both credentials. Stopping here.\n'))
    process.exit(1)
  }

  // ── 2. Authentication ───────────────────────────────────────
  console.log(bold(`\n2. Connection to ${API_BASE[env]}`))

  let token
  try {
    const res = await fetch(`${API_BASE[env]}/api/v1/authentication/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-id': clientId, 'x-api-key': apiKey },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.token) {
      fail(`Authentication rejected (HTTP ${res.status})`, data.message || data.code || 'No token returned.')
      if (res.status === 401) {
        console.log(dim('        Usual causes: key belongs to the OTHER environment (a sandbox key'))
        console.log(dim('        cannot log in to production, or vice versa), or the key was revoked.'))
      }
      console.log('')
      process.exit(1)
    }
    token = data.token
    pass('Authenticated', `token expires ${data.expires_at || 'in ~30 min'}`)
  } catch (err) {
    fail('Could not reach Airwallex', err.message)
    process.exit(1)
  }

  // ── 3. Payment permission ───────────────────────────────────
  // Authenticating only proves the key is real. Creating an intent is what
  // proves it is SCOPED for payments — the most common misconfiguration.
  console.log(bold('\n3. Payment permissions'))

  try {
    const res = await fetch(`${API_BASE[env]}/api/v1/pa/payment_intents/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        request_id: require('crypto').randomUUID(),
        amount: 1.0,
        currency: 'USD',
        merchant_order_id: `preflight-${Date.now()}`,
        return_url: `${siteUrl || 'https://example.com'}/order-success`,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      fail(`Could not create a test PaymentIntent (HTTP ${res.status})`, data.message || data.code || '')
      console.log(dim('        The key authenticates but lacks payment permissions. Recreate it'))
      console.log(dim('        with the Payments scope enabled.'))
    } else {
      pass('Created a test PaymentIntent', `${data.id} · never confirmed, expires on its own`)
      // Sanity-check the units gotcha: we asked for 1.00, not 100 cents.
      if (Number(data.amount) === 1) {
        pass('Amount units confirmed', 'major units — 1.00 means $1.00')
      } else {
        fail(`Amount came back as ${data.amount} for a requested 1.00`,
          'Unexpected — check lib/airwallex.ts before taking real payments.')
      }
    }
  } catch (err) {
    fail('PaymentIntent request failed', err.message)
  }

  // ── 4. Database column ──────────────────────────────────────
  console.log(bold('\n4. Database'))

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    info('Supabase keys not in .env.local — skipping the column check')
  } else {
    try {
      const { createClient } = require('@supabase/supabase-js')
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } })
      const { error } = await admin.from('orders').select('airwallex_intent_id').limit(1)
      if (error && error.code === '42703') {
        fail('orders.airwallex_intent_id does not exist',
          'Run supabase/airwallex.sql. Payments still work without it, but you\n        lose the link between an order and its Airwallex transaction.')
      } else if (error) {
        info(`Could not check the column: ${error.message}`)
      } else {
        pass('orders.airwallex_intent_id exists')
      }
    } catch (err) {
      info(`Skipped the database check: ${err.message}`)
    }
  }

  // ── 5. Webhook reminder ─────────────────────────────────────
  console.log(bold('\n5. Webhook'))
  info('Cannot be verified from here — Airwallex has to reach your deployed site.')
  console.log(dim(`        Register: ${siteUrl || 'https://YOUR-DOMAIN'}/api/airwallex/webhook`))
  console.log(dim('        Airwallex → Settings → Developer → Webhooks → subscribe to payment_intent events'))

  console.log(
    failures === 0
      ? green(bold('\nAll automated checks passed.\n'))
      : red(bold(`\n${failures} check(s) failed — see above.\n`)),
  )
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(err => { console.error(red(`\nUnexpected error: ${err.message}\n`)); process.exit(1) })
