'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ReferralHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const [msg, setMsg] = useState('Loading your product…')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const ref  = params.get('ref')
    const add  = params.get('add')
    const tier = params.get('tier')
    const qty  = params.get('qty')

    // Save the agent's ID so their sale is credited automatically at checkout.
    // Stored as a 60-day cookie (durable, survives across sessions/tabs) and
    // in localStorage as a fallback.
    if (ref && /^\d{4,6}$/.test(ref)) {
      const maxAge = 60 * 24 * 60 * 60 // 60 days
      try { document.cookie = `themaga_ref=${ref}; path=/; max-age=${maxAge}; samesite=lax` } catch { /* ignore */ }
      try { localStorage.setItem('themaga_agent_ref', JSON.stringify({ code: ref, ts: Date.now() })) } catch { /* ignore */ }
    }

    // Send the client straight to the selected product page, carrying the
    // agent's chosen quantity/tier so it's pre-selected.
    if (add) {
      const q = new URLSearchParams()
      if (tier != null) q.set('tier', tier)
      else if (qty != null) q.set('qty', qty)
      const suffix = q.toString() ? `?${q.toString()}` : ''
      router.replace(`/products/${encodeURIComponent(add)}${suffix}`)
    } else {
      router.replace('/shop')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, textAlign: 'center' }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 34, color: 'var(--teal)' }} />
      <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--heading)', fontFamily: 'var(--font-playfair)' }}>{msg}</p>
    </div>
  )
}

export default function ReferralPage() {
  return (
    <Suspense fallback={null}>
      <ReferralHandler />
    </Suspense>
  )
}
