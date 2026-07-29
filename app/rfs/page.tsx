import { getSiteConfig } from '@/lib/site-config'
import { normalizeRfsConfig } from '@/lib/rfs-config'
import { RFSPortal, RFSUnavailable } from './rfs-client'

/**
 * The RFS portal is opened and closed from admin → Settings, so this page must
 * never be cached: a toggle has to take effect on the next request, not after
 * a redeploy or whenever a revalidation window happens to lapse.
 */
export const dynamic = 'force-dynamic'

export default async function RFSPage() {
  const rfs = normalizeRfsConfig((await getSiteConfig()).rfs_config)

  // Decided on the server so the portal never flashes into view before the
  // switch has been read.
  if (!rfs.enabled) return <RFSUnavailable />
  return <RFSPortal />
}
