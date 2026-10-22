/**
 * LEMON SQUEEZY — SERVER-SIDE CLIENT
 * ----------------------------------
 * Everything that needs the API key lives here so it never reaches the
 * browser. The key is account-wide: whoever holds it can read every order and
 * issue refunds. The only thing the client is ever handed is a checkout URL,
 * which is scoped to that one checkout and is designed to be public.
 *
 * Flow this supports (hosted checkout):
 *   1. server  — createCheckout() → https://<store>.lemonsqueezy.com/checkout/...
 *   2. browser — redirected there, pays on Lemon Squeezy's own page
 *   3. browser — sent back to /pay/success once the payment has gone through
 *
 * ⚠ AMOUNTS ARE IN MINOR UNITS. A variant `price` of 999 is $9.99.
 */

const API_BASE = 'https://api.lemonsqueezy.com/v1'

/**
 * Defaults to test mode on purpose. A deploy that forgets to set
 * LEMONSQUEEZY_TEST_MODE should fail towards "takes no real money", so only
 * an explicit "false" creates live checkouts. A test-mode API key can only
 * ever create test checkouts, whatever this says.
 */
export function lemonSqueezyTestMode(): boolean {
  return process.env.LEMONSQUEEZY_TEST_MODE !== 'false'
}

/** True when the server holds the key and knows what it is selling. */
export function isLemonSqueezyConfigured(): boolean {
  return !!(
    process.env.LEMONSQUEEZY_API_KEY &&
    process.env.LEMONSQUEEZY_STORE_ID &&
    process.env.LEMONSQUEEZY_VARIANT_ID
  )
}

async function lsFetch(path: string, init: RequestInit & { next?: { revalidate: number } } = {}) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) throw new Error('LEMONSQUEEZY_API_KEY is not set')

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
      ...init.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data?.errors?.[0]?.detail ?? data?.errors?.[0]?.title ?? 'no detail'
    throw new Error(`Lemon Squeezy ${init.method ?? 'GET'} ${path} failed (${res.status}): ${detail}`)
  }
  return data
}

export interface LemonSqueezyOffer {
  productName: string
  /** Plain text — Lemon Squeezy stores product descriptions as HTML. */
  description: string
  variantName: string
  /** Minor units of `currency`. */
  price: number
  currency: string
  priceFormatted: string
}

/**
 * What the pay page is selling, read live from Lemon Squeezy so the price
 * shown is always the price charged. Cached for five minutes: the page is
 * public and the API allows 300 calls a minute per key.
 */
export async function getOffer(): Promise<LemonSqueezyOffer> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID
  if (!storeId || !variantId) throw new Error('LEMONSQUEEZY_STORE_ID / LEMONSQUEEZY_VARIANT_ID are not set')

  const cache = { next: { revalidate: 300 } }
  const [variantRes, storeRes] = await Promise.all([
    lsFetch(`/variants/${encodeURIComponent(variantId)}?include=product`, cache),
    lsFetch(`/stores/${encodeURIComponent(storeId)}`, cache),
  ])

  const variant = variantRes.data.attributes
  const product = variantRes.included?.find((i: { type: string }) => i.type === 'products')?.attributes
  const currency: string = storeRes.data.attributes.currency ?? 'USD'
  const price: number = variant.price

  return {
    productName: product?.name ?? variant.name,
    description: stripHtml(product?.description ?? variant.description ?? ''),
    variantName: variant.name,
    price,
    currency,
    priceFormatted: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price / 100),
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Creates a hosted checkout for the configured variant and returns its URL.
 * Name and email only prefill the form — the customer can still change them
 * on Lemon Squeezy's page.
 */
export async function createCheckout(opts: {
  email?: string
  name?: string
  redirectUrl: string
}): Promise<string> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID
  if (!storeId || !variantId) throw new Error('LEMONSQUEEZY_STORE_ID / LEMONSQUEEZY_VARIANT_ID are not set')

  const checkoutData: Record<string, string> = {}
  if (opts.email) checkoutData.email = opts.email
  if (opts.name) checkoutData.name = opts.name

  const data = await lsFetch('/checkouts', {
    method: 'POST',
    cache: 'no-store',
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: checkoutData,
          product_options: {
            redirect_url: opts.redirectUrl,
            // Only this variant — the URL can't be reused to buy something else.
            enabled_variants: [Number(variantId)],
          },
          // A checkout link that outlives the visit is one more thing to leak.
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          test_mode: lemonSqueezyTestMode(),
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    }),
  })

  const url = data?.data?.attributes?.url
  if (typeof url !== 'string') throw new Error('Lemon Squeezy returned no checkout URL')
  return url
}
