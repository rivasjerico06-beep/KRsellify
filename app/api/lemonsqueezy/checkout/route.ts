import { NextResponse } from 'next/server'
import { getSiteConfig } from '@/lib/site-config'
import { createCheckout, isLemonSqueezyConfigured, lemonSqueezyTestMode } from '@/lib/lemonsqueezy'

/**
 * Starts a Lemon Squeezy hosted checkout for the /pay page.
 *
 * The browser sends only what prefills the form. What is sold and for how
 * much comes from LEMONSQUEEZY_VARIANT_ID on the server, so a tampered request
 * can't change the price.
 */

function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return new URL(request.url).origin
}

export async function POST(request: Request) {
  try {
    if (!isLemonSqueezyConfigured())
      return NextResponse.json({ error: 'Payments are not available right now.' }, { status: 503 })

    // The admin payments switch guards real money. Test checkouts can't take
    // any, so they stay open for trying the flow while live payments are off.
    const siteCfg = await getSiteConfig()
    if (siteCfg.payments_config.maintenance && !lemonSqueezyTestMode())
      return NextResponse.json({ error: 'Payments are temporarily unavailable.' }, { status: 503 })

    const body = await request.json().catch(() => ({})) as { email?: unknown; name?: unknown }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })

    const url = await createCheckout({
      email,
      name: name || undefined,
      redirectUrl: `${siteOrigin(request)}/pay/success`,
    })

    return NextResponse.json({ url })
  } catch (err) {
    // The detail stays in the server log — it can name store and variant ids.
    console.error('[lemonsqueezy/checkout]', err)
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 })
  }
}
