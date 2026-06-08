import Link from 'next/link'

export default function VipBanner() {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #0f2441 0%, #1a3a5c 50%, #0f2441 100%)',
      padding: '10px 20px',
      textAlign: 'center',
      borderBottom: '1px solid rgba(77,217,184,0.25)',
      position: 'relative',
      zIndex: 50,
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
        <i className="fa-solid fa-crown" style={{ color: '#fbbf24', marginRight: 8, fontSize: 12 }} />
        VIP Members get{' '}
        <strong style={{ color: '#4dd9b8' }}>30% off every order</strong>
        {' '}— just $20/month{'  '}
        <Link href="/vip" style={{ color: '#4dd9b8', fontWeight: 800, marginLeft: 8, textDecoration: 'underline', fontSize: 13 }}>
          Join VIP →
        </Link>
      </span>
    </div>
  )
}
