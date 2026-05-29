'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import InfoPageLayout from '@/components/InfoPageLayout'

const FAQS = [
  {
    q: 'Are your products authentic?',
    a: 'Yes. Every item is sourced from verified suppliers and authenticated before listing. We do not sell replicas or counterfeits.',
  },
  {
    q: 'How long does shipping take?',
    a: 'Standard orders ship within 1–2 business days and arrive in 3–7 business days domestically. International shipping may take 7–21 business days depending on location.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'Yes, we ship worldwide. Shipping costs and delivery times vary by destination. You\'ll see the estimated shipping cost at checkout.',
  },
  {
    q: 'What is your return policy?',
    a: 'We accept returns within 30 days of delivery for items in original, unopened condition. Contact us at support@krsellify.com to initiate a return.',
  },
  {
    q: 'How do I track my order?',
    a: 'Once your order ships, you\'ll receive a confirmation email with tracking information. You can also check your order status in your Account page.',
  },
  {
    q: 'Can I cancel or modify my order?',
    a: 'Orders can be cancelled or modified within 2 hours of placement. After that, we may have already started processing. Contact us immediately at support@krsellify.com.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Yes. All transactions are secured with 256-bit SSL encryption. We do not store your payment details.',
  },
  {
    q: 'Do you offer discounts or coupon codes?',
    a: 'Yes! Use code KRSELLIFY10 for 10% off your first order. Loyal customers automatically receive tier-based coupons (Silver, Gold, Platinum) as they spend more.',
  },
  {
    q: 'What is the Agent program?',
    a: 'Our Agent program lets approved members earn referral commissions by helping customers place orders. Apply through your Account page or click "Need an Agent?" on any page.',
  },
  {
    q: 'My order arrived damaged. What do I do?',
    a: 'We\'re sorry to hear that. Please take photos and contact us within 48 hours at support@krsellify.com. We\'ll send a replacement or issue a full refund.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(9,52,89,0.06)' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.4 }}>{q}</span>
        <motion.i animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}
          className="fa-solid fa-plus" style={{ color: 'var(--teal)', fontSize: 14, flexShrink: 0 }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}>
            <p style={{ padding: '0 22px 18px', fontSize: 14, lineHeight: 1.75, color: 'var(--text-mid)', borderTop: '1px solid var(--gray)', paddingTop: 14, marginTop: 0 }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FaqPage() {
  return (
    <InfoPageLayout title="Frequently Asked Questions" subtitle="Can't find what you're looking for? Email us at support@krsellify.com" breadcrumb="FAQ">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
      </div>
    </InfoPageLayout>
  )
}
