import InfoPageLayout from '@/components/InfoPageLayout'

export const metadata = { title: 'About Us — KRSELLIFY' }

export default function AboutPage() {
  return (
    <InfoPageLayout title="About KRSELLIFY" subtitle="Premium collectibles, verified and shipped with care." breadcrumb="About">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <section style={{ background: 'white', borderRadius: 16, padding: '32px 36px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 900, color: 'var(--navy)', marginBottom: 16 }}>Our Story</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-mid)', marginBottom: 14 }}>
            KRSELLIFY was founded with one mission: to make premium collectibles and limited-edition memorabilia accessible to enthusiasts everywhere. What started as a passion for rare finds grew into a trusted marketplace for collectors, investors, and gift buyers worldwide.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-mid)' }}>
            Every item we carry is hand-picked, authenticated, and quality-checked before it reaches your door. We partner exclusively with verified suppliers to ensure you receive exactly what you pay for — no counterfeits, no surprises.
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: 'fa-shield-check', title: '100% Authentic', body: 'Every product is verified and authenticated before listing.' },
            { icon: 'fa-truck-fast',   title: 'Fast Shipping',  body: 'Orders ship within 1–2 business days to locations worldwide.' },
            { icon: 'fa-headset',      title: 'Personal Support', body: 'Dedicated agents available to guide your purchase.' },
            { icon: 'fa-star',         title: '4.9 Star Rating', body: 'Trusted by 2,400+ happy collectors.' },
          ].map(c => (
            <div key={c.icon} style={{ background: 'white', borderRadius: 16, padding: '24px 20px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(88,148,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <i className={`fa-solid ${c.icon}`} style={{ color: 'var(--teal)', fontSize: 20 }} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 6 }}>{c.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{c.body}</p>
            </div>
          ))}
        </div>

        <section style={{ background: 'white', borderRadius: 16, padding: '32px 36px', boxShadow: '0 2px 12px rgba(9,52,89,0.06)' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 900, color: 'var(--navy)', marginBottom: 16 }}>What We Carry</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-mid)' }}>
            Our catalog includes gold and silver commemorative bars, crypto-themed collectibles, limited-edition medallions, branded apparel, and exclusive accessories. We update our inventory regularly with new drops — sign up for our newsletter to get notified first.
          </p>
        </section>
      </div>
    </InfoPageLayout>
  )
}
