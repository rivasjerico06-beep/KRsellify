'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface OrderInfo {
  order_number: number | null
  total: number
  payment_method: string | null
  has_receipt: boolean
  status: string | null
}

export default function UploadReceiptPage() {
  const [orderId, setOrderId] = useState<string | null>(null)
  const [info, setInfo] = useState<OrderInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const id = sp.get('order') || sp.get('order_id')
    if (!id) { setLoading(false); setNotFound(true); return }
    setOrderId(id)
    fetch(`/api/orders/upload-receipt?order_id=${encodeURIComponent(id)}`)
      .then(async r => {
        if (!r.ok) { setNotFound(true); return }
        setInfo(await r.json())
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [])

  async function upload(file: File) {
    if (!orderId) return
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('order_id', orderId)
      fd.append('file', file)
      const res = await fetch('/api/orders/upload-receipt', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.ok) setDone(true)
      else setError(data.error ?? 'Upload failed. Please try again.')
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const reference = info?.order_number ?? (orderId ? orderId.slice(0, 8).toUpperCase() : '')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <Link href="/" style={{ marginBottom: 28 }}>
        <Image src="/logo.png" alt="Maga Offers" width={64} height={64} style={{ objectFit: 'contain' }} />
      </Link>

      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '36px 32px', maxWidth: 480, width: '100%', boxShadow: '0 8px 40px rgba(9,52,89,0.12)', textAlign: 'center' }}>
        {loading ? (
          <p style={{ color: 'var(--text-mid)' }}><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading…</p>
        ) : notFound ? (
          <>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fee2e2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: '#b91c1c', fontSize: 24 }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--heading)', marginBottom: 8 }}>Order not found</h1>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>
              This upload link looks invalid or expired. Please use the link from your bank-transfer email, or contact{' '}
              <a href="mailto:support@themagaoffers.net" style={{ color: 'var(--teal)', fontWeight: 700 }}>support@themagaoffers.net</a>.
            </p>
          </>
        ) : done ? (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), #059669)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <i className="fa-solid fa-check" style={{ color: 'white', fontSize: 28 }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--heading)', marginBottom: 8 }}>Receipt uploaded!</h1>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: 20 }}>
              Thank you. We&apos;ll verify your payment for order <strong>#{reference}</strong> and confirm it shortly.
            </p>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--navy)', color: 'white', padding: '12px 22px', borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              <i className="fa-solid fa-store" /> Continue Shopping
            </Link>
          </>
        ) : (
          <>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <i className="fa-solid fa-receipt" style={{ color: '#d97706', fontSize: 24 }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--heading)', marginBottom: 6 }}>Upload your transfer receipt</h1>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: 8 }}>
              Order <strong>#{reference}</strong>{info ? <> · <strong>${info.total.toFixed(2)}</strong></> : null}
            </p>
            {info?.has_receipt && (
              <p style={{ fontSize: 12.5, color: '#15803d', fontWeight: 700, marginBottom: 8 }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />A receipt is already on file — uploading again replaces it.
              </p>
            )}
            <p style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.6, marginBottom: 20 }}>
              Upload a screenshot or PDF of your bank transfer so we can confirm your order. (JPG / PNG / PDF, max 5MB.)
            </p>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
              style={{ background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 800, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`} /> {uploading ? 'Uploading…' : 'Choose file & upload'}
            </button>
            {error && <p style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, marginTop: 12 }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
