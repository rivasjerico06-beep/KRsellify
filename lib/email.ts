import { Resend } from 'resend'
import { CartItem } from './types'
import { normalizeWireConfig, wireFieldList } from './wire-config'
import { getSiteConfig } from './site-config'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}
const FROM = process.env.EMAIL_FROM ?? 'PATRIOT’S ONLINE SHOP <orders@themagaoffers.com>'
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? 'rivasjerico06@gmail.com'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.themagaoffers.net').replace(/\/$/, '')

export async function sendOrderConfirmation({
  to,
  name,
  orderId,
  orderNumber,
  items,
  total,
  discountAmount,
  shippingAddress,
}: {
  to: string
  name: string
  orderId: string
  orderNumber?: number | null
  items: CartItem[]
  total: number
  discountAmount?: number
  shippingAddress?: Record<string, string> | null
}) {
  if (!process.env.RESEND_API_KEY) return

  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8eff0;font-size:14px;color:#0d1f2d">${i.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8eff0;font-size:14px;color:#4a6170;text-align:center">${i.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8eff0;font-size:14px;color:#093459;font-weight:700;text-align:right">$${(i.price * i.qty).toFixed(2)}</td>
    </tr>`
  ).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f8f8;font-family:'DM Sans',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(9,52,89,0.10)">

    <!-- Header -->
    <div style="background:#093459;padding:28px 36px;text-align:center">
      <p style="font-size:26px;font-weight:900;color:#ffffff;margin:0;letter-spacing:-0.02em">
        PATRIOT’S <span style="color:#f59e0b">ONLINE SHOP</span>
      </p>
      <p style="font-size:12px;color:rgba(255,255,255,0.6);margin:6px 0 0;letter-spacing:0.15em;text-transform:uppercase">Premium Collectibles & Patriot Merchandise</p>
    </div>

    <!-- Body -->
    <div style="padding:36px">
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:56px;height:56px;background:rgba(245,158,11,0.12);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px">
          <span style="font-size:26px">✓</span>
        </div>
        <h1 style="font-size:22px;font-weight:900;color:#093459;margin:0 0 8px">Order Confirmed!</h1>
        <p style="font-size:14px;color:#4a6170;margin:0">Thank you, <strong>${name}</strong>. We've received your order.</p>
      </div>

      <div style="background:#f4f8f8;border-radius:12px;padding:16px 20px;margin-bottom:24px">
        <p style="font-size:11px;font-weight:700;color:#8ba0aa;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 4px">Order ID</p>
        <p style="font-size:14px;font-weight:700;color:#093459;margin:0;font-family:monospace">#${orderNumber ?? orderId.slice(0, 8).toUpperCase()}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <thead>
          <tr>
            <th style="font-size:11px;font-weight:700;color:#8ba0aa;text-transform:uppercase;letter-spacing:0.1em;text-align:left;padding-bottom:10px">Item</th>
            <th style="font-size:11px;font-weight:700;color:#8ba0aa;text-transform:uppercase;letter-spacing:0.1em;text-align:center;padding-bottom:10px">Qty</th>
            <th style="font-size:11px;font-weight:700;color:#8ba0aa;text-transform:uppercase;letter-spacing:0.1em;text-align:right;padding-bottom:10px">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      ${discountAmount && discountAmount > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#4a6170">
        <span>Discount applied</span>
        <span style="color:#059669;font-weight:700">−$${discountAmount.toFixed(2)}</span>
      </div>` : ''}

      <div style="display:flex;justify-content:space-between;padding:14px 0;border-top:2px solid #e8eff0;margin-top:8px">
        <span style="font-size:15px;font-weight:700;color:#093459">Total</span>
        <span style="font-size:20px;font-weight:900;color:#093459">$${total.toFixed(2)}</span>
      </div>

      ${shippingAddress ? `
      <div style="background:#f4f8f8;border-radius:12px;padding:16px 20px;margin-top:20px">
        <p style="font-size:11px;font-weight:700;color:#8ba0aa;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px">Shipping To</p>
        <p style="font-size:14px;color:#0d1f2d;margin:0;line-height:1.7">
          ${[shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(' ')}<br>
          ${shippingAddress.address}${shippingAddress.apartment ? ', ' + shippingAddress.apartment : ''}<br>
          ${[shippingAddress.city, shippingAddress.region, shippingAddress.postalCode].filter(Boolean).join(', ')}<br>
          ${shippingAddress.country ?? ''}
          ${shippingAddress.phone ? `<br><span style="color:#4a6170">${shippingAddress.phone}</span>` : ''}
        </p>
      </div>` : ''}

      <div style="background:linear-gradient(135deg,#093459,#b45309);border-radius:14px;padding:20px 24px;margin-top:24px;text-align:center">
        <p style="font-size:13px;color:rgba(255,255,255,0.8);margin:0 0 6px">Your order is being processed</p>
        <p style="font-size:12px;color:rgba(255,255,255,0.55);margin:0">Estimated delivery: <strong style="color:rgba(255,255,255,0.85)">10–15 days</strong></p>
      </div>

      <p style="font-size:13px;color:#8ba0aa;margin:24px 0 0;text-align:center;line-height:1.6">
        Questions? Reply to this email or contact us at<br>
        <a href="mailto:themagaoffer@gmail.com" style="color:#f59e0b;font-weight:600">themagaoffer@gmail.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f4f8f8;padding:18px 36px;text-align:center;border-top:1px solid #e8eff0">
      <p style="font-size:11px;color:#8ba0aa;margin:0">© 2026 PATRIOT’S ONLINE SHOP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  await getResend().emails.send({
    from: FROM,
    to,
    replyTo: 'themagaoffer@gmail.com',
    subject: `✓ Order Confirmed — PATRIOT’S ONLINE SHOP (#${orderNumber ?? orderId.slice(0, 8).toUpperCase()})`,
    html,
  })

  // Notify store owner of every new order
  await getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `🛒 New Order — $${total.toFixed(2)} from ${name}`,
    html: `<p style="font-family:Arial,sans-serif;font-size:15px;color:#093459">
      <strong>New order received!</strong><br><br>
      Customer: <strong>${name}</strong> (${to})<br>
      Order #: <code>${orderNumber ?? orderId.slice(0, 8).toUpperCase()}</code><br>
      Total: <strong>$${total.toFixed(2)}</strong><br>
      Items: ${items.map(i => `${i.name} ×${i.qty}`).join(', ')}
      ${shippingAddress ? `<br><br>Ship to: ${[shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(' ')}, ${shippingAddress.address}${shippingAddress.apartment ? ' ' + shippingAddress.apartment : ''}, ${[shippingAddress.city, shippingAddress.region, shippingAddress.postalCode, shippingAddress.country].filter(Boolean).join(', ')} — ${shippingAddress.phone ?? ''}` : ''}
    </p>`,
  })
}

