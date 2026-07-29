import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * SALES AGENT ATTRIBUTION
 * -----------------------
 * Orders can carry the 4–6 digit code of the agent who referred the sale, taken
 * from the `?agent=` link an agent shares. That code arrives on the checkout
 * request body, so it is attacker-controlled and must never be written straight
 * onto the order.
 *
 * Matching the digit pattern is not enough: it says nothing about whether the
 * code belongs to a real agent, and nothing about whether that agent is still
 * allowed to earn. A suspended or rejected agent's links stay in circulation
 * long after the suspension, and a guessed number would otherwise attribute a
 * sale to a code that belongs to nobody.
 *
 * So every code is resolved against `agent_profiles` and only credited when it
 * maps to an agent whose status is 'approved'.
 */

const AGENT_CODE_RE = /^\d{4,6}$/

/**
 * Resolve a client-supplied referral code into an attributable agent code.
 * Returns the code when it belongs to a currently approved agent, otherwise
 * null — the order is still placed, it just earns nobody commission.
 *
 * Fails closed: a lookup error (including `agent_code` not being migrated in
 * yet) drops the attribution rather than trusting the raw input.
 */
export async function resolveAgentCode(
  admin: SupabaseClient,
  agentCode: unknown,
): Promise<string | null> {
  if (typeof agentCode !== 'string') return null

  const code = agentCode.trim()
  if (!AGENT_CODE_RE.test(code)) return null

  const { data, error } = await admin
    .from('agent_profiles')
    .select('agent_code')
    .eq('agent_code', code)
    .eq('status', 'approved')
    .maybeSingle()

  if (error || !data) return null
  return code
}
