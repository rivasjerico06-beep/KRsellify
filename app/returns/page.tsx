import InfoPageLayout from '@/components/InfoPageLayout'
import Link from 'next/link'

export const metadata = { title: 'Returns & Exchanges — KRSELLIFY' }

export default function ReturnsPage() {
  return (
    <InfoPageLayout title="Returns & Exchanges" subtitle="30-day returns on eligible items. No hassle, no questions asked." breadcrumb="Returns">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section style={{ background: 'white', borderRadius: 16, padding: '28px 32px', boxShadow: '0 2px 10px rgba(9,52,89,0.06)' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 16 }}>Return Policy</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Return window',  value: '30 days from date of delivery' },
              { label: 'Item condition', value: 'Unopened, original packaging, unaltered' },
              { label: 'Refund method',  value: 'Original payment method within 5–10 business days' },
              { label: 'Exchanges',      value: 'Free exchange for same or equal-value item' },
              { label: 'Return shipping', value: 'Customer covers return shipping cost; we cover exchanges' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', gap: 16, paddingBottom: 14, borderBottom: '1px solid var(--gray)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', minWidth: 160 }}>{r.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: 'white', borderRadius: 16, padding: '28px 32px', boxShadow: '0 2px 10px rgba(9,52,89,0.06)' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 16 }}>How to Return</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { step: '1', title: 'Contact us',       body: 'Email support@krsellify.com with your order number and reason for return.' },
              { step: '2', title: 'Get approval',     body: 'We\'ll review and send a return confirmation within 1–2 business days.' },
              { step: '3', title: 'Ship the item',    body: 'Pack securely in original packaging and ship to the address we provide.' },
              { step: '4', title: 'Receive refund',   body: 'Once received and inspected, your refund or exchange is processed immediately.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--teal)', color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.step}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 3 }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#fff5f5', borderRadius: 16, padding: '24px 32px', border: '1px solid #fecaca' }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, color: '#dc2626', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-circle-exclamation" /> Non-Returnable Items
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Items showing signs of use, wear, or tampering', 'Items without original packaging', 'Sale items marked "Final Sale"', 'Customised or personalised products'].map(t => (
              <li key={t} style={{ fontSize: 13, color: '#7f1d1d', display: 'flex', gap: 8 }}>
                <i className="fa-solid fa-xmark" style={{ marginTop: 2 }} />{t}
              </li>
            ))}
          </ul>
        </section>

        <p style={{ fontSize: 14, color: 'var(--text-mid)', textAlign: 'center' }}>
          Have a question? <Link href="/contact" style={{ color: 'var(--teal)', fontWeight: 700 }}>Contact us</Link> or check our <Link href="/faq" style={{ color: 'var(--teal)', fontWeight: 700 }}>FAQ</Link>.
        </p>
      </div>
    </InfoPageLayout>
  )
}
