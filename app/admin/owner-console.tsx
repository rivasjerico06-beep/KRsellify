'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  SiteNavConfig, DEFAULT_NAV_CONFIG, normalizeNavConfig,
  SiteFooterConfig, DEFAULT_FOOTER_CONFIG, normalizeFooterConfig,
  SiteCategoriesConfig, DEFAULT_CATEGORIES_CONFIG, normalizeCategoriesConfig,
  SiteIdentityConfig, DEFAULT_IDENTITY_CONFIG, normalizeIdentityConfig,
  SitePaymentsConfig, DEFAULT_PAYMENTS_CONFIG, normalizePaymentsConfig,
  SiteLink, SiteSocial, SiteNavItem, SiteCategory,
} from '@/lib/owner-config'

/**
 * OWNER CONSOLE
 * -------------
 * Editors for the storefront content that used to be hardcoded: header nav,
 * footer columns, socials, category cards, browser title, the free-shipping
 * threshold and the payments switch.
 *
 * Rendered only for the owner, and every key here is additionally owner-gated
 * in /api/admin/site-config — hiding a form stops nobody who posts to the
 * route directly.
 *
 * Each section saves on its own so a half-finished edit in one place can't
 * overwrite another, and each reloads through the same normalizer the
 * storefront uses, so what's previewed here is what customers get.
 */

const CARD: React.CSSProperties = {
  background: 'var(--white)', borderRadius: 14, border: '1px solid var(--gray)',
  padding: '26px 30px', marginBottom: 20,
}
const INPUT: React.CSSProperties = {
  width: '100%', border: '2px solid var(--gray)', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: 'var(--white)', color: 'var(--text-dark)',
}
const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-mid)',
  textTransform: 'uppercase', letterSpacing: '0.07em',
  display: 'block', marginBottom: 5,
}
const SMALL_BTN: React.CSSProperties = {
  background: 'var(--gray)', color: 'var(--text-mid)', border: 'none',
  borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
}

function Section({
  icon, title, hint, children, onSave, saving,
}: {
  icon: string; title: string; hint: string
  children: React.ReactNode
  onSave: () => void; saving: boolean
}) {
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <i className={`fa-solid ${icon}`} style={{ color: 'var(--teal)', fontSize: 16 }} />
        <h3 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--heading)', margin: 0 }}>{title}</h3>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 18, lineHeight: 1.6 }}>{hint}</p>
      {children}
      <button onClick={onSave} disabled={saving}
        style={{ marginTop: 18, background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, padding: '11px 20px', fontSize: 13.5, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

/** Add / remove / reorder rows of any shape, with the row's fields supplied by the caller. */
function ListEditor<T>({
  rows, onChange, blank, render, addLabel,
}: {
  rows: T[]
  onChange: (rows: T[]) => void
  blank: () => T
  render: (row: T, set: (patch: Partial<T>) => void) => React.ReactNode
  addLabel: string
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--off-white)', border: '1px solid var(--gray)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {render(row, patch => {
              const next = [...rows]
              next[i] = { ...row, ...patch }
              onChange(next)
            })}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up"
              style={{ ...SMALL_BTN, padding: '8px 10px', opacity: i === 0 ? 0.4 : 1, cursor: i === 0 ? 'not-allowed' : 'pointer' }}>
              <i className="fa-solid fa-chevron-up" />
            </button>
            <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} title="Move down"
              style={{ ...SMALL_BTN, padding: '8px 10px', opacity: i === rows.length - 1 ? 0.4 : 1, cursor: i === rows.length - 1 ? 'not-allowed' : 'pointer' }}>
              <i className="fa-solid fa-chevron-down" />
            </button>
            <button onClick={() => onChange(rows.filter((_, k) => k !== i))} title="Remove"
              style={{ ...SMALL_BTN, background: '#fee2e2', color: '#991b1b', padding: '8px 10px' }}>
              <i className="fa-solid fa-trash" />
            </button>
          </div>
        </div>
      ))}
      <button onClick={() => onChange([...rows, blank()])} style={{ ...SMALL_BTN, alignSelf: 'flex-start' }}>
        <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />{addLabel}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, width }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; width?: number | string
}) {
  return (
    <div style={{ flex: width ? undefined : 1, width, minWidth: 120 }}>
      <label style={LABEL}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={INPUT} />
    </div>
  )
}

