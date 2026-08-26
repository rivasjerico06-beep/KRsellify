import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { MAINTENANCE_MODE, isOpenDuringMaintenance } from '@/lib/maintenance'

/**
 * While maintenance mode is ON, every public request is rewritten to the
 * "back soon" screen and answered with 503 + noindex. The admin dashboard and
 * the payment callbacks are let through — see lib/maintenance.ts for why.
 */
export function middleware(req: NextRequest) {
  if (!MAINTENANCE_MODE) return NextResponse.next()

  const { pathname } = req.nextUrl
  if (isOpenDuringMaintenance(pathname)) return NextResponse.next()

  // robots.txt has to answer for itself — serving it the maintenance screen
  // would leave crawlers with no directive at all.
  if (pathname === '/robots.txt') return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/maintenance'

  // Rewrite keeps the visitor's URL intact. 503 marks the outage temporary so
  // search engines hold the site's place instead of dropping it, and the
  // header takes it out of the index in the meantime.
  const res = NextResponse.rewrite(url, { status: 503 })
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  res.headers.set('Retry-After', '86400')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export const config = {
  // Everything except Next's own internals and the few static files the
  // maintenance screen itself needs to render.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}
