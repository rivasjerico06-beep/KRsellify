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

  type Tier = { label: string; qty: number; bundle_total: number }
  type Row  = { id: string; name: string; price: number; img: string; quantity_options: Tier[] | null }
  type Item = { product_id: string; bundle_label?: string; qty?: number; purpose?: string; completed?: boolean }

  /**
   * Requirements are an ordered list, and the same product may appear more
   * than once — buy it to activate, buy it again to reach the priority list.
   * Position identifies a requirement, so each entry carries its own bundle,
   * purpose and completion rather than being keyed by product id.
   *
   * Profiles saved before required_items existed are converted from the old
   * id/quantity/bundle columns on the way out, so nothing has to be re-entered.
   */
  const items: Item[] = Array.isArray(profile.required_items) && profile.required_items.length > 0
    ? profile.required_items
    : (profile.required_product_ids ?? []).map((pid: string, i: number) => ({
        product_id:   pid,
        bundle_label: (profile.required_product_bundles ?? {})[pid] ?? '',
        qty:          (profile.required_product_quantities ?? {})[pid] ?? 1,
        purpose:      i === 0 ? 'Account activation' : i === 1 ? 'Priority listing' : '',
        completed:    (profile.completed_product_ids ?? []).includes(pid),
      }))

  let required_products: object[] = []
  if (items.length > 0) {
    const ids = [...new Set(items.map(i => i.product_id).filter(Boolean))]
    const { data: products } = await admin
      .from('products')
      .select('id, name, price, img, quantity_options')
      .in('id', ids)
    const byId = new Map<string, Row>((products ?? []).map((p: Row) => [p.id, p]))

    required_products = items.flatMap((item, index) => {
      const p = byId.get(item.product_id)
      if (!p) return []   // product deleted since the requirement was set
      const tiers = Array.isArray(p.quantity_options) ? p.quantity_options : []

      // Resolve by label first. Quantity alone is ambiguous — XRP Nesara has
      // two bundles that are both quantity 2 — so the label identifies the
      // bundle. Quantity matching remains for entries saved without one.
      const byLabel = item.bundle_label ? tiers.find(o => o.label === item.bundle_label) : undefined
      const stored  = Number(item.qty ?? 1)
      const tier    = byLabel ?? tiers.find(o => Number(o.qty) === stored)

      const quantity = tier ? Number(tier.qty) : stored
      return [{
        // Unique per requirement, not per product: the same product can appear
        // twice, and React keys and completion both need to tell them apart.
        key: `${index}-${p.id}`,
        id: p.id, name: p.name, price: p.price, img: p.img,
        quantity,
        bundle_label: tier?.label ?? null,
        // A bundle's own price, never unit × quantity. Products sold without
        // bundles fall back to the multiplication, which is correct for them.
        bundle_total: tier ? Number(tier.bundle_total) : Number(p.price) * quantity,
        purpose: item.purpose ?? '',
        completed: item.completed === true,
      }]
    })
  }

  return NextResponse.json({ profile: { ...profile, required_products }, email: normalised })
}