export async function sendWireInstructions({
  to,
  name,
  orderId,
  orderNumber,
  total,
  payLinkUrl,
}: {
  to: string
  name: string
  orderId: string
  orderNumber?: number | null
  total: number
  payLinkUrl?: string
}) {
  if (!process.env.RESEND_API_KEY) return

  const ref = orderNumber ?? orderId.slice(0, 8).toUpperCase()
  const b = normalizeWireConfig((await getSiteConfig()).wire_config)
  // When the order is paid through a hosted link, the bank rows would only
  // confuse — the customer pays on the link, not by manual transfer.
  const viaLink = !!payLinkUrl
  const rows: [string, string][] = (viaLink ? ([
    ['Amount', `$${total.toFixed(2)}`],
    ['Payment Reference', `#${ref}`],
  ] as [string, string][]) : ([
    ...wireFieldList(b),
    ['Amount', `$${total.toFixed(2)}`],
    ['Payment Reference', `#${ref}`],
  ] as [string, string][])).filter(([, v]) => v && v.trim())
  const detailRows = rows.map(([k, v]) =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8eff0;font-size:13px;color:#4a6170">${k}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8eff0;font-size:14px;color:#093459;font-weight:700;text-align:right;font-family:monospace">${v}</td>
    </tr>`
  ).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f8f8;font-family:'DM Sans',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(9,52,89,0.10)">
    <div style="background:#093459;padding:28px 36px;text-align:center">
      <p style="font-size:26px;font-weight:900;color:#ffffff;margin:0;letter-spacing:-0.02em">
        PATRIOT’S <span style="color:#f59e0b">ONLINE SHOP</span>
      </p>
      <p style="font-size:12px;color:rgba(255,255,255,0.6);margin:6px 0 0;letter-spacing:0.15em;text-transform:uppercase">${viaLink ? 'Payment Instructions' : 'Bank Transfer Instructions'}</p>
    </div>

    <div style="padding:36px">
      <h1 style="font-size:22px;font-weight:900;color:#093459;margin:0 0 8px">Complete your payment</h1>
      <p style="font-size:14px;color:#4a6170;margin:0 0 24px;line-height:1.7">
        Thank you, <strong>${name}</strong>. Your order <strong>#${ref}</strong> is reserved. ${viaLink
          ? `To finish, tap the button below and pay <strong>$${total.toFixed(2)}</strong> securely.`
          : `To finish, please wire <strong>$${total.toFixed(2)}</strong> to the account below and include your reference number in the memo.`}
      </p>

      ${viaLink ? `
      <div style="text-align:center;margin-bottom:24px">
        <a href="${payLinkUrl}"
          style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:17px;font-weight:800;padding:16px 44px;border-radius:10px">
          Pay $${total.toFixed(2)}
        </a>
        <p style="font-size:12px;color:#8ba0aa;margin:10px 0 0;line-height:1.6">
          Your order isn&rsquo;t placed until your payment is confirmed.
        </p>
      </div>` : ''}

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tbody>${detailRows}</tbody>
      </table>

      ${!viaLink && b.memoNote.trim() ? `
      <div style="background:#fff8ec;border:1px solid #fcd9a3;border-radius:12px;padding:16px 20px;margin-bottom:20px">
        <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6">
          <strong>Important:</strong> ${b.memoNote}
        </p>
      </div>` : ''}

      <div style="text-align:center;margin-bottom:22px">
        <a href="${SITE_URL}/upload-receipt?order=${orderId}"
          style="display:inline-block;background:#093459;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 30px;border-radius:10px">
          📎 Upload your payment receipt
        </a>
        <p style="font-size:12px;color:#8ba0aa;margin:10px 0 0;line-height:1.6">
          ${viaLink
            ? 'Optional, but it helps us confirm your order faster — attach the receipt your payment provider gave you.'
            : 'Already uploaded your receipt at checkout? You&rsquo;re all set — we&rsquo;ll email you once your order is placed.<br>Otherwise (or to replace it), you can use this link any time.'}
        </p>
      </div>

      <p style="font-size:13px;color:#8ba0aa;margin:0;text-align:center;line-height:1.6">
        Your order ships once we confirm your payment (usually 1–3 business days).<br>
        Questions? <a href="mailto:themagaoffer@gmail.com" style="color:#f59e0b;font-weight:600">themagaoffer@gmail.com</a>
      </p>
    </div>

    <div style="background:#f4f8f8;padding:18px 36px;text-align:center;border-top:1px solid #e8eff0">
      <p style="font-size:11px;color:#8ba0aa;margin:0">© 2026 PATRIOT’S ONLINE SHOP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  await getResend().emails.send({
    from: FROM,
    to,
    replyTo: 'themagaoffer@gmail.com',
    subject: viaLink
      ? `Complete your payment — PATRIOT’S ONLINE SHOP (Ref: #${ref})`
      : `Bank transfer instructions — PATRIOT’S ONLINE SHOP (Ref: #${ref})`,
    html,
  })

  // Notify store owner that a wire order is awaiting payment
  await getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `⏳ ${viaLink ? 'Pay-link' : 'Wire'} order pending — $${total.toFixed(2)} (Ref #${ref})`,
    html: `<p style="font-family:Arial,sans-serif;font-size:15px;color:#093459">
      <strong>New ${viaLink ? 'pay-link' : 'bank-transfer'} order awaiting payment.</strong><br><br>
      Customer: <strong>${name}</strong> (${to})<br>
      Reference: <code>#${ref}</code><br>
      Amount: <strong>$${total.toFixed(2)}</strong><br><br>
      Mark it <strong>Paid</strong> in the admin dashboard once the funds arrive.
    </p>`,
  })
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; body: string }> = {
  confirmed: {
    label: 'Order Confirmed',
    color: '#92400e', bg: '#fef3c7',
    body: `We are pleased to inform you that your order has been confirmed and is now being prepared. Our team will ensure that your items are handled with the utmost care before dispatch.`,
  },
  packed: {
    label: 'Order Packed',
    color: '#1e40af', bg: '#dbeafe',
    body: `Your order has been carefully packed and is awaiting collection by our shipping carrier. You will receive a further update once your order is on its way.`,
  },
  shipped: {
    label: 'Order Shipped',
    color: '#065f46', bg: '#d1fae5',
    body: `Your order has been dispatched and is currently on its way to you. Please allow 10 to 15 days for delivery. If you have any concerns regarding delivery, do not hesitate to contact our support team.`,
  },
  delivered: {
    label: 'Order Delivered',
    color: '#4c1d95', bg: '#ede9fe',
    body: `We are delighted to confirm that your order has been delivered. We sincerely hope you are satisfied with your purchase. Should you have any questions or require assistance, our team is always available to help.`,
  },
  cancelled: {
    label: 'Order Cancelled',
    color: '#7f1d1d', bg: '#fee2e2',
    body: `We regret to inform you that your order has been cancelled. If you believe this was made in error or require further clarification, please do not hesitate to reach out to our support team and we will be happy to assist you.`,
  },
}

