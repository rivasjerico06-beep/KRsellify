import type { Metadata } from 'next'
import { getOffer, isLemonSqueezyConfigured, lemonSqueezyTestMode, type LemonSqueezyOffer } from '@/lib/lemonsqueezy'
import PayClient from './pay-client'

// The price is read from Lemon Squeezy, so an edit there shows up here within
// a minute instead of waiting for a redeploy.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Pay — PATRIOT’S ONLINE SHOP',
  description: 'Secure checkout powered by Lemon Squeezy.',
  robots: { index: false, follow: false },
}

export default async function PayPage() {
  let offer: LemonSqueezyOffer | null = null
  if (isLemonSqueezyConfigured()) {
    try {
      offer = await getOffer()
    } catch (err) {
      console.error('[pay] could not load the Lemon Squeezy product', err)
    }
  }

  return <PayClient offer={offer} testMode={lemonSqueezyTestMode()} />
}
