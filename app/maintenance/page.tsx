import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "We'll be back soon — KRsellify",
  description: "We're fixing some issues and will be back online shortly.",
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
      <div
        aria-hidden="true"
        style={{
          fontSize: '3rem',
          lineHeight: 1,
        }}
      >
        🛠️
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-playfair, Georgia, serif)',
          fontWeight: 900,
          fontSize: 'clamp(1.75rem, 5vw, 3rem)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        We&rsquo;ll be back soon
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          color: 'var(--text-mid, #4a6170)',
          maxWidth: '32rem',
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        We&rsquo;re currently fixing some issues to make things better. Thanks
        for your patience &mdash; please check back in a little while.
      </p>

      <div
        style={{
          marginTop: '0.5rem',
          height: '3px',
          width: '96px',
          borderRadius: '999px',
          background:
            'linear-gradient(90deg, transparent, var(--gold, #CA8A04), transparent)',
        }}
      />
    </main>
  )
}
