'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { getBrowserSupabase } from '@/lib/supabase-browser'
import { Profile, AgentProfile } from '@/lib/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  agentProfile: AgentProfile | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  isApprovedAgent: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = getBrowserSupabase()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(prof ?? null)

    if (prof) {
      const { data: agent } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      setAgentProfile(agent ?? null)
    }
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setAgentProfile(null) }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setAgentProfile(null)
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  const isAdmin = profile?.role === 'admin'
  const isApprovedAgent = agentProfile?.status === 'approved'

  return (
    <AuthContext.Provider value={{ user, profile, agentProfile, session, loading, isAdmin, isApprovedAgent, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
