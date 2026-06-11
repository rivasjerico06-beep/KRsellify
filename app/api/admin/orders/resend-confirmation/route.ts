import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'
import { requireAdmin, isNextResponse } from '@/lib/require-admin'
import { sendOrderConfirmation } from '@/lib/email'
import type { CartItem } from '@/lib/types'

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (isNextResponse(auth)) return auth

  const { order_id } = await request.json()
  if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const admin = getAdminSupabase()
  const { data: order, error } = await admin
    .from('orders')
    .select('*')
    .eq('id', order_id)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  let email: string | undefined
  let name: string | undefined

  if (order.user_id) {
    const { data: userRecord } = await admin.auth.admin.getUserById(order.user_id)
    email = userRecord?.user?.email
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', order.user_id).single()
    name = profile?.full_name ?? email?.split('@')[0]
  } else if (order.guest_email) {
    email = order.guest_email
    name = (email as string).split('@')[0]
  }

  if (!email) return NextResponse.json({ error: 'No email on order' }, { status: 400 })

  await sendOrderConfirmation({
    to: email,
    name: name ?? email.split('@')[0],
    orderId: order.id,
    orderNumber: order.order_number,
    items: order.items as CartItem[],
    total: Number(order.total),
    discountAmount: order.discount_amount ? Number(order.discount_amount) : undefined,
  })

  return NextResponse.json({ ok: true })
}