export default function OwnerConsole({ authHeaders }: { authHeaders: () => HeadersInit }) {
  const [nav, setNav]           = useState<SiteNavConfig>(DEFAULT_NAV_CONFIG)
  const [footer, setFooter]     = useState<SiteFooterConfig>(DEFAULT_FOOTER_CONFIG)
  const [cats, setCats]         = useState<SiteCategoriesConfig>(DEFAULT_CATEGORIES_CONFIG)
  const [identity, setIdentity] = useState<SiteIdentityConfig>(DEFAULT_IDENTITY_CONFIG)
  const [payments, setPayments] = useState<SitePaymentsConfig>(DEFAULT_PAYMENTS_CONFIG)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [msg, setMsg]         = useState('')

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows: { key: string; value: unknown }[] =
        await fetch('/api/admin/site-config', { headers: authHeaders() }).then(r => r.json())
      const find = (k: string) => (Array.isArray(rows) ? rows.find(r => r.key === k)?.value : undefined)
      // Same normalizers the storefront uses, so this shows what customers see
      setNav(normalizeNavConfig(find('nav_config')))
      setFooter(normalizeFooterConfig(find('footer_config')))
      setCats(normalizeCategoriesConfig(find('categories_config')))
      setIdentity(normalizeIdentityConfig(find('site_identity')))
      setPayments(normalizePaymentsConfig(find('payments_config')))
    } catch {
      flash('Could not load settings')
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  async function save(key: string, value: unknown, label: string) {
    setSaving(key)
    try {
      const r = await fetch('/api/admin/site-config', {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ key, value }),
      })
      const d = await r.json().catch(() => ({}))
      flash(r.ok ? `✓ ${label} saved` : (d.error ?? `Failed to save ${label}`))
    } catch {
      flash('Could not reach the server')
    }
    setSaving(null)
  }

  if (loading) {
    return <p style={{ fontSize: 14, color: 'var(--text-light)' }}>Loading settings…</p>
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 900, color: 'var(--heading)', margin: '0 0 6px' }}>
          Owner Console
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-light)', margin: 0, lineHeight: 1.6 }}>
          Storefront content that used to need a code change. Edits are live on the
          next page load — no redeploy. Only you can see or save these.
        </p>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('✓') ? '#dcfce7' : '#fee2e2', color: msg.startsWith('✓') ? '#15803d' : '#991b1b', borderRadius: 10, padding: '11px 16px', fontSize: 13.5, fontWeight: 600, marginBottom: 18 }}>
          {msg}
        </div>
      )}

      {/* ── Site identity ── */}
      <Section icon="fa-globe" title="Site Identity" saving={saving === 'site_identity'}
        hint="Browser tab title, the description search engines show, and the free-shipping threshold used across the site."
        onSave={() => save('site_identity', identity, 'Site identity')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Browser title" value={identity.title} onChange={v => setIdentity({ ...identity, title: v })} />
          <div>
            <label style={LABEL}>Meta description</label>
            <textarea value={identity.description} rows={2}
              onChange={e => setIdentity({ ...identity, description: e.target.value })}
              style={{ ...INPUT, resize: 'vertical' }} />
          </div>
          <Field label="Free shipping threshold" value={identity.freeShippingText} width={180}
            placeholder="$399"
            onChange={v => setIdentity({ ...identity, freeShippingText: v })} />
          <p style={{ fontSize: 12, color: 'var(--text-light)', margin: 0, lineHeight: 1.6 }}>
            Used on the product page and as the trust-bar fallback. This was written in
            three separate places and had drifted — one said <strong>$399+</strong> while
            others said <strong>over $75</strong>, both showing at once.
          </p>
        </div>
      </Section>

      {/* ── Payments ── */}
      <Section icon="fa-credit-card" title="Payments" saving={saving === 'payments_config'}
        hint="Turns the PayPal button at checkout and the card button on VIP into an “under maintenance” notice. Bank transfer and pay links are unaffected."
        onSave={() => save('payments_config', payments, 'Payments setting')}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={payments.maintenance}
            onChange={e => setPayments({ maintenance: e.target.checked })}
            style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2 }} />
          <span>
            <span style={{ fontSize: 14, fontWeight: 700, color: payments.maintenance ? '#b45309' : 'var(--text-dark)', display: 'block' }}>
              Card &amp; PayPal payments under maintenance
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
              {payments.maintenance
                ? 'Customers currently cannot pay by card or PayPal.'
                : 'Card and PayPal buttons are live.'}
            </span>
          </span>
        </label>
      </Section>

      {/* ── Header nav ── */}
      <Section icon="fa-bars" title="Header Navigation" saving={saving === 'nav_config'}
        hint="The category strip under the header on the homepage. Each item filters the products in place; “all” shows everything."
        onSave={() => save('nav_config', nav, 'Header navigation')}>
        <ListEditor<SiteNavItem>
          rows={nav.links}
          onChange={links => setNav({ links })}
          blank={() => ({ label: '', cat: '' })}
          addLabel="Add nav item"
          render={(row, set) => (<>
            <Field label="Label" value={row.label} onChange={v => set({ label: v })} placeholder="Medallions" />
            <Field label="Category slug" value={row.cat} onChange={v => set({ cat: v })} placeholder="medallions" />
          </>)}
        />
      </Section>

      {/* ── Category cards ── */}
      <Section icon="fa-shapes" title="Category Cards" saving={saving === 'categories_config'}
        hint="The “Shop by Category” tiles on the homepage. Icons are Font Awesome names; tick Brand for logo glyphs like fa-bitcoin."
        onSave={() => save('categories_config', cats, 'Category cards')}>
        <ListEditor<SiteCategory>
          rows={cats.items}
          onChange={items => setCats({ items })}
          blank={() => ({ name: '', cat: '', icon: 'fa-tag', brand: false, gradient: 'linear-gradient(135deg, #0a1e33, #093459)' })}
          addLabel="Add category"
          render={(row, set) => (<>
            <Field label="Name" value={row.name} onChange={v => set({ name: v })} placeholder="Medallions" />
            <Field label="Slug" value={row.cat} onChange={v => set({ cat: v })} placeholder="medallions" />
            <Field label="Icon" value={row.icon} onChange={v => set({ icon: v })} placeholder="fa-medal" />
            <Field label="Gradient (CSS)" value={row.gradient} onChange={v => set({ gradient: v })} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', alignSelf: 'flex-end', paddingBottom: 10 }}>
              <input type="checkbox" checked={row.brand} onChange={e => set({ brand: e.target.checked })} style={{ cursor: 'pointer' }} />
              Brand icon
            </label>
          </>)}
        />
      </Section>

      {/* ── Footer ── */}
      <Section icon="fa-shoe-prints" title="Footer" saving={saving === 'footer_config'}
        hint="Everything in the footer: the blurb under the logo, all three link columns, social icons, card badges and the copyright line."
        onSave={() => save('footer_config', footer, 'Footer')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={LABEL}>Blurb under the logo</label>
            <textarea value={footer.blurb} rows={2}
              onChange={e => setFooter({ ...footer, blurb: e.target.value })}
              style={{ ...INPUT, resize: 'vertical' }} />
          </div>

          {([
            ['shop', 'Shop column'],
            ['support', 'Support column'],
            ['company', 'Company column'],
          ] as const).map(([key, title]) => (
            <div key={key}>
              <label style={{ ...LABEL, marginBottom: 8 }}>{title}</label>
              <ListEditor<SiteLink>
                rows={footer[key]}
                onChange={v => setFooter({ ...footer, [key]: v })}
                blank={() => ({ label: '', href: '' })}
                addLabel="Add link"
                render={(row, set) => (<>
                  <Field label="Label" value={row.label} onChange={v => set({ label: v })} placeholder="FAQ" />
                  <Field label="Link" value={row.href} onChange={v => set({ href: v })} placeholder="/faq" />
                </>)}
              />
            </div>
          ))}

          <div>
            <label style={{ ...LABEL, marginBottom: 8 }}>Social icons</label>
            <ListEditor<SiteSocial>
              rows={footer.socials}
              onChange={socials => setFooter({ ...footer, socials })}
              blank={() => ({ icon: '', href: '' })}
              addLabel="Add social"
              render={(row, set) => (<>
                <Field label="Brand icon" value={row.icon} onChange={v => set({ icon: v })} placeholder="fa-instagram" />
                <Field label="URL" value={row.href} onChange={v => set({ href: v })} placeholder="https://instagram.com/…" />
              </>)}
            />
          </div>

          <div>
            <label style={LABEL}>Card badges (comma separated)</label>
            <input
              value={footer.paymentBadges.join(', ')}
              onChange={e => setFooter({ ...footer, paymentBadges: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="VISA, MC, AMEX, PayPal"
              style={INPUT} />
          </div>

          <Field label="Copyright line" value={footer.copyright}
            onChange={v => setFooter({ ...footer, copyright: v })} />
        </div>
      </Section>
    </div>
  )
}
