'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import SupportChat from './SupportChat'

const PRODUCTS = [
  'Medallions & Gold Bars',
  'Crypto Collectibles',
  'Bitcoin Diamond 2025',
  'D.O.G.E Coin Collectible',
  'Trump Collectibles',
  'Apparel',
  'Accessories',
  'Other / Not sure yet',
]

export default function AgentAssistButton() {
  const { user, profile, isAdmin, isApprovedAgent } = useAuth()
  const [open, setOpen] = useState(false)
  // 'choose' is the hub: chat with support now, or leave details for a callback
  const [step, setStep] = useState<'choose' | 'chat' | 'form' | 'success'>('choose')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill from profile
  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
    if (profile?.phone) setPhone(profile.phone)
  }, [profile])

  // Reset form when closing
  function handleClose() {
    setOpen(false)
    setTimeout(() => {
      setStep('choose')
      setError('')
      if (!profile?.full_name) setName('')
      if (!profile?.phone) setPhone('')
      setInterest('')
      setNotes('')
    }, 300)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) { setError('Name and phone are required.'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        product_interest: interest || null,
        notes: notes.trim() || null,
      }),
    })

    if (res.ok) {
      setStep('success')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  // Don't show for admins or agents — they don't need to request assistance
  if (isAdmin || isApprovedAgent) return null

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={() => setOpen(true)}
            whileHover={{ scale: 1.08, boxShadow: '0 12px 40px rgba(9,52,89,0.35)' }}
            whileTap={{ scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 1500,
              background: 'linear-gradient(135deg, var(--navy), #0e4a80)',
              color: 'white', border: 'none', borderRadius: 50,
              padding: '14px 22px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 6px 28px rgba(9,52,89,0.28)',
            }}
          >
            <motion.span
              animate={{ rotate: [0, -15, 15, -10, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 4 }}
              style={{ fontSize: 18, display: 'flex' }}>
              <i className="fa-solid fa-headset" />
            </motion.span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>Need an Agent?</span>
            {/* pulse ring */}
            <motion.span
              animate={{ scale: [1, 1.7, 1.7], opacity: [0.6, 0, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5 }}
              style={{ position: 'absolute', inset: 0, borderRadius: 50, border: '2px solid rgba(88,148,143,0.7)', pointerEvents: 'none' }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(6,31,55,0.55)', zIndex: 1800, backdropFilter: 'blur(3px)' }}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1900,
              background: 'var(--white)', borderRadius: '24px 24px 0 0',
              boxShadow: '0 -8px 48px rgba(9,52,89,0.18)',
              maxHeight: '92vh', overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--gray)' }} />
            </div>

            <div style={{ maxWidth: 520, margin: '0 auto', padding: '8px 28px 40px' }}>
              {step === 'choose' ? (
                /* Hub — pick live chat or a callback request */
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--navy), #0e4a80)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fa-solid fa-headset" style={{ color: 'white', fontSize: 16 }} />
                        </div>
                        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'var(--heading)', margin: 0 }}>
                          How can we help?
                        </h2>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 }}>
                        Chat with us now, or leave your details and an agent will call you.
                      </p>
                    </div>
                    <button onClick={handleClose}
                      style={{ background: 'var(--gray)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-mid)', flexShrink: 0, marginLeft: 12 }}>
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { id: 'chat' as const, icon: 'fa-comments', title: 'Chat with support', sub: 'Message us now — replies land right here', accent: 'var(--teal)' },
                      { id: 'form' as const, icon: 'fa-phone',    title: 'Request a callback', sub: 'Leave your number and an agent will reach out', accent: 'var(--navy)' },
                    ].map(opt => (
                      <motion.button
                        key={opt.id}
                        onClick={() => setStep(opt.id)}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                          background: 'var(--white)', border: '2px solid var(--gray)',
                          borderRadius: 16, padding: '18px 20px', cursor: 'pointer',
                          fontFamily: 'inherit', width: '100%',
                        }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: opt.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`fa-solid ${opt.icon}`} style={{ color: 'white', fontSize: 17 }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--heading)', margin: '0 0 3px' }}>{opt.title}</p>
                          <p style={{ fontSize: 12.5, color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>{opt.sub}</p>
                        </div>
                        <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-light)', fontSize: 13, flexShrink: 0 }} />
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : step === 'chat' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => setStep('choose')}
                        style={{ background: 'var(--gray)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-mid)' }}
                        aria-label="Back">
                        <i className="fa-solid fa-chevron-left" />
                      </button>
                      <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 21, fontWeight: 900, color: 'var(--heading)', margin: 0 }}>
                        Chat with support
                      </h2>
                    </div>
                    <button onClick={handleClose}
                      style={{ background: 'var(--gray)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-mid)', flexShrink: 0, marginLeft: 12 }}>
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                  <SupportChat />
                </>
              ) : step === 'form' ? (
                <>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <button onClick={() => setStep('choose')} type="button"
                          style={{ background: 'var(--gray)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-mid)', flexShrink: 0 }}
                          aria-label="Back">
                          <i className="fa-solid fa-chevron-left" />
                        </button>
                        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 900, color: 'var(--heading)', margin: 0 }}>
                          Talk to an Agent
                        </h2>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 }}>
                        Leave your details and one of our agents will reach out to assist you personally.
                      </p>
                    </div>
                    <button onClick={handleClose}
                      style={{ background: 'var(--gray)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-mid)', flexShrink: 0, marginLeft: 12 }}>
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>

                  {/* Trust strip */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                    {[
                      { icon: 'fa-clock', text: 'Reply within 24h' },
                      { icon: 'fa-lock', text: 'Private & secure' },
                      { icon: 'fa-star', text: 'Expert guidance' },
                    ].map(t => (
                      <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>
                        <i className={`fa-solid ${t.icon}`} style={{ color: 'var(--teal)', fontSize: 11 }} />
                        {t.text}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Name */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                        Full Name *
                      </label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required
                        style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--gray)')}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                        Phone Number *
                      </label>
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" required type="tel"
                        style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--gray)')}
                      />
                    </div>

                    {/* Product interest */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                        I'm interested in…
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {PRODUCTS.map(p => (
                          <motion.button key={p} type="button" onClick={() => setInterest(p === interest ? '' : p)}
                            whileTap={{ scale: 0.97 }}
                            style={{
                              border: interest === p ? '2px solid var(--teal)' : '2px solid var(--gray)',
                              background: interest === p ? 'rgba(88,148,143,0.08)' : 'var(--white)',
                              color: interest === p ? 'var(--teal)' : 'var(--text-mid)',
                              borderRadius: 10, padding: '10px 12px', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                            {interest === p && <i className="fa-solid fa-circle-check" style={{ fontSize: 11 }} />}
                            {p}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                        Anything else? <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                      </label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Questions, budget, special requests…"
                        rows={3}
                        style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--gray)')}
                      />
                    </div>

                    {/* Not logged in note */}
                    {!user && (
                      <p style={{ fontSize: 12, color: 'var(--text-light)', background: 'var(--off-white)', borderRadius: 10, padding: '10px 14px', margin: 0 }}>
                        <i className="fa-solid fa-circle-info" style={{ color: 'var(--teal)', marginRight: 6 }} />
                        You don't need an account — we'll contact you directly.
                      </p>
                    )}

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', background: '#fee2e2', borderRadius: 10, padding: '10px 14px', margin: 0 }}>
                          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />{error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button type="submit" disabled={submitting}
                      whileHover={{ background: 'var(--teal)' }} whileTap={{ scale: 0.98 }}
                      style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '15px', borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textTransform: 'uppercase', transition: 'background 0.2s', opacity: submitting ? 0.7 : 1 }}>
                      {submitting
                        ? <><i className="fa-solid fa-spinner fa-spin" /> Sending…</>
                        : <><i className="fa-solid fa-paper-plane" /> Request Agent Assistance</>}
                    </motion.button>
                  </form>
                </>
              ) : (
                /* Success state */
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: 'center', padding: '32px 16px 16px' }}>
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                    style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <i className="fa-solid fa-check" style={{ color: 'white', fontSize: 30 }} />
                  </motion.div>

                  <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 900, color: 'var(--heading)', marginBottom: 10 }}>
                    Request Received!
                  </h2>
                  <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.7, marginBottom: 28, maxWidth: 340, margin: '0 auto 28px' }}>
                    One of our agents will contact <strong>{name}</strong> at <strong>{phone}</strong> within 24 hours.
                  </p>

                  <div style={{ background: 'var(--off-white)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <i className="fa-solid fa-headset" style={{ color: 'var(--teal)', fontSize: 13 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--heading)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What happens next</span>
                    </div>
                    {[
                      'Your request is in our queue',
                      'An agent will be assigned to you',
                      'They\'ll reach out on your phone number',
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--teal)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{s}</span>
                      </div>
                    ))}
                  </div>

                  <motion.button onClick={handleClose}
                    whileHover={{ background: 'var(--teal)' }} whileTap={{ scale: 0.97 }}
                    style={{ width: '100%', background: 'var(--navy)', color: 'white', border: 'none', padding: '14px', borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
                    Back to Shopping
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
