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

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-success`,
      },
      redirect: 'if_required',
    })

    if (error) {
      setStripeError(error.message ?? 'Payment failed. Please try again.')
      setPlacing(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
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
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {stripeError && (
        <div style={{
          color: '#dc2626',
          fontSize: 14,
          fontWeight: 600,
          marginTop: 12,
          padding: '10px 14px',
          background: '#fef2f2',
          borderRadius: 8,
          border: '1px solid #fca5a5',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <i className="fa-solid fa-circle-xmark" style={{ marginTop: 2, flexShrink: 0 }} />
          {stripeError}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || placing}
        style={{
          marginTop: 16,
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
        }}
      >
        {placing ? (
          <>
            <i className="fa-solid fa-spinner fa-spin" />
            Processing…
          </>
        ) : (
          `Pay $${finalTotal.toFixed(2)}`
        )}
      </button>
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
          theme: 'stripe',
          variables: {
            colorPrimary: '#0f172a',
            colorBackground: '#ffffff',
            borderRadius: '8px',
            fontSizeBase: '15px',
          },
        },
      }}
    >
      <StripeForm {...rest} />
    </Elements>
  )
}
