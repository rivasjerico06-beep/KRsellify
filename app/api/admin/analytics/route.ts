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

  const [ordersRes, agentsRes, profilesRes, leadsRes] = await Promise.all([
    admin.from('orders').select('id,total,discount_amount,status,items,referral_code,user_id,created_at').neq('status', 'pending_payment').order('created_at', { ascending: false }),
    admin.from('agent_profiles').select('user_id,display_name,referral_code,status').eq('status', 'approved'),
    admin.from('profiles').select('id,full_name,role').eq('role', 'customer'),
    admin.from('leads').select('agent_id,status'),
  ])

  const allOrders = ordersRes.data ?? []
  const agents    = agentsRes.data ?? []
  const profiles  = profilesRes.data ?? []

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
  for (const l of leadsRes.data ?? []) {
    if (!l.agent_id) continue
    leadTotalMap[l.agent_id]     = (leadTotalMap[l.agent_id] ?? 0) + 1
    if (l.status === 'converted')
      leadConvertedMap[l.agent_id] = (leadConvertedMap[l.agent_id] ?? 0) + 1
  }

  // ── Agent performance ───────────────────────────────────────
  const agentStats: AgentStat[] = agents.map(a => {
    const referred      = active.filter(o => o.referral_code === a.referral_code)
    const total_leads   = leadTotalMap[a.user_id] ?? 0
    const converted_leads = leadConvertedMap[a.user_id] ?? 0
    return {
      user_id:              a.user_id,
      display_name:         a.display_name,
      referral_code:        a.referral_code ?? '',
      orders:               referred.length,
      revenue:              referred.reduce((s, o) => s + Number(o.total), 0),
      total_leads,
      converted_leads,
      lead_conversion_rate: total_leads > 0 ? Math.round(converted_leads / total_leads * 100) : 0,
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

  const result: AnalyticsData = {
    dailyRevenue, categoryRevenue, orderStatusCounts, agentStats,
    customerTiers, topProducts, totalRevenue, totalOrders,
    revenueThisMonth, ordersThisMonth,
  }

  return NextResponse.json(result)
}
