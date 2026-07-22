import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import { sendOrderStatusUpdate, sendOrderConfirmation } from '@/lib/email'

const VALID_STATUSES = ['paid', 'pending', 'pending_payment', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  // Show all real orders plus wire transfers that are still awaiting payment
  // (abandoned gateway redirects stay hidden). Fall back gracefully if the
  // payment_method column has not been added yet.
  let { data: orders, error } = await admin
    .from('orders')
    .select('*')
    .or('status.neq.pending_payment,payment_method.eq.wire')
    .order('created_at', { ascending: false })
  if (error?.code === '42703') {
    ;({ data: orders, error } = await admin
      .from('orders')
      .select('*')
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false }))
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = [...new Set((orders ?? []).map(o => o.user_id).filter(Boolean) as string[])]
  if (userIds.length === 0) return NextResponse.json(orders ?? [])

  const [profilesRes, authRes] = await Promise.all([
    admin.from('profiles').select('id,full_name,phone,city,address').in('id', userIds),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const profileMap: Record<string, { full_name?: string | null; phone?: string | null; city?: string | null; address?: string | null }> = {}
  for (const p of profilesRes.data ?? []) profileMap[p.id] = p

  const emailMap: Record<string, string> = {}
  for (const u of authRes.data?.users ?? []) emailMap[u.id] = u.email ?? ''

  const enriched = (orders ?? []).map(o => ({
    ...o,
    customer_name:    o.user_id ? (profileMap[o.user_id]?.full_name ?? null)  : null,
    customer_email:   o.user_id ? (emailMap[o.user_id] ?? null)               : (o.guest_email ?? null),
    customer_phone:   o.user_id ? (profileMap[o.user_id]?.phone ?? null)      : null,
    customer_city:    o.user_id ? (profileMap[o.user_id]?.city ?? null)       : null,
    customer_address: o.user_id ? (profileMap[o.user_id]?.address ?? null)    : null,
  }))

  return NextResponse.json(enriched)
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = getAdminSupabase()
  const { error } = await admin.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const admin = getAdminSupabase()
  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const { data, error } = await admin.from('orders').update({ status }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email the customer about their updated status (non-blocking)
  try {
    let customerEmail: string | undefined
    let customerName: string | undefined

    if (data.user_id) {
      const { data: userRecord } = await admin.auth.admin.getUserById(data.user_id)
      customerEmail = userRecord?.user?.email
      const { data: profile } = await admin.from('profiles').select('full_name').eq('id', data.user_id).single()
      customerName = profile?.full_name ?? customerEmail?.split('@')[0]
    } else if (data.guest_email) {
      customerEmail = data.guest_email
      customerName = data.guest_email.split('@')[0]
    }

    if (customerEmail) {
      // A wire order becoming 'paid' means the transfer was confirmed — send the
      // full order confirmation. Other transitions send a status-update email.
      if (status === 'paid' && data.payment_method === 'wire') {
        sendOrderConfirmation({
          to: customerEmail,
          name: customerName ?? customerEmail.split('@')[0],
          orderId: data.id,
          orderNumber: data.order_number,
          items: Array.isArray(data.items) ? data.items : [],
          total: Number(data.total),
          discountAmount: data.discount_amount ? Number(data.discount_amount) : undefined,
          shippingAddress: data.shipping_address ?? undefined,
        }).catch(() => {})
      } else {
        sendOrderStatusUpdate({
          to: customerEmail,
          name: customerName ?? customerEmail.split('@')[0],
          orderId: data.id,
          orderNumber: data.order_number,
          status,
        }).catch(() => {})
      }
    }
  } catch {}

  return NextResponse.json(data)
}
