import { Resend } from 'resend'
import { CartItem } from './types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'KRSELLIFY <orders@krsellify.com>'

export async function sendOrderConfirmation({
  to,
  name,
  orderId,
  items,
  total,
  discountAmount,
}: {
  to: string
  name: string
  orderId: string
  items: CartItem[]
  total: number
  discountAmount?: number
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
        KR<span style="color:#7ab5b0">SELLIFY</span>
      </p>
      <p style="font-size:12px;color:rgba(255,255,255,0.6);margin:6px 0 0;letter-spacing:0.15em;text-transform:uppercase">Premium Collectibles</p>
    </div>

    <!-- Body -->
    <div style="padding:36px">
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:56px;height:56px;background:rgba(88,148,143,0.12);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px">
          <span style="font-size:26px">✓</span>
        </div>
        <h1 style="font-size:22px;font-weight:900;color:#093459;margin:0 0 8px">Order Confirmed!</h1>
        <p style="font-size:14px;color:#4a6170;margin:0">Thank you, <strong>${name}</strong>. We've received your order.</p>
      </div>

      <div style="background:#f4f8f8;border-radius:12px;padding:16px 20px;margin-bottom:24px">
        <p style="font-size:11px;font-weight:700;color:#8ba0aa;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 4px">Order ID</p>
        <p style="font-size:14px;font-weight:700;color:#093459;margin:0;font-family:monospace">${orderId}</p>
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

      <div style="background:linear-gradient(135deg,#093459,#58948f);border-radius:14px;padding:20px 24px;margin-top:24px;text-align:center">
        <p style="font-size:13px;color:rgba(255,255,255,0.8);margin:0 0 6px">Your order is being processed</p>
        <p style="font-size:12px;color:rgba(255,255,255,0.55);margin:0">Estimated delivery: <strong style="color:rgba(255,255,255,0.85)">3–7 business days</strong></p>
      </div>

      <p style="font-size:13px;color:#8ba0aa;margin:24px 0 0;text-align:center;line-height:1.6">
        Questions? Reply to this email or contact us at<br>
        <a href="mailto:support@krsellify.com" style="color:#58948f;font-weight:600">support@krsellify.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f4f8f8;padding:18px 36px;text-align:center;border-top:1px solid #e8eff0">
      <p style="font-size:11px;color:#8ba0aa;margin:0">© 2025 KRSELLIFY. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  await resend.emails.send({
    from: FROM,
    to,
    reply_to: 'rivasjerico06@gmail.com',
    subject: `✓ Order Confirmed — KRSELLIFY (#${orderId.slice(0, 8).toUpperCase()})`,
    html,
  })

  // Notify store owner of every new order
  await resend.emails.send({
    from: FROM,
    to: 'rivasjerico06@gmail.com',
    subject: `🛒 New Order — $${total.toFixed(2)} from ${name}`,
    html: `<p style="font-family:Arial,sans-serif;font-size:15px;color:#093459">
      <strong>New order received!</strong><br><br>
      Customer: <strong>${name}</strong> (${to})<br>
      Order ID: <code>${orderId}</code><br>
      Total: <strong>$${total.toFixed(2)}</strong><br>
      Items: ${items.map(i => `${i.name} ×${i.qty}`).join(', ')}
    </p>`,
  })
}
