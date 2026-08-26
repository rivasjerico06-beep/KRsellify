/**
 * AIRWALLEX — SERVER-SIDE CLIENT
 * ------------------------------
 * Everything that needs the API key lives here so the credentials never reach
 * the browser. The only value the client is ever handed is the PaymentIntent's
 * `client_secret`, which is scoped to that one intent and is designed to be
 * public.
 *
 * Flow this supports (Hosted Payment Page):
 *   1. server  — createPaymentIntent()  → { id, client_secret }
 *   2. browser — redirectToCheckout()   → Airwallex-hosted card page
 *   3. server  — retrievePaymentIntent() confirms the money actually moved
 *
 * Step 3 is the important one: the browser coming back to /order-success and
 * the webhook firing are both *hints* that a payment happened. Neither is
 * trusted. We always re-read the intent from Airwallex and look at `status`.
 *
 * ⚠ AMOUNTS ARE IN MAJOR UNITS. Airwallex takes `9.99` for $9.99, NOT `999`
 * like Stripe. Sending cents here charges the customer 100× the order total.
 */

import crypto from 'crypto'

// Airwallex calls the sandbox "demo" in the browser SDK but hosts it at
// api.sandbox.airwallex.com — hence the two different spellings below.
export type AirwallexEnv = 'demo' | 'prod'

const API_BASE: Record<AirwallexEnv, string> = {
  demo: 'https://api.sandbox.airwallex.com',
  prod: 'https://api.airwallex.com',
}

/**
 * Defaults to the sandbox on purpose. A deploy that forgets to set
 * AIRWALLEX_ENV should fail towards "takes no real money", never towards
 * "silently charges live cards against sandbox expectations".
 */
export function airwallexEnv(): AirwallexEnv {
  return process.env.AIRWALLEX_ENV === 'prod' ? 'prod' : 'demo'
}

function apiBase(): string {
  return (process.env.AIRWALLEX_API_BASE ?? API_BASE[airwallexEnv()]).replace(/\/$/, '')
}

/** True when the server holds enough credentials to talk to Airwallex. */
export function isAirwallexConfigured(): boolean {
  return !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY)
}

// ── Access token ──────────────────────────────────────────────
// Tokens last 30 minutes and Airwallex explicitly asks integrators not to log
// in before every call. Fluid Compute reuses function instances, so this
// module-level cache survives across requests and usually saves the round trip.

let tokenCache: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const clientId = process.env.AIRWALLEX_CLIENT_ID
  const apiKey = process.env.AIRWALLEX_API_KEY
  if (!clientId || !apiKey)
    throw new Error('AIRWALLEX_CLIENT_ID / AIRWALLEX_API_KEY are not set')

  // Refresh two minutes early so a token can't expire mid-flight.
  if (tokenCache && Date.now() < tokenCache.expiresAt - 120_000) return tokenCache.token

  const res = await fetch(`${apiBase()}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.token) {
    tokenCache = null
    throw new Error(`Airwallex auth failed (${res.status}): ${data?.message ?? 'no token returned'}`)
  }

  // expires_at is an ISO timestamp. Fall back to the documented 30 minutes if
  // it is missing or unparseable rather than caching a token forever.
  const parsed = data.expires_at ? Date.parse(data.expires_at) : NaN
  tokenCache = {
    token: data.token,
    expiresAt: Number.isFinite(parsed) ? parsed : Date.now() + 30 * 60_000,
  }
  return tokenCache.token
}

async function airwallexFetch(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const token = await getAccessToken()
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = (data as { message?: string; code?: string })?.message
      ?? (data as { code?: string })?.code
      ?? res.statusText
    throw new Error(`Airwallex ${path} failed (${res.status}): ${detail}`)
  }
  return data as Record<string, unknown>
}

// ── PaymentIntents ────────────────────────────────────────────

export interface AirwallexPaymentIntent {
  id: string
  client_secret: string
  /** SUCCEEDED | REQUIRES_PAYMENT_METHOD | REQUIRES_CUSTOMER_ACTION | REQUIRES_CAPTURE | CANCELLED | ... */
  status: string
  /** Major units, e.g. 9.99 */
  amount: number
  currency: string
  merchant_order_id?: string
}

export async function createPaymentIntent(params: {
  /** MAJOR units — 9.99 means $9.99. Not cents. */
  amount: number
  currency: string
  /** Our own order id, echoed back to us on the webhook. */
  merchantOrderId: string
  returnUrl: string
  customer?: { email?: string; first_name?: string; last_name?: string }
  metadata?: Record<string, string>
}): Promise<AirwallexPaymentIntent> {
  const amount = Number(params.amount.toFixed(2))
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error('Invalid Airwallex amount')

  const data = await airwallexFetch('/api/v1/pa/payment_intents/create', {
    method: 'POST',
    body: JSON.stringify({
      // Idempotency key — a retried create must not open a second intent.
      request_id: crypto.randomUUID(),
      amount,
      currency: params.currency,
      merchant_order_id: params.merchantOrderId,
      return_url: params.returnUrl,
      ...(params.customer ? { customer: params.customer } : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
    }),
  })

  return data as unknown as AirwallexPaymentIntent
}

export async function retrievePaymentIntent(id: string): Promise<AirwallexPaymentIntent> {
  const data = await airwallexFetch(`/api/v1/pa/payment_intents/${encodeURIComponent(id)}`, {
    method: 'GET',
  })
  return data as unknown as AirwallexPaymentIntent
}

// ── Webhooks ──────────────────────────────────────────────────

/**
 * Verifies an Airwallex webhook.
 *
 * Airwallex signs `x-timestamp + rawBody` with the subscription's secret using
 * HMAC-SHA256. The raw body must be the exact bytes received — re-serializing
 * a parsed object reorders keys and breaks the signature.
 *
 * The timestamp check is what stops a captured-and-replayed webhook from
 * flipping an order to paid again later.
 */
export function verifyWebhookSignature({
  rawBody,
  timestamp,
  signature,
  toleranceSeconds = 300,
}: {
  rawBody: string
  timestamp: string | null
  signature: string | null
  toleranceSeconds?: number
}): boolean {
  const secret = process.env.AIRWALLEX_WEBHOOK_SECRET
  if (!secret || !timestamp || !signature) return false

  const sent = Number(timestamp)
  if (!Number.isFinite(sent)) return false
  // Airwallex sends milliseconds; accept seconds too rather than rejecting a
  // valid webhook over a unit guess.
  const sentMs = sent > 1e12 ? sent : sent * 1000
  if (Math.abs(Date.now() - sentMs) > toleranceSeconds * 1000) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(timestamp + rawBody)
    .digest('hex')

  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  // timingSafeEqual throws on a length mismatch, so check that first.
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
