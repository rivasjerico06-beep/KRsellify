import type { MetadataRoute } from 'next'
import { MAINTENANCE_MODE } from '@/lib/maintenance'

/**
 * While the site is down, disallow everything. robots.txt stops the crawl;
 * the X-Robots-Tag the middleware sets is what actually drops pages already
 * in the index — the two do different jobs, so both are set.
 *
 * Evaluated per request, not at build. This route would otherwise be
 * prerendered with whatever MAINTENANCE_MODE was set at build time, so
 * turning the site back on via the env var would restore every page while
 * robots.txt still read "Disallow: /" — live but permanently unindexable
 * until someone happened to rebuild.
 */
export const dynamic = 'force-dynamic'
export default function robots(): MetadataRoute.Robots {
  if (MAINTENANCE_MODE) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/agent', '/api/'] }],
  }
}
