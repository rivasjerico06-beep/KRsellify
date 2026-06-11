'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import type { CartItem } from '@/lib/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
  clientSecret: string
  finalTotal: number
  cart: CartItem[]
  email: string
  discountAmount: number
  couponCode: string
  couponDiscount: number
  authToken?: string
  onSuccess: (order: Record<string, unknown>) => void
  onError: (msg: string) => void
  placing: boolean
  setPlacing: (v: boolean) => void
}

function StripeForm({
  finalTotal,
  cart,
  email,
  discountAmount,
  couponCode,
  couponDiscount,
  authToken,
  onSuccess,
  onError,
  placing,
  setPlacing,
}: Omit<Props, 'clientSecret'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [stripeError, setStripeError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setPlacing(true)
    setStripeError(null)

    // Save pending data before redirect — needed for 3DS authentication flow
    try {
      localStorage.setItem('themaga_pending_stripe', JSON.stringify({
        cart, finalTotal, discountAmount,
        couponCode: couponDiscount > 0 ? couponCode : '',
        email, authToken: authToken ?? null,
      }))
    } catch {}

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-success`,
        payment_method_data: {
          billing_details: { email },
        },
      },
      redirect: 'if_required',
    })

    if (error) {
      setStripeError(error.message ?? 'Payment failed. Please try again.')
      setPlacing(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      try { localStorage.removeItem('themaga_pending_stripe') } catch {}
      try {
        const res = await fetch('/api/stripe/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            items: cart,
            total: finalTotal,
            discount_amount: discountAmount,
            coupon_code: couponDiscount > 0 ? couponCode : undefined,
            guest_email: email,
          }),
        })
        const order = await res.json()
        if (!res.ok) {
          onError(order.error ?? 'Failed to confirm order.')
          setPlacing(false)
          return
        }
        onSuccess(order)
      } catch {
        onError('Network error. Please try again.')
        setPlacing(false)
      }
    } else if (paymentIntent) {
      setStripeError(`Payment status: ${paymentIntent.status}. Please try again or use a different card.`)
      setPlacing(false)
    } else {
      setStripeError('Payment did not complete. Please try again.')
      setPlacing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Card brand icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Accepted cards</span>
        {['VISA', 'MC', 'AMEX', 'DISC'].map(brand => (
          <span key={brand} style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#374151',
            background: '#f3f4f6',
            border: '1.5px solid #e5e7eb',
            borderRadius: 5,
            padding: '3px 7px',
            letterSpacing: '0.02em',
          }}>{brand}</span>
        ))}
      </div>

      {/* Stripe Elements — the actual card input */}
      <div style={{
        border: '2px solid #e5e7eb',
        borderRadius: 10,
        padding: '18px 16px',
        background: '#ffffff',
        marginBottom: 4,
      }}>
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: { billingDetails: { email: 'never' } },
          }}
        />
      </div>

      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#9ca3af"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
        Your card info is encrypted and never stored on our servers.
      </p>

      {stripeError && (
        <div style={{
          color: '#dc2626',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 14,
          padding: '12px 14px',
          background: '#fef2f2',
          borderRadius: 8,
          border: '1.5px solid #fca5a5',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          lineHeight: 1.5,
        }}>
          <i className="fa-solid fa-circle-xmark" style={{ marginTop: 2, flexShrink: 0 }} />
          {stripeError}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || placing}
        style={{
          width: '100%',
          background: (!stripe || !elements || placing) ? '#9ca3af' : '#635BFF',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '16px 24px',
          fontSize: 17,
          fontWeight: 700,
          cursor: (!stripe || !elements || placing) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          transition: 'background 0.2s',
          boxShadow: (!stripe || !elements || placing) ? 'none' : '0 4px 14px rgba(99,91,255,0.35)',
        }}
      >
        {placing ? (
          <>
            <i className="fa-solid fa-spinner fa-spin" />
            Processing payment…
          </>
        ) : (
          <>
            <i className="fa-solid fa-lock" style={{ fontSize: 15 }} />
            Pay ${finalTotal.toFixed(2)} securely
          </>
        )}
      </button>

      {/* Powered by Stripe */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>Powered by</span>
        <svg width="40" height="16" viewBox="0 0 60 25" fill="#9ca3af">
          <path d="M59.64 14.28h-8.06v-1.44c0-.69.56-1.01 1.38-1.01.82 0 1.97.25 2.93.78V8.5c-.97-.39-1.94-.54-2.93-.54-2.4 0-4 1.27-4 3.38v.94h-1.62v4.01h1.62V25h4.62v-8.71h2.7l.36-1.01zm-15.08 0v-.94c0-.69.56-1.01 1.38-1.01.82 0 1.97.25 2.93.78V8.5c-.97-.39-1.94-.54-2.93-.54-2.4 0-4 1.27-4 3.38v.94h-1.62v4.01h1.62V25h4.62v-8.71h2.7l.36-1.01h-3.06zm-5.99 0H34.5V8.28h-4.62v5.99h-1.62v4.01h1.62V25h4.62v-6.72h4.07v-4.01zm-13.14 0h-4.62V6.38L16.2 7.8v6.48h-1.62v4.01h1.62V24c0 .83.67 1 1.67 1h3.56v-3.72h-1.62v-2.99h1.62v-4.01zm-9.25 5.6c0 2.44-1.66 3.99-4.1 3.99-1.14 0-2.04-.26-2.66-.67V25h-4.62V8.28h4.62v.56c.62-.41 1.52-.67 2.66-.67 2.44 0 4.1 1.55 4.1 3.99v7.72zm-4.62-6.76c-.52 0-.95.18-1.24.48v5.84c.29.3.72.48 1.24.48.88 0 1.38-.57 1.38-1.44v-3.92c0-.87-.5-1.44-1.38-1.44z"/>
        </svg>
      </div>
    </form>
  )
}

export default function StripeCheckoutForm(props: Props) {
  const { clientSecret, ...rest } = props
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'flat',
          variables: {
            colorPrimary: '#635BFF',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorTextPlaceholder: '#9ca3af',
            colorDanger: '#dc2626',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSizeBase: '15px',
            borderRadius: '8px',
            spacingUnit: '4px',
          },
          rules: {
            '.Input': {
              border: '2px solid #e5e7eb',
              padding: '12px 14px',
              fontSize: '15px',
              color: '#1f2937',
            },
            '.Input:focus': {
              border: '2px solid #635BFF',
              boxShadow: '0 0 0 3px rgba(99,91,255,0.15)',
            },
            '.Label': {
              fontSize: '13px',
              fontWeight: '700',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            },
            '.Tab': {
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
            },
            '.Tab--selected': {
              border: '2px solid #635BFF',
              color: '#635BFF',
            },
          },
        },
      }}
    >
      <StripeForm {...rest} />
    </Elements>
  )
}
