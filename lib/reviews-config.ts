export interface SiteReview {
  text: string
  name: string
  role: string
  avatar: string
  stars: number
}

export const DEFAULT_REVIEWS: SiteReview[] = [
  { text: 'I ordered the Bitcoin Diamond and it exceeded all expectations. The packaging was gorgeous and the piece itself is stunning. Will definitely be ordering more collectibles!', name: 'Kristy R.', role: 'Collector', avatar: 'https://i.pravatar.cc/100?img=47', stars: 5 },
  { text: "The gold bar arrived beautifully packaged. As a coin collector, this is one of the most beautiful commemorative pieces I've ever seen. Passing it down to my grandkids for sure.", name: 'William C.', role: 'Investor', avatar: 'https://i.pravatar.cc/100?img=33', stars: 5 },
  { text: 'Shipping was fast and the D.O.G.E Coin is absolutely breathtaking. The detail work is incredible. Customer support was also super helpful when I had questions.', name: 'James P.', role: 'Crypto Enthusiast', avatar: 'https://i.pravatar.cc/100?img=12', stars: 5 },
  { text: "Got the Trump gold bar as a gift for my father and he absolutely loves it. The quality is unmatched. Will be buying more as gifts for sure.", name: 'Sarah M.', role: 'Gift Buyer', avatar: 'https://i.pravatar.cc/100?img=25', stars: 5 },
  { text: "The Bitcoin Crypto Passport is a masterpiece. Every detail is perfect. I've bought from many collectibles sites but PATRIOT’S ONLINE SHOP is by far the best quality.", name: 'Michael T.', role: 'Premium Buyer', avatar: 'https://i.pravatar.cc/100?img=68', stars: 5 },
  { text: "Received the Nesara Gesara Gold Coin and couldn't be happier. The craftsmanship is exceptional — it's the centerpiece of my whole collection now.", name: 'Amanda L.', role: 'Collector', avatar: 'https://i.pravatar.cc/100?img=44', stars: 5 },
]

/** Only public HTTPS images or local image paths may be used as review photos. */
export function isReviewAvatar(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/\s/.test(value) && value.length > 1) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

export function isSiteReviews(value: unknown): value is SiteReview[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 50 && value.every(review => (
    review !== null && typeof review === 'object'
    && typeof review.name === 'string' && review.name.trim().length > 0 && review.name.length <= 120
    && typeof review.role === 'string' && review.role.length <= 120
    && typeof review.text === 'string' && review.text.trim().length > 0 && review.text.length <= 2000
    && typeof review.avatar === 'string' && review.avatar.length <= 2048 && isReviewAvatar(review.avatar)
    && Number.isInteger(review.stars) && review.stars >= 1 && review.stars <= 5
  ))
}

export function normalizeReviews(value: unknown): SiteReview[] {
  return isSiteReviews(value) ? value : DEFAULT_REVIEWS
}
