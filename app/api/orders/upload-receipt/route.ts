import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase-admin'

// Accepted receipt types → file extension
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
}
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

// A customer uploads proof of their bank wire. Guest-friendly: the order id is an
// unguessable UUID, which is the authorization. The file is stored in the private
// "receipts" bucket and its path is attached to the order for the admin to review.
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const orderId = String(form.get('order_id') ?? '').trim()
    const file = form.get('file')

    if (!orderId) return NextResponse.json({ error: 'Missing order.' }, { status: 400 })
    if (!(file instanceof File) || file.size === 0)
      return NextResponse.json({ error: 'Please choose a file.' }, { status: 400 })

    const ext = ALLOWED[file.type]
    if (!ext)
      return NextResponse.json({ error: 'Please upload an image (JPG/PNG/WEBP) or a PDF.' }, { status: 400 })
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: 'File is too large (max 5MB).' }, { status: 400 })

    const admin = getAdminSupabase()

    // The order must exist (UUID is unguessable → acts as the upload token)
    const { data: order } = await admin.from('orders').select('id').eq('id', orderId).maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    const path = `${orderId}/receipt-${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await admin.storage
      .from('receipts')
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (upErr) {
      console.error('[upload-receipt] storage', upErr)
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
    }

    const { error: updErr } = await admin.from('orders').update({ receipt_url: path }).eq('id', orderId)
    if (updErr) {
      console.error('[upload-receipt] update', updErr)
      return NextResponse.json({ error: 'Could not attach the receipt to your order.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[orders/upload-receipt]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
