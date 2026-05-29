import InfoPageLayout from '@/components/InfoPageLayout'

export const metadata = { title: 'Shipping Info — KRSELLIFY' }

export default function ShippingPage() {
  return (
    <InfoPageLayout title="Shipping Information" subtitle="Fast, tracked, and fully insured delivery worldwide." breadcrumb="Shipping">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section style={{ background: 'var(--white)', borderRadius: 16, padding: '28px 32px', boxShadow: '0 2px 10px rgba(9,52,89,0.06)' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 800, color: 'var(--heading)', marginBottom: 18 }}>Delivery Times</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray)' }}>
                {['Region', 'Standard', 'Express', 'Free Shipping'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-light)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['United States',   '3–5 business days',   '1–2 business days', 'Orders over $75'],
                ['Canada',          '5–8 business days',   '3–5 business days', 'Orders over $100'],
                ['Europe',          '7–14 business days',  '4–7 business days', 'Orders over $150'],
                ['Asia Pacific',    '10–18 business days', '5–8 business days', 'Orders over $150'],
                ['Rest of World',   '14–21 business days', '7–14 business days','Not available'],
              ].map(([region, std, exp, free], i) => (
                <tr key={region} style={{ borderBottom: '1px solid var(--gray)', background: i % 2 === 0 ? 'transparent' : 'rgba(244,248,248,0.5)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--heading)' }}>{region}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-mid)' }}>{std}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-mid)' }}>{exp}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--teal)', fontWeight: 600 }}>{free}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { icon: 'fa-box',         title: 'Order Processing',   body: 'Orders are processed within 1–2 business days of payment confirmation.' },
            { icon: 'fa-truck',       title: 'Tracked Shipping',   body: 'All orders include tracking. You\'ll receive a tracking link by email.' },
            { icon: 'fa-shield',      title: 'Fully Insured',      body: 'Every shipment is insured against loss or damage in transit.' },
            { icon: 'fa-gift',        title: 'Gift Packaging',     body: 'Premium gift boxing available — add a note at checkout.' },
          ].map(c => (
            <div key={c.icon} style={{ background: 'var(--white)', borderRadius: 14, padding: '22px 20px', boxShadow: '0 2px 10px rgba(9,52,89,0.06)' }}>
              <i className={`fa-solid ${c.icon}`} style={{ color: 'var(--teal)', fontSize: 20, marginBottom: 12, display: 'block' }} />
              <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--heading)', marginBottom: 6 }}>{c.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{c.body}</p>
            </div>
          ))}
        </div>

        <section style={{ background: 'var(--white)', borderRadius: 16, padding: '28px 32px', boxShadow: '0 2px 10px rgba(9,52,89,0.06)' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 800, color: 'var(--heading)', marginBottom: 14 }}>Important Notes</h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Delivery times begin from the date of shipment, not order placement.',
              'International orders may be subject to customs duties and import taxes — these are the buyer\'s responsibility.',
              'We are not responsible for delays caused by customs clearance or local postal services.',
              'PO Boxes are not accepted for express shipping.',
            ].map(t => (
              <li key={t} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--teal)', marginTop: 2, flexShrink: 0 }} />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </InfoPageLayout>
  )
}
