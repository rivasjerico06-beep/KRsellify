import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import { AnalyticsData, DailyRevenue, CategoryRevenue, StatusCount, AgentStat, CustomerTierRow } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  pending:   '#fef9c3',
  confirmed: '#dbeafe',
  packed:    '#ede9fe',
  shipped:   '#e0f2fe',
  delivered: '#d1fae5',
  cancelled: '#fee2e2',
}

function getTier(spent: number): CustomerTierRow['tier'] {
  if (spent >= 2000) return 'platinum'
  if (spent >= 1000) return 'gold'
  if (spent >= 500)  return 'silver'
  return 'bronze'
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()

  const thirtyAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const _wk        = new Date()
  const weekStart  = new Date(_wk.getFullYear(), _wk.getMonth(), _wk.getDate() - _wk.getDay()).toISOString() // Sunday 00:00

  const [ordersRes, agentsRes, profilesRes, leadsRes, callLogsRes, authUsersRes] = await Promise.all([
    admin.from('orders').select('id,total,discount_amount,status,items,referral_code,user_id,guest_email,created_at').neq('status', 'pending_payment').order('created_at', { ascending: false }),
    admin.from('agent_profiles').select('user_id,display_name,referral_code,status').eq('status', 'approved'),
    admin.from('profiles').select('id,full_name,role,phone').eq('role', 'customer'),
    admin.from('leads').select('id,agent_id,status,customer_email,customer_phone'),
    admin.from('call_logs').select('lead_id,agent_name,disposition,created_at'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const allOrders  = ordersRes.data ?? []
  const agents     = agentsRes.data ?? []
  const profiles   = profilesRes.data ?? []
  const allLeads   = leadsRes.data ?? []
  const allLogs    = callLogsRes.data ?? []
  const authUsers  = authUsersRes.data?.users ?? []

  // Build email → userId map from auth (for logged-in order matching)
  const authEmailToUserId: Record<string, string> = {}
  for (const u of authUsers) if (u.email) authEmailToUserId[u.email.toLowerCase()] = u.id

  // Build userId → profile.phone map
  const profilePhoneMap: Record<string, string> = {}
  for (const p of profiles) if ((p as { phone?: string | null }).phone) profilePhoneMap[p.id] = ((p as { phone?: string }).phone ?? '').replace(/\D/g, '')

  // Build lookup: email → agentId, phone → agentId (from leads)
  const emailToAgent: Record<string, string> = {}
  const phoneToAgent: Record<string, string> = {}
  for (const l of allLeads) {
    if (!l.agent_id) continue
    if (l.customer_email) emailToAgent[l.customer_email.toLowerCase()] = l.agent_id
    if (l.customer_phone) phoneToAgent[String(l.customer_phone).replace(/\D/g, '')] = l.agent_id
  }

  const active = allOrders.filter(o => o.status !== 'cancelled')
  const recent = active.filter(o => o.created_at >= thirtyAgo)

  // ── Daily revenue (last 30 days) ────────────────────────────
  const dailyMap: Record<string, { revenue: number; orders: number }> = {}
  for (const o of recent) {
    const d = o.created_at.slice(0, 10)
    if (!dailyMap[d]) dailyMap[d] = { revenue: 0, orders: 0 }
    dailyMap[d].revenue += Number(o.total)
    dailyMap[d].orders  += 1
  }
  const dailyRevenue: DailyRevenue[] = Object.entries(dailyMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Revenue by category ─────────────────────────────────────
  const catMap: Record<string, { revenue: number; count: number }> = {}
  for (const o of active) {
    const items = Array.isArray(o.items) ? o.items : []
    for (const item of items) {
      const cat = (item as Record<string,string>).category ?? 'Other'
      if (!catMap[cat]) catMap[cat] = { revenue: 0, count: 0 }
      const price = Number((item as Record<string,unknown>).price ?? 0)
      const qty   = Number((item as Record<string,unknown>).qty ?? 1)
      catMap[cat].revenue += price * qty
      catMap[cat].count   += qty
    }
  }
  const categoryRevenue: CategoryRevenue[] = Object.entries(catMap)
    .map(([name, v]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Order status counts ─────────────────────────────────────
  const statusMap: Record<string, number> = {}
  for (const o of allOrders) {
    const s = o.status ?? 'pending'
    statusMap[s] = (statusMap[s] ?? 0) + 1
  }
  const orderStatusCounts: StatusCount[] = Object.entries(statusMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: STATUS_COLORS[name] ?? '#e5e7eb',
  }))

  // ── Lead stats per agent ────────────────────────────────────
  const leadTotalMap: Record<string, number> = {}
  const leadConvertedMap: Record<string, number> = {}
  const leadIdToAgent: Record<string, string> = {}
  for (const l of allLeads) {
    if (!l.agent_id) continue
    leadIdToAgent[l.id]           = l.agent_id
    leadTotalMap[l.agent_id]      = (leadTotalMap[l.agent_id] ?? 0) + 1
    if (l.status === 'converted')
      leadConvertedMap[l.agent_id] = (leadConvertedMap[l.agent_id] ?? 0) + 1
  }

  // ── Calls made + last active per agent (via call_logs joined through leads) ──
  const callsMadeMap: Record<string, number> = {}
  const lastActiveMap: Record<string, string> = {}
  for (const log of allLogs) {
    const agentId = leadIdToAgent[log.lead_id]
    if (!agentId) continue
    // Only count actual dialer calls, not manual status changes
    if ((log as { disposition?: string }).disposition !== 'status_updated') {
      callsMadeMap[agentId] = (callsMadeMap[agentId] ?? 0) + 1
    }
    if (!lastActiveMap[agentId] || log.created_at > lastActiveMap[agentId])
      lastActiveMap[agentId] = log.created_at
  }

  // ── Email/phone attributed orders per agent ─────────────────
  const attributedOrdersMap: Record<string, number> = {}
  const attributedRevenueMap: Record<string, number> = {}
  for (const o of active) {
    let agentId: string | undefined

    // Guest order: match by guest_email
    if (o.guest_email) agentId = emailToAgent[o.guest_email.toLowerCase()]

    // Logged-in order: match by email via auth users
    if (!agentId && o.user_id) {
      const userEmail = authUsers.find(u => u.id === o.user_id)?.email
      if (userEmail) agentId = emailToAgent[userEmail.toLowerCase()]
    }

    // Logged-in order: match by phone via profiles
    if (!agentId && o.user_id) {
      const phone = profilePhoneMap[o.user_id]
      if (phone) agentId = phoneToAgent[phone]
    }

    if (!agentId) continue
    attributedOrdersMap[agentId]  = (attributedOrdersMap[agentId] ?? 0) + 1
    attributedRevenueMap[agentId] = (attributedRevenueMap[agentId] ?? 0) + Number(o.total)
  }

  // ── Agent performance ───────────────────────────────────────
  const agentStats: AgentStat[] = agents.map(a => {
    const referred        = active.filter(o => o.referral_code === a.referral_code)
    const total_leads     = leadTotalMap[a.user_id] ?? 0
    const converted_leads = leadConvertedMap[a.user_id] ?? 0
    const attr_orders     = attributedOrdersMap[a.user_id] ?? 0
    const attr_revenue    = attributedRevenueMap[a.user_id] ?? 0
    // Combined: referral orders + email/phone attributed (dedupe by taking the higher count)
    const combined_orders  = Math.max(referred.length, attr_orders)
    const combined_revenue = Math.max(referred.reduce((s, o) => s + Number(o.total), 0), attr_revenue)
    return {
      user_id:              a.user_id,
      display_name:         a.display_name,
      referral_code:        a.referral_code ?? '',
      orders:               combined_orders,
      revenue:              combined_revenue,
      total_leads,
      converted_leads,
      lead_conversion_rate: total_leads > 0 ? Math.round(converted_leads / total_leads * 100) : 0,
      calls_made:           callsMadeMap[a.user_id] ?? 0,
      last_active:          lastActiveMap[a.user_id] ?? null,
      attributed_orders:    attr_orders,
      attributed_revenue:   attr_revenue,
    }
  }).sort((a, b) => b.revenue - a.revenue)

  // ── Customer tiers ──────────────────────────────────────────
  const spendMap: Record<string, number> = {}
  const orderCountMap: Record<string, number> = {}
  for (const o of active) {
    if (!o.user_id) continue
    spendMap[o.user_id]      = (spendMap[o.user_id] ?? 0) + Number(o.total)
    orderCountMap[o.user_id] = (orderCountMap[o.user_id] ?? 0) + 1
  }
  const customerTiers: CustomerTierRow[] = profiles.map(p => ({
    id:          p.id,
    full_name:   p.full_name ?? '(no name)',
    total_spent: spendMap[p.id] ?? 0,
    tier:        getTier(spendMap[p.id] ?? 0),
    order_count: orderCountMap[p.id] ?? 0,
  })).sort((a, b) => b.total_spent - a.total_spent)

  // ── Top products ────────────────────────────────────────────
  const prodMap: Record<string, { revenue: number; units: number }> = {}
  for (const o of active) {
    for (const item of (Array.isArray(o.items) ? o.items : [])) {
      const name  = (item as Record<string,string>).name ?? 'Unknown'
      const price = Number((item as Record<string,unknown>).price ?? 0)
      const qty   = Number((item as Record<string,unknown>).qty ?? 1)
      if (!prodMap[name]) prodMap[name] = { revenue: 0, units: 0 }
      prodMap[name].revenue += price * qty
      prodMap[name].units   += qty
    }
  }
  const topProducts = Object.entries(prodMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // ── Totals ──────────────────────────────────────────────────
  const totalRevenue     = active.reduce((s, o) => s + Number(o.total), 0)
  const totalOrders      = active.length
  const monthOrders      = active.filter(o => o.created_at >= monthStart)
  const revenueThisMonth = monthOrders.reduce((s, o) => s + Number(o.total), 0)
  const ordersThisMonth  = monthOrders.length
  const weekOrders       = active.filter(o => o.created_at >= weekStart)
  const revenueThisWeek  = weekOrders.reduce((s, o) => s + Number(o.total), 0)
  const ordersThisWeek   = weekOrders.length

  const result: AnalyticsData = {
    dailyRevenue, categoryRevenue, orderStatusCounts, agentStats,
    customerTiers, topProducts, totalRevenue, totalOrders,
    revenueThisMonth, ordersThisMonth, revenueThisWeek, ordersThisWeek,
  }

  return NextResponse.json(result)
}
