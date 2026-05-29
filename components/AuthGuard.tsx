'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface Props {
  children: React.ReactNode
  adminOnly?: boolean
  agentOnly?: boolean
  authRequired?: boolean
}

export default function AuthGuard({ children, adminOnly, agentOnly, authRequired = true }: Props) {
  const { user, profile, isAdmin, isApprovedAgent, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (authRequired && !user) { router.replace('/login'); return }
    if (adminOnly && !isAdmin) { router.replace('/'); return }
    if (agentOnly && !isApprovedAgent) { router.replace('/agent-login'); return }
  }, [loading, user, isAdmin, isApprovedAgent, authRequired, adminOnly, agentOnly, router])

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-light)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--teal)', marginBottom: 12, display: 'block' }} />
          Loading…
        </div>
      </div>
    )
  }

  if (authRequired && !user) return null
  if (adminOnly && !isAdmin) return null
  if (agentOnly && !isApprovedAgent) return null

  return <>{children}</>
}
