import { createClient } from '@supabase/supabase-js'

export interface SiteAnnounceBar {
  visible: boolean
  text: string
  highlight: string
  suffix: string
  bg_color: string
}

export interface SiteHeroSlide {
  img: string
  eyebrow: string
  title: string
  sub: string
  cta: string
  ctaLink: string
  outline: string
  outlineLink: string
}

export interface SiteBanner {
  title: string
  description: string
  stats: { num: string; label: string }[]
}

export interface SiteTrustItem {
  icon: string
  title: string
  sub: string
}

export interface SiteNewsletter {
  heading: string
  subheading: string
}

export interface SiteConfig {
  announce_bar: SiteAnnounceBar
  hero_slides: SiteHeroSlide[]
  banner: SiteBanner
  trust_bar: SiteTrustItem[]
  newsletter: SiteNewsletter
}

export const DEFAULT_CONFIG: SiteConfig = {
  announce_bar: {
    visible: true,
    bg_color: 'navy',
    text: 'Free shipping on orders over $75',
    highlight: 'Use code KRSELLIFY10 for 10% off',
    suffix: 'Limited time only',
  },
  hero_slides: [
    {
      img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80',
      eyebrow: 'New Arrivals · 2025 Collection',
      title: 'Premium Collectibles & Rare Finds',
      sub: 'Handpicked limited-edition pieces. Authentic, verified, and ready to own.',
      cta: 'Shop Now',
      ctaLink: '/shop',
      outline: 'Explore Categories',
      outlineLink: '#categories',
    },
    {
      img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1400&q=80',
      eyebrow: "Founder's Seal Collection",
      title: 'Gold & Crypto Commemorative Bars',
      sub: 'Own a piece of history. Limited mint. Ships worldwide.',
      cta: 'View Collection',
      ctaLink: '/shop',
      outline: 'Learn More',
      outlineLink: '/about',
    },
    {
      img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80',
      eyebrow: 'Exclusive Deal · Save up to 80%',
      title: 'D.O.G.E Coin & Bitcoin Diamond',
      sub: "The most sought-after crypto collectibles. Get yours before they're gone.",
      cta: 'Grab the Deal',
      ctaLink: '/shop?cat=crypto',
      outline: 'See All Deals',
      outlineLink: '/shop',
    },
  ],
  banner: {
    title: 'Why Choose KRSELLIFY?',
    description: "Every product is authenticated, quality-checked, and shipped with care. We partner with verified suppliers to bring you exclusive collectibles you won't find anywhere else.",
    stats: [
      { num: '2400', label: 'Orders Shipped' },
      { num: '4.9', label: 'Avg. Rating' },
      { num: '100', label: '% Authentic' },
    ],
  },
  trust_bar: [
    { icon: 'fa-truck-fast', title: 'Free Shipping',   sub: 'On orders over $75' },
    { icon: 'fa-lock',       title: 'Secure Payment',  sub: '256-bit SSL encryption' },
    { icon: 'fa-rotate-left',title: 'Easy Returns',    sub: '30-day return policy' },
    { icon: 'fa-star',       title: '4.9/5 Rated',     sub: '2,400+ happy customers' },
  ],
  newsletter: {
    heading: 'Stay in the Loop',
    subheading: 'Get notified about new arrivals, exclusive deals, and limited-edition drops straight to your inbox.',
  },
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url.includes('your-project-id')) return DEFAULT_CONFIG

  try {
    const supabase = createClient(url, key)
    const { data } = await supabase.from('site_config').select('key, value')
    if (!data?.length) return DEFAULT_CONFIG

    const merged: SiteConfig = { ...DEFAULT_CONFIG }
    for (const row of data) {
      if (row.key in merged) {
        (merged as unknown as Record<string, unknown>)[row.key] = row.value
      }
    }
    return merged
  } catch {
    return DEFAULT_CONFIG
  }
}
