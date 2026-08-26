import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "We'll be back soon — PATRIOT’S ONLINE SHOP",
  description: "We're carrying out maintenance and will be back online shortly.",
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        gap: '1.25rem',
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(202,138,4,0.12), transparent 60%)',
        color: 'var(--text-dark, #0d1f2d)',
      }}
    >
      <div aria-hidden="true" style={{ fontSize: '3rem', lineHeight: 1 }}>
        🛠️
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-playfair, Georgia, serif)',
          fontWeight: 900,
          fontSize: 'clamp(1.75rem, 5vw, 3rem)',
          letterSpacing: '-0.01em',
          margin: 0,
        }}
      >
        We&rsquo;ll be back soon
      </h1>

      <p
        style={{
          fontSize: 'clamp(1rem, 2.2vw, 1.125rem)',
          maxWidth: '32rem',
          lineHeight: 1.7,
          color: 'var(--text-mid, #4a6170)',
          margin: 0,
        }}
      >
        PATRIOT&rsquo;S ONLINE SHOP is temporarily offline for maintenance.
        Thanks for your patience — please check back shortly.
      </p>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-light, #8ba0aa)', margin: 0 }}>
        Existing orders are unaffected. For anything urgent, email{' '}
        <a href="mailto:themagaoffer@gmail.com" style={{ color: 'var(--teal, #58948f)', fontWeight: 700 }}>
          themagaoffer@gmail.com
        </a>
        .
      </p>
    </main>
  )
}
