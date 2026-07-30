import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { getSiteConfig } from '@/lib/site-config'
import { normalizeRfsConfig } from '@/lib/rfs-config'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request) {
  // Checked here as well as on the page: this is the endpoint that actually
  // returns a customer's reward profile, and it can be called directly, so
  // closing only the page would leave the data reachable.
  const rfs = normalizeRfsConfig((await getSiteConfig()).rfs_config)
  if (!rfs.enabled)
    return NextResponse.json(
      { error: 'The RFS portal is temporarily unavailable. Please check back soon.' },
      { status: 503 },
    )

  const { email } = await request.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const normalised = email.toLowerCase().trim()
  if (!EMAIL_REGEX.test(normalised) || normalised.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  const { data: profile, error } = await admin
    .from('rfs_profiles')
    .select('*')
    .eq('gmail', normalised)
    .single()

  if (error || !profile) {
    return NextResponse.json({
      error: 'No profile found for this email. Please contact your representative.',
    }, { status: 404 })
  }

  let required_products: object[] = []
  if (profile.required_product_ids?.length > 0) {
    const { data: products } = await admin
      .from('products')
      .select('id, name, price, img, quantity_options')
      .in('id', profile.required_product_ids)
    const qtys: Record<string, number> = profile.required_product_quantities ?? {}
    const bundles: Record<string, string> = profile.required_product_bundles ?? {}

    type Tier = { label: string; qty: number; bundle_total: number }
    type Row = { id: string; name: string; price: number; img: string; quantity_options: Tier[] | null }

    required_products = (products ?? []).map((p: Row) => {
      const tiers = Array.isArray(p.quantity_options) ? p.quantity_options : []

      // Resolve by label first. Quantity alone is ambiguous — XRP Nesara has
      // two different bundles that are both quantity 2 — so the label is what
      // identifies the bundle. Quantity matching stays as a fallback for
      // profiles saved before labels were recorded.
      const byLabel = bundles[p.id] ? tiers.find(o => o.label === bundles[p.id]) : undefined
      const stored  = qtys[p.id] ?? 1
      const tier    = byLabel ?? tiers.find(o => Number(o.qty) === Number(stored))

      const quantity = tier ? Number(tier.qty) : stored
      return {
        id: p.id, name: p.name, price: p.price, img: p.img,
        quantity,
        bundle_label: tier?.label ?? null,
        // A bundle's own price, never unit × quantity. Products sold without
        // bundles fall back to the multiplication, which is correct for them.
        bundle_total: tier ? Number(tier.bundle_total) : Number(p.price) * quantity,
      }
    })
  }

  return NextResponse.json({ profile: { ...profile, required_products }, email: normalised })
}
