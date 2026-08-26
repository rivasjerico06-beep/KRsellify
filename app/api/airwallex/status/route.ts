import { NextResponse } from 'next/server'
import { getSiteConfig } from '@/lib/site-config'
import { isAirwallexConfigured } from '@/lib/airwallex'

/**
 * Whether the checkout should offer card payment.
 *
 * The credentials themselves stay server-side, so the browser can't work this
 * out for itself — it asks. Keeping it a single server-owned answer means the
 * checkout button and the create-intent route can never disagree about whether
 * cards are live.
 */
export async function GET() {
  const siteCfg = await getSiteConfig()
  return NextResponse.json({
    enabled: isAirwallexConfigured() && !siteCfg.payments_config.maintenance,
  })
}