export async function sendOrderStatusUpdate({
  to,
  name,
  orderId,
  orderNumber,
  status,
}: {
  to: string
  name: string
  orderId: string
  orderNumber?: number | null
  status: string
}) {
  if (!process.env.RESEND_API_KEY) return

  const meta = STATUS_META[status]
  if (!meta) return

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f8f8;font-family:'DM Sans',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(9,52,89,0.10)">

    <div style="background:#093459;padding:28px 36px;text-align:center">
      <p style="font-size:26px;font-weight:900;color:#ffffff;margin:0;letter-spacing:-0.02em">
        PATRIOT’S <span style="color:#f59e0b">ONLINE SHOP</span>
      </p>
      <p style="font-size:12px;color:rgba(255,255,255,0.6);margin:6px 0 0;letter-spacing:0.15em;text-transform:uppercase">Order Status Update</p>
    </div>

    <div style="padding:36px 40px">

      <p style="font-size:15px;color:#0d1f2d;margin:0 0 20px;line-height:1.6">Dear <strong>${name}</strong>,</p>

      <p style="font-size:15px;color:#0d1f2d;margin:0 0 24px;line-height:1.7">${meta.body}</p>

      <div style="border:1px solid #e8eff0;border-radius:12px;overflow:hidden;margin-bottom:28px">
        <div style="background:#f4f8f8;padding:12px 20px;border-bottom:1px solid #e8eff0">
          <p style="font-size:11px;font-weight:700;color:#8ba0aa;text-transform:uppercase;letter-spacing:0.12em;margin:0">Order Reference</p>
        </div>
        <div style="padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <p style="font-size:14px;font-weight:700;color:#093459;margin:0;font-family:monospace">#${orderNumber ?? orderId.slice(0, 8).toUpperCase()}</p>
          <span style="font-size:12px;font-weight:800;padding:5px 14px;border-radius:20px;background:${meta.bg};color:${meta.color};text-transform:uppercase;letter-spacing:0.07em">${meta.label}</span>
        </div>
      </div>

      <p style="font-size:14px;color:#4a6170;margin:0 0 6px;line-height:1.7">
        Should you have any questions regarding your order, please do not hesitate to contact us.
      </p>
      <p style="font-size:14px;color:#4a6170;margin:0 0 28px;line-height:1.7">
        Email: <a href="mailto:themagaoffer@gmail.com" style="color:#093459;font-weight:600;text-decoration:none">themagaoffer@gmail.com</a>
      </p>

      <p style="font-size:14px;color:#0d1f2d;margin:0;line-height:1.7">
        Warm regards,<br>
        <strong>PATRIOT’S ONLINE SHOP Team</strong>
      </p>

    </div>

    <div style="background:#f4f8f8;padding:18px 40px;border-top:1px solid #e8eff0">
      <p style="font-size:11px;color:#8ba0aa;margin:0;line-height:1.6">
        This is an automated notification from PATRIOT’S ONLINE SHOP. Please do not reply directly to this email.<br>
        &copy; 2026 PATRIOT’S ONLINE SHOP. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>`

  await getResend().emails.send({
    from: FROM,
    to,
    replyTo: 'themagaoffer@gmail.com',
    subject: `${meta.label} — PATRIOT’S ONLINE SHOP (Ref: #${orderNumber ?? orderId.slice(0, 8).toUpperCase()})`,
    html,
  })
}
