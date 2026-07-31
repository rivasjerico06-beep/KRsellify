import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'Maga Offers <orders@themagaoffers.com>'

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: Request) {
  const { name, email, subject, message } = await request.json()

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  if (name.trim().length > 200 || message.trim().length > 5000 || (subject?.trim()?.length ?? 0) > 300) {
    return NextResponse.json({ error: 'Input too long' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: FROM,
    // Matches the address shown on the Contact page — otherwise the form
    // advertises one inbox and quietly delivers to another.
    to: 'themagaoffer@gmail.com',
    replyTo: email.trim(),
    subject: subject?.trim() ? `[Contact] ${subject.trim()}` : `[Contact] Message from ${name.trim()}`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f4f8f8;padding:32px;border-radius:12px">
  <div style="background:#093459;padding:20px 28px;border-radius:10px 10px 0 0">
    <p style="color:#fff;font-size:18px;font-weight:700;margin:0">New Contact Message</p>
  </div>
  <div style="background:#fff;padding:28px;border-radius:0 0 10px 10px;border:1px solid #e8eff0">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr>
        <td style="font-size:12px;font-weight:700;color:#8ba0aa;text-transform:uppercase;padding-bottom:4px;width:90px">Name</td>
        <td style="font-size:14px;color:#093459;font-weight:600">${esc(name.trim())}</td>
      </tr>
      <tr><td colspan="2" style="padding:6px 0"></td></tr>
      <tr>
        <td style="font-size:12px;font-weight:700;color:#8ba0aa;text-transform:uppercase;padding-bottom:4px">Email</td>
        <td style="font-size:14px;color:#093459"><a href="mailto:${esc(email.trim())}" style="color:#0070ba">${esc(email.trim())}</a></td>
      </tr>
      ${subject?.trim() ? `
      <tr><td colspan="2" style="padding:6px 0"></td></tr>
      <tr>
        <td style="font-size:12px;font-weight:700;color:#8ba0aa;text-transform:uppercase;padding-bottom:4px">Subject</td>
        <td style="font-size:14px;color:#093459">${esc(subject.trim())}</td>
      </tr>` : ''}
    </table>
    <div style="border-top:1px solid #e8eff0;padding-top:18px">
      <p style="font-size:12px;font-weight:700;color:#8ba0aa;text-transform:uppercase;margin-bottom:10px">Message</p>
      <p style="font-size:14px;color:#0d1f2d;line-height:1.7;white-space:pre-wrap">${esc(message.trim())}</p>
    </div>
    <div style="margin-top:24px;padding:14px;background:#f4f8f8;border-radius:8px;font-size:12px;color:#8ba0aa">
      Reply directly to this email to respond to ${esc(name.trim())}.
    </div>
  </div>
</div>`,
  })

  return NextResponse.json({ ok: true })
}
