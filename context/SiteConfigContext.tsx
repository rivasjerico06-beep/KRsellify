'use client'

import { createContext, useContext } from 'react'
import { SiteConfig, DEFAULT_CONFIG } from '@/lib/site-config'

/**
 * Owner-editable content, handed down from the root layout.
 *
 * The header, footer and category cards are client components rendered by
 * every page, so threading config through each page as props would mean
 * touching them all and forgetting one. The root layout reads the config once
 * on the server and publishes it here instead — which also means the values
 * are present on first paint, with no flash of placeholder content.
 *
 * Defaults back the context, so a component used outside the provider (or
 * before it mounts) still renders the site as it looks today rather than
 * blank.
 */
const SiteConfigContext = createContext<SiteConfig>(DEFAULT_CONFIG)

export function SiteConfigProvider({
  config,
  children,
}: {
  config: SiteConfig
  children: React.ReactNode
}) {
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>
}

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext)
}
