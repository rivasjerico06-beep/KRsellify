import InfoPageLayout from '@/components/InfoPageLayout'

export const metadata = { title: 'Privacy Policy — PATRIOT’S ONLINE SHOP' }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ background: 'var(--white)', borderRadius: 16, padding: '28px 32px', boxShadow: '0 2px 10px rgba(9,52,89,0.06)' }}>
    <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 19, fontWeight: 800, color: 'var(--heading)', marginBottom: 14 }}>{title}</h2>
    <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-mid)' }}>{children}</div>
  </section>
)

export default function PrivacyPage() {
  return (
    <InfoPageLayout title="Privacy Policy" subtitle="Last updated: January 2025" breadcrumb="Privacy Policy">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Section title="Information We Collect">
          <p>When you use PATRIOT’S ONLINE SHOP, we collect information you provide directly: your name, email address, phone number, and shipping address when you place an order or create an account. We also collect usage data such as pages visited, products viewed, and search queries to improve your experience.</p>
        </Section>

        <Section title="How We Use Your Information">
          <ul style={{ listStyle: 'disc', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Process and fulfil your orders</li>
            <li>Send order confirmations and shipping updates</li>
            <li>Provide customer support</li>
            <li>Send promotional emails (you can unsubscribe at any time)</li>
            <li>Improve our products and services</li>
            <li>Prevent fraud and ensure account security</li>
          </ul>
        </Section>

        <Section title="Information Sharing">
          <p style={{ marginBottom: 10 }}>We do not sell your personal information. We share data only with:</p>
          <ul style={{ listStyle: 'disc', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Shipping providers</strong> — to deliver your orders</li>
            <li><strong>Payment processors</strong> — to process transactions securely</li>
            <li><strong>Email services</strong> — to send transactional and marketing emails</li>
            <li><strong>Analytics services</strong> — to understand site usage (anonymised)</li>
          </ul>
        </Section>

        <Section title="Data Security">
          <p>We use industry-standard security measures including 256-bit SSL encryption to protect your data in transit. Your password is hashed and never stored in plain text. We regularly review and update our security practices.</p>
        </Section>

        <Section title="Cookies">
          <p>We use essential cookies to maintain your session, remember your cart, and keep you logged in. We may also use analytics cookies to understand how visitors use our site. You can disable cookies in your browser settings, though some features may not work correctly.</p>
        </Section>

        <Section title="Your Rights">
          <p style={{ marginBottom: 10 }}>You have the right to:</p>
          <ul style={{ listStyle: 'disc', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Opt out of marketing communications at any time</li>
          </ul>
          <p style={{ marginTop: 10 }}>To exercise these rights, email us at <strong>themagaoffer@gmail.com</strong>.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy? Email us at <strong>themagaoffer@gmail.com</strong>. We aim to respond within 2 business days.</p>
        </Section>
      </div>
    </InfoPageLayout>
  )
}
