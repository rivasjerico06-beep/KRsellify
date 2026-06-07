import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const body = await request.json()
  const { event_type, resource } = body

  const admin = getAdminSupabase()

  if (event_type === 'BILLING.SUBSCRIPTION.CANCELLED' || event_type === 'BILLING.SUBSCRIPTION.EXPIRED') {
    await admin
      .from('vip_subscriptions')
      .update({ status: 'cancelled' })
      .eq('paypal_subscription_id', resource.id)
  }

  if (event_type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
    await admin
      .from('vip_subscriptions')
      .update({ status: 'suspended' })
      .eq('paypal_subscription_id', resource.id)
  }

  if (event_type === 'BILLING.SUBSCRIPTION.REACTIVATED' || event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    await admin
      .from('vip_subscriptions')
      .update({ status: 'active' })
      .eq('paypal_subscription_id', resource.id)
  }

  return NextResponse.json({ received: true })
}
