'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import {
  SupportMessage,
  SupportConversation,
  MAX_MESSAGE_LENGTH,
  isValidSupportEmail,
} from '@/lib/support'

/**
 * Live chat with support, mounted inside the "Talk to an Agent" drawer.
 *
 * The customer enters their email and that address is the thread — coming back
 * a week later, or on their phone instead of their laptop, reopens the same
 * conversation. The address is remembered locally so they only type it once.
 */

const EMAIL_STORAGE_KEY = 'krsellify_support_email'
const POLL_INTERVAL_MS = 5000

export default function SupportChat() {
  const { user } = useAuth()

  const [email, setEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [conversation, setConversation] = useState<SupportConversation | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [draft, setDraft] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const threadRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Remembered address, or the one they're already signed in with
  useEffect(() => {
    let stored: string | null = null
    try { stored = localStorage.getItem(EMAIL_STORAGE_KEY) } catch {}
    const prefill = stored ?? user?.email ?? ''
    if (prefill) setEmailInput(prefill)
    if (stored) void connect(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  useEffect(() => { if (messages.length) scrollToBottom() }, [messages.length, scrollToBottom])

  async function connect(withEmail: string) {
    setConnecting(true)
    setError('')
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: withEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not open the chat.')
        setConnecting(false)
        return
      }
      setConversation(data.conversation)
      setMessages(data.messages ?? [])
      setEmail(withEmail)
      try { localStorage.setItem(EMAIL_STORAGE_KEY, withEmail) } catch {}
    } catch {
      setError('Could not reach support. Check your connection and try again.')
    }
    setConnecting(false)
  }

  // Poll for replies while the thread is open
  useEffect(() => {
    if (!conversation || !email) return
    const id = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/support/messages?conversation_id=${encodeURIComponent(conversation.id)}&email=${encodeURIComponent(email)}`,
        )
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.messages)) {
          setMessages(prev =>
            data.messages.length === prev.length ? prev : data.messages,
          )
        }
      } catch {}
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [conversation, email])

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = emailInput.trim()
    if (!isValidSupportEmail(value)) { setError('Enter a valid email address.'); return }
    void connect(value)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !conversation || sending) return

    setSending(true)
    setError('')
    setDraft('')

    // Show it straight away — a chat that waits on the network feels broken
    const optimistic: SupportMessage = {
      id: `pending-${Date.now()}`,
      conversation_id: conversation.id,
      sender: 'customer',
      body,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversation.id, email, body }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setDraft(body)
        setError(data.error ?? 'Could not send.')
      } else {
        setMessages(prev => prev.map(m => (m.id === optimistic.id ? data.message : m)))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setDraft(body)
      setError('Could not send. Check your connection.')
    }
    setSending(false)
  }

  function switchEmail() {
    try { localStorage.removeItem(EMAIL_STORAGE_KEY) } catch {}
    setConversation(null)
    setMessages([])
    setEmail('')
    setEmailInput('')
    setError('')
  }

  // ── Email gate ────────────────────────────────────────────────
  if (!conversation) {
    return (
      <div>
        <div style={{ background: 'rgba(88,148,143,0.08)', border: '1px solid rgba(88,148,143,0.25)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--heading)', margin: '0 0 6px' }}>
            <i className="fa-solid fa-envelope" style={{ marginRight: 8, color: 'var(--teal)' }} />
            Enter your email to start
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 }}>
            We use it to keep your conversation. Come back any time with the same
            address and your full chat history will be here.
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Email address *
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="you@gmail.com"
              autoComplete="email"
              required
              style={{ width: '100%', border: '2px solid var(--gray)', borderRadius: 12, padding: '13px 16px', fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--gray)')}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12.5, color: '#b91c1c', margin: 0, fontWeight: 600 }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />
              {error}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={connecting}
            whileTap={{ scale: 0.98 }}
            style={{
              background: 'linear-gradient(135deg, var(--navy), #0e4a80)', color: 'white',
              border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 14.5,
              fontWeight: 800, cursor: connecting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: connecting ? 0.65 : 1,
            }}
          >
            {connecting ? 'Opening chat…' : 'Start chatting'}
          </motion.button>
        </form>
      </div>
    )
  }

  // ── Thread ────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--gray)' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dark)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <i className="fa-solid fa-circle" style={{ fontSize: 7, color: '#16a34a', marginRight: 7, verticalAlign: 'middle' }} />
            {email}
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--text-light)', margin: '3px 0 0' }}>
            Support usually replies within a few hours
          </p>
        </div>
        <button
          type="button"
          onClick={switchEmail}
          style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, padding: 0 }}
        >
          Not you?
        </button>
      </div>

      <div
        ref={threadRef}
        style={{
          minHeight: 240, maxHeight: '46vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10,
          padding: '4px 2px 12px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '46px 20px', color: 'var(--text-light)' }}>
            <i className="fa-regular fa-comments" style={{ fontSize: 34, marginBottom: 12, display: 'block', opacity: 0.5 }} />
            <p style={{ fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
              Send us a message and we&rsquo;ll get right back to you.
            </p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.sender === 'customer'
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '78%',
                    background: mine ? 'linear-gradient(135deg, var(--navy), #0e4a80)' : 'var(--off-white)',
                    color: mine ? 'white' : 'var(--text-dark)',
                    border: mine ? 'none' : '1px solid var(--gray)',
                    borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '10px 14px',
                    fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}
                >
                  {!mine && (
                    <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                      Support
                    </span>
                  )}
                  {m.body}
                  <span style={{ display: 'block', fontSize: 10, opacity: 0.6, marginTop: 5, textAlign: 'right' }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: '#b91c1c', margin: '0 0 10px', fontWeight: 600 }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />
          {error}
        </p>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            // Enter sends, Shift+Enter makes a new line
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(e) }
          }}
          placeholder="Type your message…"
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          style={{
            flex: 1, border: '2px solid var(--gray)', borderRadius: 12,
            padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
            outline: 'none', resize: 'none', maxHeight: 120, boxSizing: 'border-box',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--gray)')}
        />
        <motion.button
          type="submit"
          disabled={!draft.trim() || sending}
          whileTap={{ scale: 0.94 }}
          style={{
            background: draft.trim() ? 'linear-gradient(135deg, var(--navy), #0e4a80)' : 'var(--gray)',
            color: draft.trim() ? 'white' : 'var(--text-light)',
            border: 'none', borderRadius: 12, width: 46, height: 46,
            cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            fontSize: 15, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Send message"
        >
          <i className={sending ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'} />
        </motion.button>
      </form>
    </div>
  )
}
