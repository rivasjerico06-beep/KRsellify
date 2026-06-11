import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { DEFAULT_CONFIG } from '@/lib/site-config'

export async function GET() {
  try {
    const admin = getAdminSupabase()
    const { data } = await admin
      .from('site_config')
      .select('value')
      .eq('key', 'vip_price')
      .maybeSingle()

    const price = typeof data?.value === 'number' ? data.value : DEFAULT_CONFIG.vip_price
    return NextResponse.json({ price })
  } catch {
    return NextResponse.json({ price: DEFAULT_CONFIG.vip_price })
  }
}
