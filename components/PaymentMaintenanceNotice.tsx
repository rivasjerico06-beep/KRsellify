'use client'

/**
 * Shown in place of a payment button while payments are temporarily disabled.
 * See lib/payments-maintenance.ts for the toggle.
 */
export default function PaymentMaintenanceNotice() {
  return (
    <div
      role="status"
      style={{
        textAlign: 'center',
        padding: '22px 20px',
        background: 'var(--off-white)',
        border: '1px solid var(--gray)',
        borderRadius: 10,
        marginBottom: 4,
      }}
    >
      <i
        className="fa-solid fa-screwdriver-wrench"
        style={{ fontSize: 22, color: 'var(--gold, #CA8A04)', marginBottom: 10, display: 'block' }}
      />
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }}>
        Payments are temporarily under maintenance
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.6 }}>
        We&apos;re making some improvements to checkout. Please check back soon —
        your cart will be saved.
      </p>
    </div>
  )
}
