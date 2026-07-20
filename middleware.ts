import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { MAINTENANCE_MODE } from '@/lib/maintenance'

// While maintenance mode is ON, every page request is served the
// "we'll be back soon" screen. Static assets and Next internals are
// excluded via the matcher below so the maintenance page renders correctly.
export function middleware(req: NextRequest) {
  if (!MAINTENANCE_MODE) return NextResponse.next()

  const { pathname } = req.nextUrl

  // Let the maintenance page itself through to avoid a rewrite loop.
  if (pathname === '/maintenance') return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/maintenance'
  // Rewrite (URL stays the same for the visitor) and signal 503 so search
  // engines know this is temporary and don't de-index the site.
  return NextResponse.rewrite(url, { status: 503 })
}

export const config = {
  // Run on every request except Next internals, static files, and the logo.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}
