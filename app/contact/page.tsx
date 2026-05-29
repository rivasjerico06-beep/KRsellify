'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import InfoPageLayout from '@/components/InfoPageLayout'

export default function ContactPage() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !message) { setError('Please fill in all required fields.'); return }
    setSending(true); setError('')

    // Creates a lead in the admin system with the contact message as notes
    const res = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name,
        customer_phone: 'N/A — email contact',
        product_interest: subject || null,
        notes: `Email: ${email}\n\n${message}`,
      }),
    })

    if (res.ok) { setSent(true) }
    else { setError('Something went wrong. Please email us directly at support@krsellify.com') }
    setSending(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: '12px 16px',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <InfoPageLayout title="Contact Us" subtitle="We're here to help. Reach out and we'll respond within 24 hours." breadcrumb="Contact">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
        {/* Contact info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: 'fa-envelope',  title: 'Email',    value: 'support@krsellify.com' },
            { icon: 'fa-clock',     title: 'Response time', value: 'Within 24 hours' },
            { icon: 'fa-headset',   title: 'Agent support', value: 'Click "Need an Agent?" on any page' },
          ].map(c => (
            <div key={c.icon} style={{ background: 'white', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 10px rgba(9,52,89,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(88,148,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fa-solid ${c.icon}`} style={{ color: 'var(--teal)', fontSize: 18 }} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: 3 }}>{c.title}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ background: 'white', borderRadius: 16, padding: '32px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <i className="fa-solid fa-check" style={{ color: '#059669', fontSize: 24 }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'var(--navy)', marginBottom: 8 }}>Message Sent!</h3>
                <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>We'll get back to you within 24 hours.</p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>Send a Message</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-mid)', display: 'block', marginBottom: 5 }}>Name *</label>
                    <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--gray)')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-mid)', display: 'block', marginBottom: 5 }}>Email *</label>
                    <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--gray)')} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-mid)', display: 'block', marginBottom: 5 }}>Subject</label>
                  <input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Order inquiry, product question…"
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--gray)')} />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-mid)', display: 'block', marginBottom: 5 }}>Message *</label>
                  <textarea style={{ ...inputStyle, height: 120, resize: 'vertical', lineHeight: 1.6 }} value={message} onChange={e => setMessage(e.target.value)} placeholder="How can we help?" required
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--gray)')} />
                </div>

                {error && <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}><i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />{error}</p>}

                <motion.button type="submit" disabled={sending}
                  whileHover={{ background: 'var(--teal)' }} whileTap={{ scale: 0.98 }}
                  style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '14px', borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s', opacity: sending ? 0.7 : 1 }}>
                  {sending ? <><i className="fa-solid fa-spinner fa-spin" /> Sending…</> : <><i className="fa-solid fa-paper-plane" /> Send Message</>}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </InfoPageLayout>
  )
}
