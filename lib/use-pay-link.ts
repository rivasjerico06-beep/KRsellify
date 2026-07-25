'use client'

import { useEffect, useState } from 'react'
import { SitePayLinkConfig, DEFAULT_PAY_LINK_CONFIG, normalizePayLinkConfig } from './pay-link'

/**
 * Shared client-side access to the pay-link config.
 *
 * ProductCard renders many times per page, so the fetch is memoised at module
 * level — every component awaits the same in-flight promise and the browser
 * makes one request per page load. Admin changes appear on the next reload.
 */
let cached: Promise<SitePayLinkConfig> | null = null

export function loadPayLinkConfig(): Promise<SitePayLinkConfig> {
  if (!cached) {
    cached = fetch('/api/site-config')
      .then(r => r.json())
      .then((rows: { key: string; value: unknown }[]) => {
        const row = Array.isArray(rows) ? rows.find(x => x.key === 'pay_link') : null
        return normalizePayLinkConfig(row?.value)
      })
      .catch(() => DEFAULT_PAY_LINK_CONFIG)
  }
  return cached
}

/** null while still loading — callers should not assume a default mid-flight. */
export function usePayLinkConfig(): SitePayLinkConfig | null {
  const [cfg, setCfg] = useState<SitePayLinkConfig | null>(null)
  useEffect(() => {
    let alive = true
    loadPayLinkConfig().then(c => { if (alive) setCfg(c) })
    return () => { alive = false }
  }, [])
  return cfg
}
