'use client'

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { AnalyticsData } from '@/lib/types'

const COLORS = ['#093459', '#58948F', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0369a1']

interface Props {
  section: 'overview' | 'sales' | 'agents'
  data: AnalyticsData
}

export default function AdminCharts({ section, data }: Props) {

  if (section === 'overview') {
    const last7 = data.dailyRevenue.slice(-7)
    return (
      <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Revenue — Last 7 Days</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={last7} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} width={48} />
            <Tooltip formatter={(v) => [`$${Number(v).toFixed(0)}`, 'Revenue']} labelFormatter={(l) => `Date: ${l}`} />
            <Line type="monotone" dataKey="revenue" stroke="#58948F" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (section === 'sales') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Revenue trend — 30 days */}
        <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Revenue Trend — Last 30 Days</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.dailyRevenue} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} width={56} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} labelFormatter={(l) => `Date: ${l}`} />
              <Line type="monotone" dataKey="revenue" stroke="#58948F" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category revenue */}
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Revenue by Category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.categoryRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} width={52} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#093459" radius={[4, 4, 0, 0]}>
                {data.categoryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order status pie */}
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Orders by Status</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.orderStatusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {data.orderStatusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [Number(v), 'Orders']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    )
  }

  // agents section
  if (section === 'agents') {
    return (
      <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Agent Revenue Comparison</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.agentStats} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="display_name" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} width={52} />
            <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#58948F" radius={[4, 4, 0, 0]} name="Revenue">
              {data.agentStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return null
}
