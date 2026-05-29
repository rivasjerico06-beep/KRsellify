import InfoPageLayout from '@/components/InfoPageLayout'

export const metadata = { title: 'Terms of Service — KRSELLIFY' }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ background: 'var(--white)', borderRadius: 16, padding: '28px 32px', boxShadow: '0 2px 10px rgba(9,52,89,0.06)' }}>
    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 19, fontWeight: 800, color: 'var(--heading)', marginBottom: 14 }}>{title}</h2>
    <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-mid)' }}>{children}</div>
  </section>
)

export default function TermsPage() {
  return (
    <InfoPageLayout title="Terms of Service" subtitle="Last updated: January 2025" breadcrumb="Terms of Service">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Section title="Acceptance of Terms">
          <p>By accessing or using KRSELLIFY, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our site.</p>
        </Section>

        <Section title="Products & Pricing">
          <p style={{ marginBottom: 10 }}>All products listed on KRSELLIFY are subject to availability. We reserve the right to:</p>
          <ul style={{ listStyle: 'disc', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Change prices without prior notice</li>
            <li>Limit the quantity of products sold per customer</li>
            <li>Discontinue any product at any time</li>
            <li>Refuse any order at our sole discretion</li>
          </ul>
        </Section>

        <Section title="Orders & Payment">
          <p>By placing an order, you represent that you are authorised to use the payment method provided. Orders are not confirmed until payment is successfully processed. We reserve the right to cancel orders due to pricing errors, suspected fraud, or stock unavailability.</p>
        </Section>

        <Section title="Shipping & Delivery">
          <p>Estimated delivery times are not guaranteed. KRSELLIFY is not liable for delays caused by shipping carriers, customs, or events outside our control. Risk of loss passes to you upon delivery to the carrier.</p>
        </Section>

        <Section title="Returns & Refunds">
          <p>Our return policy is outlined separately on the <strong>Returns & Exchanges</strong> page. Refunds are processed to the original payment method only.</p>
        </Section>

        <Section title="Intellectual Property">
          <p>All content on this site — including logos, product images, text, and design — is the property of KRSELLIFY or its licensors. You may not reproduce, distribute, or create derivative works without our written permission.</p>
        </Section>

        <Section title="Limitation of Liability">
          <p>To the fullest extent permitted by law, KRSELLIFY is not liable for any indirect, incidental, or consequential damages arising from your use of our site or products. Our total liability shall not exceed the amount you paid for the item in question.</p>
        </Section>

        <Section title="Governing Law">
          <p>These terms are governed by applicable law. Any disputes shall be resolved through binding arbitration or, where arbitration is not available, in the courts of the applicable jurisdiction.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about these terms? Email <strong>support@krsellify.com</strong>.</p>
        </Section>
      </div>
    </InfoPageLayout>
  )
}
